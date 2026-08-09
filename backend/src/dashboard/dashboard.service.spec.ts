import { Test, TestingModule } from '@nestjs/testing';
import type { Title } from '@prisma/client';
import { TitlesRepository } from '../titles/titles.repository';
import { DashboardService, UP_NEXT_DEFAULT_LIMIT } from './dashboard.service';

const USER = 'neon-user-123';

function title(overrides: Partial<Title> = {}): Title {
  return {
    id: 'title-uuid',
    userId: USER,
    name: 'Dune: Part Two',
    type: 'movie',
    status: 'want_to_watch',
    genreId: 'genre-uuid',
    watchDate: null,
    rating: null,
    note: null,
    favorite: false,
    year: 2024,
    runtime: null,
    director: null,
    posterPath: '/dune.jpg',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('DashboardService', () => {
  const findMany = jest.fn();
  const findFirst = jest.fn();

  let dashboard: DashboardService;

  beforeEach(async () => {
    findMany.mockReset().mockResolvedValue([]);
    findFirst.mockReset().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: TitlesRepository, useValue: { findMany, findFirst } },
      ],
    }).compile();

    dashboard = module.get(DashboardService);
  });

  describe('up next (DSH-6, A11)', () => {
    it('asks for want-to-watch titles, newest added first', async () => {
      await dashboard.getUpNext(USER);

      expect(findMany).toHaveBeenCalledWith(USER, {
        where: { status: 'want_to_watch' },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: UP_NEXT_DEFAULT_LIMIT,
      });
    });

    it('asks for the seven cards the rail draws', () => {
      expect(UP_NEXT_DEFAULT_LIMIT).toBe(7);
    });

    it('honours a caller limit over the default', async () => {
      await dashboard.getUpNext(USER, 20);

      expect(findMany).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ take: 20 }),
      );
    });

    it('returns only what the rail caption renders', async () => {
      findMany.mockResolvedValue([title()]);

      await expect(dashboard.getUpNext(USER)).resolves.toEqual([
        {
          id: 'title-uuid',
          name: 'Dune: Part Two',
          year: 2024,
          type: 'movie',
          posterPath: '/dune.jpg',
        },
      ]);
    });

    // A17: no form captures year, so a hand-typed title has none and the rail has
    // to cope rather than the query filtering it out.
    it('passes a missing year through rather than dropping the title', async () => {
      findMany.mockResolvedValue([title({ year: null })]);

      const [card] = await dashboard.getUpNext(USER);

      expect(card.year).toBeNull();
      expect(card.name).toBe('Dune: Part Two');
    });

    it('returns an empty list, not an error, when nothing is queued', async () => {
      findMany.mockResolvedValue([]);

      await expect(dashboard.getUpNext(USER)).resolves.toEqual([]);
    });
  });

  describe('continue watching (DSH-1, A9)', () => {
    it('asks for the most recently updated watching title, with stable tie-breaks', async () => {
      await dashboard.getContinueWatching(USER);

      expect(findFirst).toHaveBeenCalledWith(USER, {
        where: { status: 'watching' },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        include: { genre: true },
      });
    });

    it('returns exactly one title, with the genre the hero meta line needs', async () => {
      findFirst.mockResolvedValue({
        ...title({
          name: 'Severance',
          type: 'series',
          status: 'watching',
          year: 2022,
        }),
        genre: { name: 'Sci-Fi' },
      });

      await expect(dashboard.getContinueWatching(USER)).resolves.toEqual({
        id: 'title-uuid',
        name: 'Severance',
        year: 2022,
        type: 'series',
        genre: 'Sci-Fi',
        posterPath: '/dune.jpg',
      });
    });

    // A9 makes season, episode and percent display-only with no form behind them,
    // so they must not appear here and invite the frontend to render them.
    it('carries no progress fields', async () => {
      findFirst.mockResolvedValue({
        ...title({ status: 'watching' }),
        genre: { name: 'Sci-Fi' },
      });

      const hero = await dashboard.getContinueWatching(USER);

      expect(hero).not.toHaveProperty('progress');
      expect(hero).not.toHaveProperty('season');
      expect(hero).not.toHaveProperty('episode');
    });

    it('returns null, not an error, when nothing is in progress', async () => {
      findFirst.mockResolvedValue(null);

      await expect(dashboard.getContinueWatching(USER)).resolves.toBeNull();
    });
  });

  describe('summary', () => {
    it('combines both halves for one dashboard request', async () => {
      findFirst.mockResolvedValue({
        ...title({ name: 'Severance', status: 'watching' }),
        genre: { name: 'Sci-Fi' },
      });
      findMany.mockResolvedValue([title()]);

      const summary = await dashboard.getSummary(USER);

      expect(summary.continueWatching?.name).toBe('Severance');
      expect(summary.upNext).toHaveLength(1);
    });

    it('reads as a fully empty dashboard for a brand new account', async () => {
      await expect(dashboard.getSummary(USER)).resolves.toEqual({
        continueWatching: null,
        upNext: [],
      });
    });
  });
});

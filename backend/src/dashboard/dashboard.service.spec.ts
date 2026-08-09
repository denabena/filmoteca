import { Test, TestingModule } from '@nestjs/testing';
import type { Title } from '@prisma/client';
import { PickerGateService } from '../picker/picker-gate.service';
import { TitlesRepository } from '../titles/titles.repository';
import { DashboardService, UP_NEXT_DEFAULT_LIMIT } from './dashboard.service';
import { parseMonth } from './month';

const USER = 'neon-user-123';
const OCTOBER = parseMonth('2026-10');
/** Mid-month, so "this week" is the third bar rather than an edge case. */
const IN_OCTOBER = new Date('2026-10-17T09:00:00Z');

/** A row as the stats query sees it: watched, dated, and joined to its genre. */
function watched(
  day: number,
  overrides: Partial<Title> & { genre?: string } = {},
) {
  const { genre = 'Drama', ...rest } = overrides;

  return {
    ...title({
      status: 'watched',
      watchDate: new Date(Date.UTC(2026, 9, day)),
      ...rest,
    }),
    genre: { name: genre },
  };
}

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
  const count = jest.fn();
  const getGateState = jest.fn();

  let dashboard: DashboardService;

  beforeEach(async () => {
    findMany.mockReset().mockResolvedValue([]);
    findFirst.mockReset().mockResolvedValue(null);
    count.mockReset().mockResolvedValue(0);
    getGateState
      .mockReset()
      .mockResolvedValue({ unlocked: false, ratedCount: 0, threshold: 3 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: TitlesRepository, useValue: { findMany, findFirst, count } },
        { provide: PickerGateService, useValue: { getState: getGateState } },
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

  describe('watched count and trend (DSH-3, FIL-30)', () => {
    it('counts only watched titles dated inside the month', async () => {
      await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(findMany).toHaveBeenCalledWith(USER, {
        where: {
          status: 'watched',
          watchDate: { gte: OCTOBER.start, lt: OCTOBER.end },
        },
        include: { genre: true },
      });
    });

    it('measures the trend against the previous month', async () => {
      findMany.mockResolvedValue([watched(3), watched(10), watched(20)]);
      count.mockResolvedValue(5);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(count).toHaveBeenCalledWith(USER, {
        status: 'watched',
        watchDate: {
          gte: new Date('2026-09-01T00:00:00Z'),
          lt: new Date('2026-10-01T00:00:00Z'),
        },
      });
      expect(stats.watched).toEqual({ count: 3, trend: -2 });
    });

    it('reports an empty month as zero with no trend, not a trend of zero', async () => {
      count.mockResolvedValue(4);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.watched).toEqual({ count: 0, trend: null });
    });
  });

  describe('average rating (DSH-4, FIL-31)', () => {
    it('excludes unrated titles rather than counting them as zero', async () => {
      // Two fives and an unrated title. Counting the unrated one as zero would
      // give 3.3; excluding it gives 5.
      findMany.mockResolvedValue([
        watched(3, { rating: 10 }),
        watched(4, { rating: 10 }),
        watched(5, { rating: null }),
      ]);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.averageRating).toBe(5);
    });

    it('keeps half stars at their real value', async () => {
      // 9 and 8 half-star units are 4.5 and 4 stars, mean 4.25, shown as 4.3.
      findMany.mockResolvedValue([
        watched(3, { rating: 9 }),
        watched(4, { rating: 8 }),
      ]);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.averageRating).toBe(4.3);
    });

    it('is absent, not zero, when nothing in the month is rated', async () => {
      findMany.mockResolvedValue([watched(3, { rating: null })]);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.averageRating).toBeNull();
    });

    // The card's empty variant is "- / 5" with grey stars, which has to stay
    // distinguishable from a genuine average of zero.
    it('reports a real average of zero as zero', async () => {
      findMany.mockResolvedValue([watched(3, { rating: 0 })]);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.averageRating).toBe(0);
    });
  });

  describe('top genre (DSH-5, FIL-31)', () => {
    it('returns the most watched genre and its count', async () => {
      findMany.mockResolvedValue([
        watched(3, { genre: 'Drama' }),
        watched(4, { genre: 'Sci-Fi' }),
        watched(5, { genre: 'Sci-Fi' }),
      ]);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.topGenre).toEqual({ name: 'Sci-Fi', count: 2 });
    });

    // Documented rule: highest count, then name A to Z. Without it the card would
    // flicker between reloads on identical data.
    it('breaks a tie alphabetically', async () => {
      findMany.mockResolvedValue([
        watched(3, { genre: 'Sci-Fi' }),
        watched(4, { genre: 'Drama' }),
      ]);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.topGenre).toEqual({ name: 'Drama', count: 1 });
    });

    it('is absent for a month with nothing watched', async () => {
      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.topGenre).toBeNull();
    });
  });

  describe('watch activity (DSH-7, FIL-32)', () => {
    it('buckets by day into the four bars the chart draws', async () => {
      findMany.mockResolvedValue([
        watched(1),
        watched(7),
        watched(8),
        watched(15),
        watched(22),
        watched(31),
      ]);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.activity.buckets).toEqual([2, 1, 1, 2]);
    });

    // A29: the mock's badge and the watched-count card disagree for the same
    // month. Deriving both from one row set is what stops that being reproduced.
    it('totals to exactly the watched count', async () => {
      findMany.mockResolvedValue([
        watched(2),
        watched(9),
        watched(16),
        watched(23),
      ]);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.activity.total).toBe(4);
      expect(stats.activity.total).toBe(stats.watched.count);
    });

    it('flags the bar containing today in the current month', async () => {
      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.activity.currentBucket).toBe(2);
    });

    it('flags nothing in a past month', async () => {
      const stats = await dashboard.getMonthlyStats(
        USER,
        parseMonth('2026-09'),
        IN_OCTOBER,
      );

      expect(stats.activity.currentBucket).toBeNull();
    });

    it('reports an empty month as four zero bars and a zero total', async () => {
      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.activity.buckets).toEqual([0, 0, 0, 0]);
      expect(stats.activity.total).toBe(0);
    });
  });

  describe('summary', () => {
    it('combines the hero, the rail and the stats for one dashboard request', async () => {
      findFirst.mockResolvedValue({
        ...title({ name: 'Severance', status: 'watching' }),
        genre: { name: 'Sci-Fi' },
      });
      // getSummary issues two findMany calls with different filters. Routing on
      // the status keeps them apart, and keeps the stats rows carrying the genre
      // that `include: { genre: true }` guarantees in production.
      findMany.mockImplementation(
        (_user: string, args: { where?: { status?: string } }) =>
          args?.where?.status === 'watched'
            ? Promise.resolve([watched(3, { genre: 'Drama', rating: 8 })])
            : Promise.resolve([title()]),
      );

      const summary = await dashboard.getSummary(USER, OCTOBER);

      expect(summary.continueWatching?.name).toBe('Severance');
      expect(summary.upNext).toHaveLength(1);
      expect(summary.stats.month).toBe('2026-10');
      expect(summary.stats.watched.count).toBe(1);
      expect(summary.stats.topGenre).toEqual({ name: 'Drama', count: 1 });
    });

    // FIL-67's acceptance criterion: the teaser and the Picker page must read the
    // same value from the same source, so the summary delegates rather than
    // recomputing.
    it('takes the picker gate from the same service the Picker page reads', async () => {
      getGateState.mockResolvedValue({
        unlocked: true,
        ratedCount: 5,
        threshold: 3,
      });

      const summary = await dashboard.getSummary(USER, OCTOBER);

      expect(getGateState).toHaveBeenCalledWith(USER);
      expect(summary.picker).toEqual({
        unlocked: true,
        ratedCount: 5,
        threshold: 3,
      });
    });

    it('reads as a fully empty dashboard for a brand new account', async () => {
      const summary = await dashboard.getSummary(USER, OCTOBER);

      expect(summary.continueWatching).toBeNull();
      expect(summary.upNext).toEqual([]);
      expect(summary.stats).toEqual({
        month: '2026-10',
        watched: { count: 0, trend: null },
        averageRating: null,
        topGenre: null,
        activity: { buckets: [0, 0, 0, 0], total: 0, currentBucket: null },
      });
      expect(summary.picker).toEqual({
        unlocked: false,
        ratedCount: 0,
        threshold: 3,
      });
    });
  });
});

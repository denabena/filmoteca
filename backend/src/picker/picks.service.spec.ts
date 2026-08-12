import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TitlesRepository } from '../titles/titles.repository';
import { CandidatesRepository } from './candidates.repository';
import { PickerGateService } from './picker-gate.service';
import { PicksService } from './picks.service';

const USER = 'neon-user-123';

/** A pool row as `findEligible` returns it: a catalogue title joined to its genre. */
function candidate(
  overrides: { tmdbId: number; name: string; voteAverage?: number } = {
    tmdbId: 1,
    name: 'Arrival',
  },
) {
  const { tmdbId, name, voteAverage = 8 } = overrides;

  return {
    id: `catalogue-${tmdbId}`,
    tmdbId,
    type: 'movie' as const,
    name,
    year: 2016,
    runtime: 116,
    genreId: 'genre-uuid',
    tmdbGenreIds: [878],
    overview: null,
    posterPath: '/arrival.jpg',
    voteAverage,
    voteCount: 12_000,
    syncedAt: new Date('2026-08-01T00:00:00Z'),
    createdAt: new Date('2026-08-01T00:00:00Z'),
    genre: {
      id: 'genre-uuid',
      slug: 'sci-fi',
      name: 'Sci-Fi',
      colorSlot: 1,
      descriptor: null,
      tmdbMovieId: 878,
      tmdbTvId: 10_765,
    },
  };
}

describe('PicksService', () => {
  const findEligible = jest.fn();
  const getState = jest.fn();
  const createTitle = jest.fn();
  const findManyTitles = jest.fn();
  const findFirstPick = jest.fn();
  const updatePick = jest.fn();
  const upsertPick = jest.fn();

  let picks: PicksService;

  beforeEach(async () => {
    findEligible.mockReset().mockResolvedValue([]);
    getState
      .mockReset()
      .mockResolvedValue({ unlocked: true, ratedCount: 5, threshold: 3 });
    createTitle.mockReset().mockResolvedValue({});
    findManyTitles.mockReset().mockResolvedValue([]);
    findFirstPick.mockReset().mockResolvedValue(null);
    updatePick.mockReset().mockResolvedValue({});
    // Echoes the row back with its genre, which is what `toCard` reads.
    upsertPick.mockReset().mockImplementation(
      (args: { create: Record<string, unknown> }) =>
        ({
          ...args.create,
          id: 'pick-uuid',
          genre: { name: 'Sci-Fi', colorSlot: 1 },
        }) as unknown,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PicksService,
        {
          provide: PrismaService,
          useValue: {
            title: { findMany: findManyTitles },
            pick: {
              findFirst: findFirstPick,
              update: updatePick,
              upsert: upsertPick,
              findMany: jest.fn(),
            },
            // The array form: Prisma resolves every operation together, so the fake
            // has to as well or the batch tests see one write instead of three.
            $transaction: (operations: unknown[]) => Promise.all(operations),
          },
        },
        { provide: CandidatesRepository, useValue: { findEligible } },
        { provide: TitlesRepository, useValue: { create: createTitle } },
        { provide: PickerGateService, useValue: { getState } },
      ],
    }).compile();

    picks = module.get(PicksService);
  });

  describe('generation', () => {
    // A bad first suggestion is worse than a locked card, so this refuses rather
    // than returning something weak.
    it('refuses below the unlock threshold', async () => {
      getState.mockResolvedValue({
        unlocked: false,
        ratedCount: 2,
        threshold: 3,
      });

      await expect(picks.generate(USER, [])).rejects.toThrow(ConflictException);
      expect(findEligible).not.toHaveBeenCalled();
    });

    it('says how far off the user is when it refuses', async () => {
      getState.mockResolvedValue({
        unlocked: false,
        ratedCount: 1,
        threshold: 3,
      });

      await expect(picks.generate(USER, [])).rejects.toThrow(
        'The Picker needs 3 rated titles. You have 1.',
      );
    });

    // The exhausted case is undesigned. Degrading beats throwing, or the Picker
    // breaks for the most engaged users first.
    it('degrades to an empty batch when the pool is exhausted', async () => {
      findEligible.mockResolvedValue([]);

      await expect(picks.generate(USER, [])).resolves.toEqual([]);
    });

    it('passes the selected moods through to candidate selection', async () => {
      await picks.generate(USER, ['edge-of-seat']);

      expect(findEligible).toHaveBeenCalledWith(USER, ['edge-of-seat'], 60);
    });

    it('still selects candidates when no moods were chosen', async () => {
      await picks.generate(USER, []);

      expect(findEligible).toHaveBeenCalledWith(USER, [], 60);
    });

    /*
     * A batch is one generation event, so its rows share one timestamp.
     *
     * This is not housekeeping. `DashboardService.getTopPick` finds the newest
     * batch by `generatedAt`, and when the three rows were stamped milliseconds
     * apart the last one written won: the dashboard teaser advertised rank 2 while
     * the Picker page listed rank 0 first, so two screens whose entire promise is
     * showing the same card showed different films.
     */
    it('stamps every row in a batch with one time', async () => {
      findEligible.mockResolvedValue([
        candidate({ tmdbId: 1, name: 'Arrival' }),
        candidate({ tmdbId: 2, name: 'Annihilation' }),
        candidate({ tmdbId: 3, name: 'Ad Astra' }),
      ]);

      await picks.generate(USER, []);

      const stamps = upsertPick.mock.calls.map(
        ([args]: [
          { create: { generatedAt: Date }; update: { generatedAt: Date } },
        ]) => [args.create.generatedAt, args.update.generatedAt],
      );

      expect(stamps).toHaveLength(3);
      // Every create and every update, one value. `new Set` over the ISO strings is
      // the whole assertion: three rows, one instant.
      expect(new Set(stamps.flat().map((at) => at.toISOString())).size).toBe(1);
    });

    it('numbers the batch from rank 0, best match first', async () => {
      findEligible.mockResolvedValue([
        candidate({ tmdbId: 1, name: 'Weakest', voteAverage: 2 }),
        candidate({ tmdbId: 2, name: 'Strongest', voteAverage: 10 }),
      ]);

      await picks.generate(USER, []);

      const byRank = upsertPick.mock.calls.map(
        ([args]: [{ create: { rank: number; name: string } }]) => [
          args.create.rank,
          args.create.name,
        ],
      );

      expect(byRank).toEqual([
        [0, 'Strongest'],
        [1, 'Weakest'],
      ]);
    });
  });

  describe('another user’s pick', () => {
    it('404s on add', async () => {
      findFirstPick.mockResolvedValue(null);

      await expect(picks.addToWatchlist(USER, 'pick-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(createTitle).not.toHaveBeenCalled();
    });

    it('404s on dismiss', async () => {
      findFirstPick.mockResolvedValue(null);

      await expect(picks.dismiss(USER, 'pick-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(updatePick).not.toHaveBeenCalled();
    });

    it('scopes the lookup by owner as well as id', async () => {
      findFirstPick.mockResolvedValue(null);

      await expect(picks.dismiss(USER, 'pick-uuid')).rejects.toThrow();
      expect(findFirstPick).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pick-uuid', userId: USER } }),
      );
    });
  });

  describe('add to watchlist', () => {
    const suggested = {
      id: 'pick-uuid',
      userId: USER,
      name: 'Arrival',
      year: 2016,
      type: 'movie',
      runtime: 116,
      genreId: 'genre-sci-fi',
      posterPath: '/arrival.jpg',
      matchPercent: 92,
      reason: 'because',
      state: 'suggested',
      genre: { name: 'Sci-Fi' },
    };

    it('creates a want-to-watch title carrying the pick’s fields', async () => {
      findFirstPick.mockResolvedValue(suggested);
      updatePick.mockResolvedValue({ ...suggested, state: 'added' });

      await picks.addToWatchlist(USER, 'pick-uuid');

      expect(createTitle).toHaveBeenCalledWith(USER, {
        name: 'Arrival',
        type: 'movie',
        status: 'want_to_watch',
        genreId: 'genre-sci-fi',
        year: 2016,
        runtime: 116,
        posterPath: '/arrival.jpg',
      });
    });

    // A double click must not produce two library rows.
    it('creates nothing the second time', async () => {
      findFirstPick.mockResolvedValue({ ...suggested, state: 'added' });

      const card = await picks.addToWatchlist(USER, 'pick-uuid');

      expect(createTitle).not.toHaveBeenCalled();
      expect(card.state).toBe('added');
    });
  });

  describe('dismiss', () => {
    it('marks the pick dismissed so it is never offered again', async () => {
      findFirstPick.mockResolvedValue({
        id: 'pick-uuid',
        userId: USER,
        genre: { name: 'Sci-Fi' },
        state: 'suggested',
      });

      await picks.dismiss(USER, 'pick-uuid');

      expect(updatePick).toHaveBeenCalledWith({
        where: { id: 'pick-uuid' },
        data: { state: 'dismissed' },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import type { Title } from '@prisma/client';
import { PickerGateService } from '../picker/picker-gate.service';
import { PrismaService } from '../prisma/prisma.service';
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
    genre: { name: genre, colorSlot: 2 },
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

/** A `picks` row as `getTopPick` reads it, joined to its genre. */
function pick(
  overrides: {
    rank: number;
    name: string;
    generatedAt?: string;
    batchId?: string;
    state?: string;
  } = { rank: 0, name: 'Arrival' },
) {
  const {
    rank,
    name,
    generatedAt = '2026-10-17T09:00:00Z',
    batchId = 'batch-1',
    state = 'suggested',
  } = overrides;

  return {
    id: `pick-rank-${rank}`,
    userId: USER,
    batchId,
    rank,
    state,
    generatedAt: new Date(generatedAt),
    name,
    year: 2016,
    type: 'movie' as const,
    posterPath: '/arrival.jpg',
    reason: 'Because you rated Blade Runner 2049 highly.',
    genre: { name: 'Sci-Fi', colorSlot: 1 },
  };
}

type PickRow = ReturnType<typeof pick>;

/**
 * The slice of `prisma.pick.findFirst` that `getTopPick` uses, over an array.
 *
 * Deliberately not a Prisma emulator, and deliberately **not** a `mockResolvedValue`:
 * the thing under test is which row an ordering picks, and a mock returning a fixed
 * row answers that question for the code instead of asking it.
 *
 * It honours Prisma's multi-key `orderBy` rather than rejecting it, so the ordering
 * that caused the bug returns the **wrong row** here exactly as it did against
 * Postgres. A fake that refused the query would fail the test for the wrong reason
 * and would not show what went wrong. A `where` or `orderBy` key it genuinely cannot
 * answer still throws, rather than being ignored.
 */
function pickTable(rows: PickRow[]) {
  const value = (row: PickRow, key: string): number => {
    if (key === 'generatedAt') return row.generatedAt.getTime();
    if (key === 'rank') return row.rank;
    throw new Error(`pickTable cannot order by ${key}`);
  };

  return (args: {
    where: { userId: string; batchId?: string; state?: { not: string } };
    orderBy: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  }): Promise<PickRow | null> => {
    const { userId, batchId, state, ...unknownWhere } = args.where;

    if (Object.keys(unknownWhere).length > 0) {
      throw new Error(
        `pickTable cannot honour where: ${Object.keys(unknownWhere).join(', ')}`,
      );
    }

    const matched = rows.filter(
      (row) =>
        row.userId === userId &&
        (batchId === undefined || row.batchId === batchId) &&
        (state?.not === undefined || row.state !== state.not),
    );

    // One object or an array of them, which is how Prisma spells a multi-key sort.
    const keys = (
      Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]
    ).flatMap((clause) => Object.entries(clause));

    const sorted = [...matched].sort((a, b) => {
      for (const [key, direction] of keys) {
        const difference = value(a, key) - value(b, key);
        if (difference !== 0)
          return direction === 'desc' ? -difference : difference;
      }

      return 0;
    });

    return Promise.resolve(sorted[0] ?? null);
  };
}

describe('DashboardService', () => {
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const count = jest.fn();
  const getGateState = jest.fn();
  const findFirstPick = jest.fn();

  /** Points `prisma.pick.findFirst` at a table that really sorts. */
  const usePickTable = (rows: PickRow[]) =>
    findFirstPick.mockImplementation(pickTable(rows));

  let dashboard: DashboardService;

  beforeEach(async () => {
    findMany.mockReset().mockResolvedValue([]);
    findFirst.mockReset().mockResolvedValue(null);
    count.mockReset().mockResolvedValue(0);
    getGateState
      .mockReset()
      .mockResolvedValue({ unlocked: false, ratedCount: 0, threshold: 3 });
    findFirstPick.mockReset().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: TitlesRepository, useValue: { findMany, findFirst, count } },
        { provide: PickerGateService, useValue: { getState: getGateState } },
        {
          provide: PrismaService,
          useValue: { pick: { findFirst: findFirstPick } },
        },
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
        genre: { name: 'Sci-Fi', colorSlot: 1 },
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
        genre: { name: 'Sci-Fi', colorSlot: 1 },
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

      expect(stats.topGenre).toEqual({
        name: 'Sci-Fi',
        count: 2,
        colorSlot: 2,
      });
    });

    // Documented rule: highest count, then name A to Z. Without it the card would
    // flicker between reloads on identical data.
    it('breaks a tie alphabetically', async () => {
      findMany.mockResolvedValue([
        watched(3, { genre: 'Sci-Fi' }),
        watched(4, { genre: 'Drama' }),
      ]);

      const stats = await dashboard.getMonthlyStats(USER, OCTOBER, IN_OCTOBER);

      expect(stats.topGenre).toEqual({ name: 'Drama', count: 1, colorSlot: 2 });
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

  describe('available months (FIL-40)', () => {
    // A dropdown that cannot select the month you are looking at is broken, so
    // the current month is offered even with nothing in it.
    it('always offers the current month, even when empty', async () => {
      findMany.mockResolvedValue([]);

      await expect(
        dashboard.getAvailableMonths(USER, new Date('2026-10-17T00:00:00Z')),
      ).resolves.toEqual(['2026-10']);
    });

    it('offers only months the user actually watched something in, newest first', async () => {
      findMany.mockResolvedValue([
        watched(3),
        { ...watched(4), watchDate: new Date(Date.UTC(2026, 6, 2)) },
        { ...watched(5), watchDate: new Date(Date.UTC(2025, 11, 30)) },
      ]);

      await expect(
        dashboard.getAvailableMonths(USER, new Date('2026-10-17T00:00:00Z')),
      ).resolves.toEqual(['2026-10', '2026-07', '2025-12']);
    });

    it('does not repeat the current month when it also has data', async () => {
      findMany.mockResolvedValue([watched(3), watched(9)]);

      const months = await dashboard.getAvailableMonths(
        USER,
        new Date('2026-10-17T00:00:00Z'),
      );

      expect(months).toEqual(['2026-10']);
    });
  });

  describe('top pick (DSH-8, FIL-39)', () => {
    it('is null when nothing has been generated', async () => {
      await expect(dashboard.getTopPick(USER)).resolves.toBeNull();
    });

    it('serialises the card the teaser draws', async () => {
      usePickTable([pick({ rank: 0, name: 'Arrival' })]);

      await expect(dashboard.getTopPick(USER)).resolves.toEqual({
        id: 'pick-rank-0',
        name: 'Arrival',
        year: 2016,
        type: 'movie',
        genre: 'Sci-Fi',
        posterPath: '/arrival.jpg',
        reason: 'Because you rated Blade Runner 2049 highly.',
      });
    });

    /*
     * The bug this replaces a mock to catch. Three rows of one batch were stamped
     * milliseconds apart, so ordering by `generatedAt` desc then `rank` asc was
     * decided entirely by the first key: the last row written won, and the teaser
     * advertised rank 2 while the Picker page listed rank 0 first.
     *
     * A `findFirst` mock cannot fail this test, because it returns whatever it was
     * told to regardless of the ordering asked for. So these run over a table that
     * actually sorts.
     */
    it('reads rank 0 even when the batch rows were stamped apart', async () => {
      usePickTable([
        pick({
          rank: 0,
          name: 'Arrival',
          generatedAt: '2026-10-17T09:00:00.100Z',
        }),
        pick({
          rank: 1,
          name: 'Annihilation',
          generatedAt: '2026-10-17T09:00:00.200Z',
        }),
        pick({
          rank: 2,
          name: 'Ad Astra',
          generatedAt: '2026-10-17T09:00:00.300Z',
        }),
      ]);

      await expect(dashboard.getTopPick(USER)).resolves.toMatchObject({
        name: 'Arrival',
      });
    });

    it('prefers the newest batch over an older one', async () => {
      usePickTable([
        pick({
          rank: 0,
          name: 'Arrival',
          generatedAt: '2026-09-01T09:00:00Z',
          batchId: 'batch-old',
        }),
        pick({
          rank: 0,
          name: 'Ad Astra',
          generatedAt: '2026-10-17T09:00:00Z',
          batchId: 'batch-new',
        }),
      ]);

      await expect(dashboard.getTopPick(USER)).resolves.toMatchObject({
        name: 'Ad Astra',
      });
    });

    // A dismissed rank 0 must promote rank 1 rather than empty the teaser.
    it('promotes the next rank when rank 0 is dismissed', async () => {
      usePickTable([
        pick({ rank: 0, name: 'Arrival', state: 'dismissed' }),
        pick({ rank: 1, name: 'Annihilation' }),
      ]);

      await expect(dashboard.getTopPick(USER)).resolves.toMatchObject({
        name: 'Annihilation',
      });
    });

    it('is null when every pick in the newest batch is dismissed', async () => {
      usePickTable([
        pick({ rank: 0, name: 'Arrival', state: 'dismissed' }),
        pick({ rank: 1, name: 'Annihilation', state: 'dismissed' }),
      ]);

      await expect(dashboard.getTopPick(USER)).resolves.toBeNull();
    });
  });

  describe('summary', () => {
    it('combines the hero, the rail and the stats for one dashboard request', async () => {
      findFirst.mockResolvedValue({
        ...title({ name: 'Severance', status: 'watching' }),
        genre: { name: 'Sci-Fi', colorSlot: 1 },
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
      expect(summary.stats.topGenre).toEqual({
        name: 'Drama',
        count: 1,
        colorSlot: 2,
      });
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

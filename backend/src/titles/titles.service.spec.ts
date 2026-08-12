import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Genre, Title } from '@prisma/client';
import { DashboardService } from '../dashboard/dashboard.service';
import { parseMonth } from '../dashboard/month';
import {
  PICKER_UNLOCK_THRESHOLD,
  PickerGateService,
} from '../picker/picker-gate.service';
import { PrismaService } from '../prisma/prisma.service';
import { FakeTitleTable } from './fake-title-table';
import { TitlesRepository } from './titles.repository';
import { TitlesService } from './titles.service';

/**
 * FIL-57. Like the delete suite, these run over a real in-memory store rather
 * than a mock, because "nothing changes" and "the stats recompute" are both
 * claims about a second read.
 */
describe('TitlesService (FIL-57)', () => {
  const OWNER = 'neon-user-owner';
  const INTRUDER = 'neon-user-intruder';

  const DRAMA = {
    id: 'genre-drama',
    slug: 'drama',
    name: 'Drama',
    colorSlot: 5,
    descriptor: null,
    tmdbMovieId: 18,
    tmdbTvId: 18,
  } as Genre;

  const OCTOBER = parseMonth('2026-10');
  /** Pinned "today" for the watch-date stamp. Inside OCTOBER's third week. */
  const TODAY = new Date('2026-10-19T14:32:07.123Z');

  function title(overrides: Partial<Title>): Title {
    return {
      id: 'title-1',
      userId: OWNER,
      name: 'A film',
      type: 'movie',
      status: 'watching',
      genreId: DRAMA.id,
      watchDate: null,
      rating: null,
      note: null,
      favorite: false,
      year: 2024,
      runtime: 120,
      director: null,
      posterPath: null,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      updatedAt: new Date('2026-10-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  let table: FakeTitleTable;
  let actions: TitlesService;
  let picker: PickerGateService;
  let dashboard: DashboardService;

  async function build(rows: Title[]) {
    table = new FakeTitleTable(rows, { [DRAMA.id]: DRAMA });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitlesService,
        TitlesRepository,
        PickerGateService,
        DashboardService,
        {
          provide: PrismaService,
          useValue: {
            title: table,
            genre: { findMany: () => Promise.resolve([DRAMA]) },
            pick: { findFirst: () => Promise.resolve(null) },
          },
        },
      ],
    }).compile();

    actions = module.get(TitlesService);
    picker = module.get(PickerGateService);
    dashboard = module.get(DashboardService);
  }

  describe('markWatched', () => {
    it.each(['watching', 'want_to_watch'] as const)(
      'moves a %s title to watched',
      async (status) => {
        await build([title({ status })]);

        const result = await actions.markWatched(OWNER, 'title-1', TODAY);

        expect(result.status).toBe('watched');
      },
    );

    /*
     * A22. The row menu is mocked only on a watching row, so idempotence is a
     * working decision over hiding or disabling the item. "Nothing changes" is
     * literal here: the already-watched branch returns before any write.
     */
    it('succeeds and changes nothing on a title that is already watched', async () => {
      const existing = new Date('2026-09-02T00:00:00.000Z');
      await build([title({ status: 'watched', watchDate: existing })]);

      const result = await actions.markWatched(OWNER, 'title-1', TODAY);

      expect(result).toMatchObject({ status: 'watched', watchDate: existing });
      expect(table.all()[0].updatedAt).toEqual(
        new Date('2026-10-01T00:00:00.000Z'),
      );
    });

    // Even an already-watched title with no date is left alone, so the rule
    // above stays "nothing changes" rather than "nothing much changes".
    it('does not backfill a date onto an already-watched title', async () => {
      await build([title({ status: 'watched', watchDate: null })]);

      const result = await actions.markWatched(OWNER, 'title-1', TODAY);

      expect(result.watchDate).toBeNull();
    });

    /*
     * The documented decision. Monthly stats key off watchDate and FIL-30 makes a
     * watched title with no date count nowhere, so marking watched and seeing the
     * dashboard not move would read as a broken dashboard.
     */
    it('stamps today when a newly watched title has no date', async () => {
      await build([title({ status: 'watching', watchDate: null })]);

      const result = await actions.markWatched(OWNER, 'title-1', TODAY);

      expect(result.watchDate).toEqual(new Date('2026-10-19T00:00:00.000Z'));
    });

    it('never overwrites a date the user typed', async () => {
      const typed = new Date('2026-10-02T00:00:00.000Z');
      await build([title({ status: 'want_to_watch', watchDate: typed })]);

      const result = await actions.markWatched(OWNER, 'title-1', TODAY);

      expect(result.watchDate).toEqual(typed);
    });

    it("is a 404 on another user's title", async () => {
      await build([title({ userId: INTRUDER })]);

      await expect(
        actions.markWatched(OWNER, 'title-1', TODAY),
      ).rejects.toThrow(NotFoundException);

      expect(table.all()[0].status).toBe('watching');
    });

    it('recomputes the month stats and the activity buckets', async () => {
      await build([title({ status: 'watching', watchDate: null })]);

      const before = await dashboard.getMonthlyStats(OWNER, OCTOBER, TODAY);
      await actions.markWatched(OWNER, 'title-1', TODAY);
      const after = await dashboard.getMonthlyStats(OWNER, OCTOBER, TODAY);

      expect(before.watched.count).toBe(0);
      expect(after.watched.count).toBe(1);
      // The 19th falls in the third bucket (days 15-21).
      expect(after.activity.buckets[2]).toBe(1);
      expect(after.activity.total).toBe(after.watched.count);
    });

    /*
     * Marking watched does not touch the rating, so it cannot move the gate on
     * its own. Asserting that is the point: the gate counts rated titles, not
     * watched ones, and those are easy to conflate.
     */
    it('leaves Picker gating where it was, because it counts ratings not statuses', async () => {
      await build([
        ...Array.from({ length: PICKER_UNLOCK_THRESHOLD - 1 }, (_, index) =>
          title({ id: `rated-${index}`, status: 'watched', rating: 8 }),
        ),
        title({ id: 'title-1', status: 'watching', rating: null }),
      ]);

      await actions.markWatched(OWNER, 'title-1', TODAY);

      await expect(picker.getState(OWNER)).resolves.toMatchObject({
        unlocked: false,
        ratedCount: PICKER_UNLOCK_THRESHOLD - 1,
      });
    });
  });

  describe('toggleFavorite', () => {
    it('flips a title that is not a favourite', async () => {
      await build([title({ favorite: false })]);

      await expect(
        actions.toggleFavorite(OWNER, 'title-1'),
      ).resolves.toMatchObject({ favorite: true });
    });

    it('flips a title that is', async () => {
      await build([title({ favorite: true })]);

      await expect(
        actions.toggleFavorite(OWNER, 'title-1'),
      ).resolves.toMatchObject({ favorite: false });
    });

    // FIL-46 updates the heart optimistically and reverts on failure, so it needs
    // the server's answer to confirm against rather than its own guess.
    it('returns the resulting state rather than nothing', async () => {
      await build([title({ favorite: false })]);

      const result = await actions.toggleFavorite(OWNER, 'title-1');

      expect(result.favorite).toBe(table.all()[0].favorite);
    });

    it('round-trips back to where it started', async () => {
      await build([title({ favorite: false })]);

      await actions.toggleFavorite(OWNER, 'title-1');
      await expect(
        actions.toggleFavorite(OWNER, 'title-1'),
      ).resolves.toMatchObject({ favorite: false });
    });

    it("is a 404 on another user's title", async () => {
      await build([title({ userId: INTRUDER, favorite: false })]);

      await expect(actions.toggleFavorite(OWNER, 'title-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(table.all()[0].favorite).toBe(false);
    });
  });
});

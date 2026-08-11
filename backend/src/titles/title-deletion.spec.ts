import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Genre, Title } from '@prisma/client';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { DashboardService } from '../dashboard/dashboard.service';
import { parseMonth } from '../dashboard/month';
import { GenresService } from '../genres/genres.service';
import {
  PICKER_UNLOCK_THRESHOLD,
  PickerGateService,
} from '../picker/picker-gate.service';
import { PrismaService } from '../prisma/prisma.service';
import { FakeTitleTable } from './fake-title-table';
import { TitlesController } from './titles.controller';
import { TitlesRepository } from './titles.repository';

/**
 * FIL-56's criteria are almost all about what a *different* view says after a
 * delete, so this suite reads the real derived services either side of one.
 *
 * That is a deliberate departure from the query-shape tests elsewhere in
 * `titles/`. Those prove the owner is in the `where`, which is the right shape
 * for FIL-14. They cannot prove "that genre no longer appears" or "the Picker
 * returns to its locked state", because a mock returning a fixed array will say
 * whatever the second `mockResolvedValueOnce` says. What is under test here is
 * that nothing needed a recompute hook, and only a store that actually loses the
 * row can demonstrate it.
 *
 * `FakeTitleTable` is the store. CI has no database.
 */
describe('deleting a title (FIL-56)', () => {
  const OWNER = 'neon-user-owner';
  const INTRUDER = 'neon-user-intruder';

  const user: NeonAuthUser = { id: OWNER, claims: { sub: OWNER } };

  const DRAMA = {
    id: 'genre-drama',
    slug: 'drama',
    name: 'Drama',
    colorSlot: 5,
    descriptor: null,
    tmdbMovieId: 18,
    tmdbTvId: 18,
  } as Genre;

  const HORROR = {
    id: 'genre-horror',
    slug: 'horror',
    name: 'Horror',
    colorSlot: 7,
    descriptor: null,
    tmdbMovieId: 27,
    tmdbTvId: null,
  } as Genre;

  const GENRES = { [DRAMA.id]: DRAMA, [HORROR.id]: HORROR };

  /** October 2026, the month the mock draws and the one these rows sit in. */
  const OCTOBER = parseMonth('2026-10');

  function title(overrides: Partial<Title>): Title {
    return {
      id: 'title-0',
      userId: OWNER,
      name: 'A film',
      type: 'movie',
      status: 'watched',
      genreId: DRAMA.id,
      watchDate: new Date('2026-10-08T00:00:00.000Z'),
      rating: 8,
      note: 'a private note',
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
  let controller: TitlesController;
  let genres: GenresService;
  let picker: PickerGateService;
  let dashboard: DashboardService;

  async function build(rows: Title[]) {
    table = new FakeTitleTable(rows, GENRES);

    const prisma = {
      title: table,
      genre: {
        findMany: () =>
          Promise.resolve(
            [DRAMA, HORROR].map(
              ({ id, slug, name, colorSlot, descriptor }) => ({
                id,
                slug,
                name,
                colorSlot,
                descriptor,
              }),
            ),
          ),
      },
      // No picks have ever been generated in these tests, so the teaser is empty.
      pick: { findFirst: () => Promise.resolve(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TitlesController],
      providers: [
        TitlesRepository,
        GenresService,
        PickerGateService,
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(NeonAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(TitlesController);
    genres = module.get(GenresService);
    picker = module.get(PickerGateService);
    dashboard = module.get(DashboardService);
  }

  describe('the row itself', () => {
    beforeEach(() => build([title({ id: 'title-1' })]));

    it('removes the title and the rating, note and watch date on it', async () => {
      await controller.deleteTitle(user, 'title-1');

      expect(table.all()).toHaveLength(0);
    });

    // DEL-3 says "permanently" and "can't be undone". A `deletedAt` flag would
    // make the dialog lie and would need a filter on every derived query that
    // someone eventually forgets.
    it('leaves no soft-deleted remnant behind', async () => {
      await controller.deleteTitle(user, 'title-1');

      const surviving = await genres.listWithCounts(OWNER);
      expect(surviving).toEqual([]);
    });

    it('returns 404 on a retry rather than an error', async () => {
      await controller.deleteTitle(user, 'title-1');

      await expect(controller.deleteTitle(user, 'title-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("another user's title", () => {
    beforeEach(() => build([title({ id: 'title-1', userId: INTRUDER })]));

    it('is a 404 and nothing is removed', async () => {
      await expect(controller.deleteTitle(user, 'title-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(table.all()).toHaveLength(1);
    });
  });

  describe('the derived views (A23)', () => {
    it('recomputes the month stats and the activity buckets', async () => {
      await build([
        title({ id: 'title-1', rating: 10, watchDate: new Date('2026-10-03') }),
        title({ id: 'title-2', rating: 6, watchDate: new Date('2026-10-03') }),
      ]);

      const before = await dashboard.getMonthlyStats(OWNER, OCTOBER);
      await controller.deleteTitle(user, 'title-1');
      const after = await dashboard.getMonthlyStats(OWNER, OCTOBER);

      expect(before.watched.count).toBe(2);
      expect(after.watched.count).toBe(1);

      // The activity total and the watched count come from one row set, which is
      // what stops the mock's 14-against-12 contradiction (A29) reappearing.
      expect(after.activity.total).toBe(after.watched.count);

      // Both titles sat in the first week, so that bar loses one.
      expect(before.activity.buckets[0]).toBe(2);
      expect(after.activity.buckets[0]).toBe(1);

      // 10 and 6 half-stars average to 4.0 stars; 6 alone is 3.0.
      expect(before.averageRating).toBe(4);
      expect(after.averageRating).toBe(3);
    });

    it('drops the genre once its last title goes', async () => {
      await build([
        title({ id: 'title-1', genreId: DRAMA.id }),
        title({ id: 'title-2', genreId: HORROR.id }),
      ]);

      const before = await genres.listWithCounts(OWNER);
      await controller.deleteTitle(user, 'title-2');
      const after = await genres.listWithCounts(OWNER);

      expect(before.map((genre) => genre.name)).toEqual(['Drama', 'Horror']);
      expect(after.map((genre) => genre.name)).toEqual(['Drama']);
    });

    it('leaves a genre in place while it still has titles', async () => {
      await build([
        title({ id: 'title-1', genreId: DRAMA.id }),
        title({ id: 'title-2', genreId: DRAMA.id }),
      ]);

      await controller.deleteTitle(user, 'title-2');

      await expect(genres.listWithCounts(OWNER)).resolves.toEqual([
        expect.objectContaining({ name: 'Drama', titleCount: 1 }),
      ]);
    });

    /*
     * The case A23 flags as easiest to miss. Deleting a *rated* title can drop
     * the count back under the threshold, and the Picker has to re-lock. It does,
     * because the gate counts on every read rather than storing a flag.
     */
    it('re-locks the Picker when a delete drops the rated count below the threshold', async () => {
      const rated = Array.from(
        { length: PICKER_UNLOCK_THRESHOLD },
        (_, index) => title({ id: `title-${index}`, rating: 8 }),
      );
      await build(rated);

      const before = await picker.getState(OWNER);
      await controller.deleteTitle(user, 'title-0');
      const after = await picker.getState(OWNER);

      expect(before.unlocked).toBe(true);
      expect(after).toMatchObject({
        unlocked: false,
        ratedCount: PICKER_UNLOCK_THRESHOLD - 1,
      });
    });

    it('leaves the Picker unlocked when an unrated title is deleted', async () => {
      await build([
        ...Array.from({ length: PICKER_UNLOCK_THRESHOLD }, (_, index) =>
          title({ id: `title-${index}`, rating: 8 }),
        ),
        title({ id: 'title-unrated', rating: null }),
      ]);

      await controller.deleteTitle(user, 'title-unrated');

      await expect(picker.getState(OWNER)).resolves.toMatchObject({
        unlocked: true,
      });
    });

    it('promotes the next candidate into the continue-watching hero', async () => {
      await build([
        title({
          id: 'title-newer',
          status: 'watching',
          updatedAt: new Date('2026-10-20'),
          name: 'The one showing',
        }),
        title({
          id: 'title-older',
          status: 'watching',
          updatedAt: new Date('2026-10-10'),
          name: 'The one behind it',
        }),
      ]);

      const before = await dashboard.getContinueWatching(OWNER);
      await controller.deleteTitle(user, 'title-newer');
      const after = await dashboard.getContinueWatching(OWNER);

      expect(before?.name).toBe('The one showing');
      expect(after?.name).toBe('The one behind it');
    });

    // DSH-1 empty (FIL-35) is a designed state, so this must be null rather than
    // an error or a stale card.
    it('falls back to the hero’s empty state when the last watching title goes', async () => {
      await build([title({ id: 'title-1', status: 'watching' })]);

      await controller.deleteTitle(user, 'title-1');

      await expect(dashboard.getContinueWatching(OWNER)).resolves.toBeNull();
    });

    it('drops the title out of the up-next rail', async () => {
      await build([
        title({ id: 'title-1', status: 'want_to_watch', name: 'Queued first' }),
        title({
          id: 'title-2',
          status: 'want_to_watch',
          name: 'Queued second',
        }),
      ]);

      await controller.deleteTitle(user, 'title-1');

      const rail = await dashboard.getUpNext(OWNER);
      expect(rail.map((entry) => entry.name)).toEqual(['Queued second']);
    });

    it('empties the up-next rail rather than erroring when nothing is left', async () => {
      await build([title({ id: 'title-1', status: 'want_to_watch' })]);

      await controller.deleteTitle(user, 'title-1');

      await expect(dashboard.getUpNext(OWNER)).resolves.toEqual([]);
    });
  });
});

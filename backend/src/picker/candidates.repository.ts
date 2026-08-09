import { Injectable } from '@nestjs/common';
import type { CatalogueTitle, Genre } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type Mood, moodFilter } from './moods';

export type Candidate = CatalogueTitle & { genre: Genre };

/**
 * Reads the Picker candidate pool (FIL-64).
 *
 * The pool is the `catalogue_titles` table, which FIL-81 imports from TMDB. It is
 * shared, unowned reference data, so this is the one repository in the backend
 * that is deliberately **not** scoped to a user. What *is* per-user is the two
 * exclusions below, and those are the whole job.
 *
 * Kept behind this seam on purpose, per A26: swapping the bundled table for a
 * live provider should not touch pick generation.
 */
@Injectable()
export class CandidatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Candidates this user could be shown, best first.
   *
   * Two exclusions, both required by FIL-64:
   *
   * - **Titles already in their library.** Matched on name and type rather than
   *   an id, because a title typed by hand has no catalogue row to point at, and
   *   suggesting someone a film they have already logged is the most obviously
   *   broken thing the Picker could do. Case-insensitive, since the user typed it.
   * - **Candidates they have dismissed.** Matched on `(type, tmdbId)`, the TMDB
   *   identity, **not** on the catalogue row's id. Since FIL-81 stores one row per
   *   title per genre, a film sits in the table several times, and excluding the
   *   single row that was dismissed left the same film eligible under its other
   *   genres. Dismissing "Game of Thrones" as Drama and being offered it again as
   *   Sci-Fi is exactly the thing "Not for me" is supposed to prevent.
   *   Permanent, which is a working decision: the design never says whether "Not
   *   for me" means "not tonight" or "never", and those are different products.
   *
   * `take` over-fetches on purpose. Generation scores what comes back and keeps
   * three, so a pool of one still yields one pick rather than an error, which is
   * the "degrade rather than fail when exhausted" criterion.
   */
  async findEligible(
    userId: string,
    moods: Mood[],
    take: number,
  ): Promise<Candidate[]> {
    const [owned, dismissed] = await Promise.all([
      this.prisma.title.findMany({
        where: { userId },
        select: { name: true, type: true },
      }),
      this.prisma.pick.findMany({
        where: { userId, state: 'dismissed' },
        select: { catalogueTitle: { select: { type: true, tmdbId: true } } },
      }),
    ]);

    return this.prisma.catalogueTitle.findMany({
      where: {
        AND: [
          moodFilter(moods),
          {
            NOT: dismissed.map((pick) => ({
              type: pick.catalogueTitle.type,
              tmdbId: pick.catalogueTitle.tmdbId,
            })),
          },
          {
            NOT: owned.map((title) => ({
              name: { equals: title.name, mode: 'insensitive' as const },
              type: title.type,
            })),
          },
        ],
      },
      include: { genre: true },
      // Popular and well-regarded first, so a shrunken pool still surfaces
      // something worth suggesting rather than whatever sorted first.
      orderBy: [{ voteCount: 'desc' }, { voteAverage: 'desc' }, { id: 'asc' }],
      take,
    });
  }

  /** How many candidates exist at all. Used to explain an empty pool. */
  count(): Promise<number> {
    return this.prisma.catalogueTitle.count();
  }
}

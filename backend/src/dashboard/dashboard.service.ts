import { Injectable } from '@nestjs/common';
import type { TitleType } from '@prisma/client';
import { TitlesRepository } from '../titles/titles.repository';

/**
 * A card in the "Up next in your watchlist" rail (DSH-6).
 *
 * `year` is nullable because per A17 no form captures it: it is only populated
 * for titles added from the Picker, which copy it from the TMDB catalogue. The
 * rail's caption is "{year} · {type}", so the frontend renders the type alone
 * when year is absent rather than an em-dash placeholder nobody designed.
 */
export interface UpNextTitle {
  id: string;
  name: string;
  year: number | null;
  type: TitleType;
  posterPath: string | null;
}

/**
 * The title filling the continue-watching hero (DSH-1).
 *
 * Carries `genre` because that hero's meta line is "{year} · {genre} · {type}",
 * unlike the rail's "{year} · {type}". Season, episode and percent progress
 * appear in the design but are deliberately absent: A9 makes them display-only
 * and no form anywhere captures them, so there is nothing to return.
 */
export interface ContinueWatchingTitle {
  id: string;
  name: string;
  year: number | null;
  type: TitleType;
  genre: string;
  posterPath: string | null;
}

/**
 * What the dashboard needs in one read.
 *
 * The tech spec models this as a single `getDashboardSummary(month)` operation
 * feeding the hero, stats, queue, activity and teaser. Only the hero and the
 * queue exist so far, both from FIL-33; the monthly stats (FIL-30, FIL-31),
 * weekly activity (FIL-32) and Picker teaser add their own keys here rather than
 * their own routes, so the dashboard stays one request.
 */
export interface DashboardSummary {
  continueWatching: ContinueWatchingTitle | null;
  upNext: UpNextTitle[];
}

/**
 * How many cards the up-next rail asks for.
 *
 * DSH-6 draws seven, with a "View all" that goes to the Library, so seven is the
 * designed size of this rail rather than a guess. It is a parameter rather than a
 * constant inlined in the query because nothing in the design fixes the rail's
 * scroll behaviour, and a caller that wants more should not have to edit this
 * file.
 */
export const UP_NEXT_DEFAULT_LIMIT = 7;

@Injectable()
export class DashboardService {
  constructor(private readonly titles: TitlesRepository) {}

  /**
   * The up-next queue: want-to-watch titles, newest first (A11).
   *
   * Not month-scoped, unlike the stat cards. The status field decides what
   * belongs here, not the contents of the mock: several titles drawn in this rail
   * on frame 04 carry a different status on frame 06, which is A29, and the
   * status is what this trusts.
   *
   * Returns an empty array when the user has nothing queued, so the frontend can
   * render the designed empty state (FIL-37) rather than handle an error.
   */
  async getUpNext(
    userId: string,
    limit: number = UP_NEXT_DEFAULT_LIMIT,
  ): Promise<UpNextTitle[]> {
    const rows = await this.titles.findMany(userId, {
      where: { status: 'want_to_watch' },
      // createdAt is the tech spec's addedAt, so "newest first" is by when the
      // user added it, not when they last edited it.
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      year: row.year,
      type: row.type,
      posterPath: row.posterPath,
    }));
  }

  /**
   * The continue-watching hero: the most recently updated "Watching" title (A9).
   *
   * **Selection rule, since more than one title can be Watching at once:** order
   * by `updatedAt` descending and take the first. Ties break on `createdAt`
   * descending, then on `id` ascending, so the result is stable rather than
   * whatever Postgres returns first. Without those tie-breaks two titles saved in
   * the same moment would swap places between requests and the hero would appear
   * to flicker.
   *
   * Returns null rather than throwing when nothing is in progress, because that
   * is a designed state (DSH-1 empty, FIL-35) and not an error.
   */
  async getContinueWatching(
    userId: string,
  ): Promise<ContinueWatchingTitle | null> {
    const row = await this.titles.findFirst(userId, {
      where: { status: 'watching' },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      include: { genre: true },
    });

    if (!row) {
      return null;
    }

    // `include` widens the row at runtime but not in TitlesRepository's return
    // type, which is the plain Title. Narrowing here keeps that generic signature
    // rather than threading a generic through every repository method for the one
    // caller that needs a relation.
    const withGenre = row as typeof row & { genre: { name: string } };

    return {
      id: withGenre.id,
      name: withGenre.name,
      year: withGenre.year,
      type: withGenre.type,
      genre: withGenre.genre.name,
      posterPath: withGenre.posterPath,
    };
  }

  /** Both halves of FIL-33 in one read, which is what the dashboard actually does. */
  async getSummary(userId: string): Promise<DashboardSummary> {
    const [continueWatching, upNext] = await Promise.all([
      this.getContinueWatching(userId),
      this.getUpNext(userId),
    ]);

    return { continueWatching, upNext };
  }
}

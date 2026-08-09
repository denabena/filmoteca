import { Injectable } from '@nestjs/common';
import type { Title, TitleType } from '@prisma/client';
import {
  PickerGateService,
  type PickerGateState,
} from '../picker/picker-gate.service';
import { TitlesRepository } from '../titles/titles.repository';
import {
  ACTIVITY_BUCKET_COUNT,
  currentWeekBucket,
  type MonthRange,
  previousMonth,
  weekBucketForDay,
} from './month';

/**
 * A `Title` as it comes back from a query using `include: { genre: true }`.
 *
 * `TitlesRepository` returns the plain `Title` from every method, because giving
 * it a generic that tracks `include` would complicate all six methods for the two
 * callers here that need a relation. Casting at those two call sites is the
 * cheaper trade; this alias is so it reads as a deliberate narrowing rather than
 * an `any` in disguise.
 */
type TitleWithGenre = Title & { genre: { name: string } };

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
 * The "WATCHED IN OCTOBER" card (DSH-3).
 *
 * `trend` is the signed difference against the month before, so the frontend can
 * render "+3 vs September". It is **null rather than 0 when the month itself is
 * empty**, which is the acceptance criterion but is worth flagging: a month with
 * nothing watched after a month with five loses a genuinely informative "-5".
 * Raise it if that reads wrong on the card.
 */
export interface WatchedStat {
  count: number;
  trend: number | null;
}

/** The "TOP GENRE" card (DSH-5): the month's most-watched genre and its count. */
export interface TopGenreStat {
  name: string;
  count: number;
}

/**
 * The "Watch activity" card (DSH-7): four weekly bars, a total badge, and which
 * bar to label "This week".
 *
 * `total` is the sum of `buckets` by construction rather than a separate query.
 * A29 records that the mock's badge says 14 while the watched-count card says 12
 * for the same month; computing both from one row set is what stops that
 * contradiction from being reproduced in real data.
 */
export interface ActivityStat {
  buckets: number[];
  total: number;
  currentBucket: number | null;
}

/**
 * Everything the three stat cards and the activity chart need for one month.
 *
 * **What "in this month" means here: the title's watch date falls in it.** So a
 * title watched in September but entered today counts towards September, and a
 * watched title with no watch date counts nowhere. That exclusion is deliberate
 * and is FIL-30's acceptance criterion; a title cannot be placed in a month
 * without the one field that says when it was watched.
 */
export interface MonthlyStats {
  month: string;
  watched: WatchedStat;
  /** Mean of the month's ratings, in stars out of 5, or null if nothing is rated. */
  averageRating: number | null;
  topGenre: TopGenreStat | null;
  activity: ActivityStat;
}

/**
 * What the dashboard needs in one read.
 *
 * The tech spec models this as a single `getDashboardSummary(month)` operation
 * feeding the hero, stats, queue, activity and teaser. Every part of that is here
 * now; `picker` is the teaser's locked/unlocked state, read from the same service
 * the Picker page itself reads, so the two screens cannot disagree.
 */
export interface DashboardSummary {
  continueWatching: ContinueWatchingTitle | null;
  upNext: UpNextTitle[];
  stats: MonthlyStats;
  picker: PickerGateState;
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
  constructor(
    private readonly titles: TitlesRepository,
    private readonly pickerGate: PickerGateService,
  ) {}

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

    const withGenre = row as TitleWithGenre;

    return {
      id: withGenre.id,
      name: withGenre.name,
      year: withGenre.year,
      type: withGenre.type,
      genre: withGenre.genre.name,
      posterPath: withGenre.posterPath,
    };
  }

  /**
   * The three stat cards and the activity chart, for one month.
   *
   * One read of the month's rows plus one count of the previous month, then all
   * four numbers are derived in memory. That is deliberate rather than lazy: it
   * keeps a personal watchlist to two queries instead of six, and it makes the
   * watched count and the activity total the *same* number by construction, which
   * is exactly the contradiction A29 warns about in the mock.
   *
   * `now` is injectable so tests can pin which bar counts as "this week".
   */
  async getMonthlyStats(
    userId: string,
    range: MonthRange,
    now: Date = new Date(),
  ): Promise<MonthlyStats> {
    const previous = previousMonth(range);

    const [rows, previousCount] = await Promise.all([
      this.titles.findMany(userId, {
        // A nullable watchDate cannot satisfy a range filter, so watched titles
        // with no date are excluded here rather than by a separate condition.
        where: {
          status: 'watched',
          watchDate: { gte: range.start, lt: range.end },
        },
        include: { genre: true },
      }),
      this.titles.count(userId, {
        status: 'watched',
        watchDate: { gte: previous.start, lt: previous.end },
      }),
    ]);

    const watched = rows as TitleWithGenre[];

    return {
      month: range.key,
      watched: {
        count: watched.length,
        // Absent rather than 0 for an empty month, per the acceptance criterion.
        trend: watched.length === 0 ? null : watched.length - previousCount,
      },
      averageRating: meanRating(watched.map((row) => row.rating)),
      topGenre: topGenre(watched.map((row) => row.genre.name)),
      activity: activity(
        watched.map((row) => row.watchDate),
        range,
        now,
      ),
    };
  }

  /** The whole dashboard in one read, which is what frame 04 actually renders. */
  async getSummary(
    userId: string,
    range: MonthRange,
  ): Promise<DashboardSummary> {
    const [continueWatching, upNext, stats, picker] = await Promise.all([
      this.getContinueWatching(userId),
      this.getUpNext(userId),
      this.getMonthlyStats(userId, range),
      this.pickerGate.getState(userId),
    ]);

    return { continueWatching, upNext, stats, picker };
  }
}

/**
 * Mean of the month's ratings, in stars out of 5 (DSH-4).
 *
 * Unrated titles are **excluded, not counted as zero**: one unrated film would
 * otherwise drag a month of fives down to a four, which is a lie about data the
 * user never entered. A month with nothing rated returns null so the card can show
 * its designed "- / 5" with grey stars, which has to stay distinguishable from a
 * genuine average of 0.
 *
 * Ratings are stored as half-star units (A21), so the mean is exact before it is
 * halved; nothing is rounded on the way in. The result is rounded to one decimal
 * because the card reads "4.2 / 5", and because an unrounded float would ship
 * 4.300000000000001 to the frontend.
 */
function meanRating(ratings: (number | null)[]): number | null {
  const rated = ratings.filter((value): value is number => value !== null);

  if (rated.length === 0) {
    return null;
  }

  const halfStars = rated.reduce((sum, value) => sum + value, 0) / rated.length;

  return Math.round((halfStars / 2) * 10) / 10;
}

/**
 * The month's most-watched genre and its count (DSH-5).
 *
 * **Tie-break: highest count, then genre name A to Z.** Nothing in the design
 * says what happens when two genres tie, and "whatever the database returned
 * first" would make the card flicker between reloads on identical data. Alphabetical
 * is arbitrary but stable and explainable. **Raise it with the designer**, who may
 * prefer the most recently watched of the tied genres.
 */
function topGenre(names: string[]): TopGenreStat | null {
  if (names.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();

  for (const name of names) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
}

/** Four weekly bars, their total, and which one is the current week (DSH-7). */
function activity(
  watchDates: (Date | null)[],
  range: MonthRange,
  now: Date,
): ActivityStat {
  const buckets = new Array<number>(ACTIVITY_BUCKET_COUNT).fill(0);

  for (const date of watchDates) {
    // Unreachable given the range filter upstream, but the column is nullable and
    // a silent NaN index would be a miserable bug to find.
    if (!date) continue;

    buckets[weekBucketForDay(date.getUTCDate())] += 1;
  }

  return {
    buckets,
    total: buckets.reduce((sum, count) => sum + count, 0),
    currentBucket: currentWeekBucket(range, now),
  };
}

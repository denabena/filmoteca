/**
 * The dashboard's response shape.
 *
 * **Hand-mirrored from `backend/src/dashboard/dashboard.service.ts`, which is the
 * source of truth.** Change a field there and you must change it here. That is
 * the known wart described in CLAUDE.md; the fix is generating these from an
 * OpenAPI spec the backend does not expose yet.
 *
 * Client-safe: types only, no server imports, so the chart and rail components
 * can share it.
 */

export type TitleType = 'movie' | 'series';

/** A card in the "Up next in your watchlist" rail (DSH-6). */
export interface UpNextTitle {
  id: string;
  name: string;
  /** Null for a hand-typed title: per A17 no form captures the year. */
  year: number | null;
  type: TitleType;
  posterPath: string | null;
}

/** The title filling the continue-watching hero (DSH-1). */
export interface ContinueWatchingTitle {
  id: string;
  name: string;
  year: number | null;
  type: TitleType;
  genre: string;
  posterPath: string | null;
}

/** "WATCHED IN OCTOBER" (DSH-3). `trend` is null for an empty month. */
export interface WatchedStat {
  count: number;
  trend: number | null;
}

/** "TOP GENRE" (DSH-5). */
export interface TopGenreStat {
  name: string;
  count: number;
}

/** "Watch activity" (DSH-7). Always four buckets. */
export interface ActivityStat {
  buckets: number[];
  total: number;
  /** Index of the bar to label "This week", or null outside the current month. */
  currentBucket: number | null;
}

export interface MonthlyStats {
  month: string;
  watched: WatchedStat;
  /** Out of 5. Null when nothing is rated, which is not the same as 0. */
  averageRating: number | null;
  topGenre: TopGenreStat | null;
  activity: ActivityStat;
}

/** Whether the Picker is unlocked (PIC-9). */
export interface PickerGateState {
  unlocked: boolean;
  ratedCount: number;
  threshold: number;
}

export interface DashboardSummary {
  continueWatching: ContinueWatchingTitle | null;
  upNext: UpNextTitle[];
  stats: MonthlyStats;
  picker: PickerGateState;
}

/**
 * TMDB's image CDN.
 *
 * `posterPath` is stored as TMDB returns it, a leading-slash fragment like
 * `/abc.jpg`, so the base and the size belong here rather than in the database:
 * changing the rendered size must not mean rewriting a thousand rows.
 */
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function posterUrl(
  posterPath: string | null,
  size: 'w185' | 'w342' = 'w342',
): string | null {
  return posterPath ? `${TMDB_IMAGE_BASE}/${size}${posterPath}` : null;
}

/**
 * "October" for a `YYYY-MM` key.
 *
 * Parsed as UTC to match the backend, which buckets every month boundary in UTC
 * because `watchDate` is a zoneless `DATE`. Formatting the same key in local time
 * would name the previous month for anyone west of Greenwich.
 */
export function monthLabel(month: string, opts: { withYear?: boolean } = {}): string {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, index - 1, 1));

  return date.toLocaleString('en-GB', {
    month: 'long',
    ...(opts.withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/** The month before `month`, as a `YYYY-MM` key. Used for the trend caption. */
export function previousMonthKey(month: string): string {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, index - 2, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** One card on the Picker page (PIC-6). Mirrors `PickCard` in the backend. */
export interface PickCard {
  id: string;
  name: string;
  year: number | null;
  type: TitleType;
  genre: string;
  runtime: number | null;
  posterPath: string | null;
  matchPercent: number;
  reason: string;
  state: 'suggested' | 'added' | 'dismissed';
}

/**
 * The six mood chips (PIC-3), with the labels the design uses.
 *
 * The values are the slugs the backend validates against and rejects on
 * mismatch, so this list and `MOODS` in `backend/src/picker/moods.ts` must agree.
 * Another instance of the hand-mirrored contract wart.
 */
export const MOOD_OPTIONS = [
  { value: 'something-light', label: 'Something light' },
  { value: 'mind-bender', label: 'Mind-bender' },
  { value: 'edge-of-seat', label: 'Edge of seat' },
  { value: 'feel-good', label: 'Feel-good' },
  { value: 'short-and-sweet', label: 'Short & sweet' },
  { value: 'critically-loved', label: 'Critically loved' },
] as const;

export type Mood = (typeof MOOD_OPTIONS)[number]['value'];

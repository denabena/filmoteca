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

/** "TOP GENRE" (DSH-5). `colorSlot` indexes the eight-slot genre palette. */
export interface TopGenreStat {
  name: string;
  count: number;
  colorSlot: number;
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

/** The current top pick, for the teaser (DSH-8). */
export interface TopPick {
  id: string;
  name: string;
  year: number | null;
  type: TitleType;
  genre: string;
  posterPath: string | null;
  reason: string;
}

export interface DashboardSummary {
  continueWatching: ContinueWatchingTitle | null;
  upNext: UpNextTitle[];
  stats: MonthlyStats;
  picker: PickerGateState;
  topPick: TopPick | null;
  availableMonths: string[];
}

/** A genre as the Add title select needs it. */
export interface GenreOption {
  id: string;
  slug: string;
  name: string;
  colorSlot: number;
}

/** One title in full, for the detail screen (07). */
export interface TitleDetail {
  id: string;
  name: string;
  type: TitleType;
  status: 'watched' | 'watching' | 'want_to_watch';
  genreId: string;
  watchDate: string | null;
  rating: number | null;
  note: string | null;
  favorite: boolean;
  year: number | null;
  runtime: number | null;
  director: string | null;
  posterPath: string | null;
  createdAt: string;
}

/**
 * Palette class for a genre's colour slot.
 *
 * A lookup rather than an interpolated class name, because Tailwind scans source
 * text for complete class names: `bg-genre-${slot}` compiles to nothing.
 * FIL-36 requires one colour per genre used everywhere, and the slot comes from
 * the `genres` row so every screen agrees.
 */
const GENRE_COLOR: Record<number, string> = {
  1: 'bg-genre-1',
  2: 'bg-genre-2',
  3: 'bg-genre-3',
  4: 'bg-genre-4',
  5: 'bg-genre-5',
  6: 'bg-genre-6',
  7: 'bg-genre-7',
};

export function genreColorClass(colorSlot: number): string {
  // Slot 8 (pink) has no confirmed hex yet, so it falls back rather than
  // rendering an invisible dot.
  return GENRE_COLOR[colorSlot] ?? 'bg-genre-1';
}

/** The status chip's label and tone. */
export const STATUS_LABEL: Record<TitleDetail['status'], string> = {
  watched: 'Watched',
  watching: 'Watching',
  want_to_watch: 'Want to watch',
};

/** Half-star units to display stars: 9 reads as 4.5. */
export function toStars(rating: number | null): number | null {
  return rating === null ? null : rating / 2;
}

/** "2h 46m" for the detail screen. Minutes only under an hour. */
export function formatRuntime(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return hours === 0 ? `${rest}m` : rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * Shortens a pick's reason for the dashboard teaser.
 *
 * **How to shorten is not designed**: the mock simply shows less text than frame
 * 14. Cutting on a word boundary near 100 characters is the working decision, and
 * it keeps the sentence readable rather than clipping mid-word. Raise it.
 */
export const TEASER_REASON_LIMIT = 100;

export function shortenReason(reason: string, limit = TEASER_REASON_LIMIT): string {
  if (reason.length <= limit) return reason;

  const cut = reason.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, '')}…`;
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

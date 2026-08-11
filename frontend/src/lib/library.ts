import type { TitleType } from '@/lib/dashboard';

/**
 * The library list's response shape and the pure helpers its cells need.
 *
 * **Hand-mirrored from `TitleListItem` in
 * `backend/src/titles/titles.controller.ts`, which is the source of truth.**
 * Change a field there and you must change it here. That is the known wart
 * described in CLAUDE.md; the fix is generating these from an OpenAPI spec the
 * backend does not expose yet.
 *
 * Client-safe: types and pure functions only, no server imports, so the row
 * components can import it whichever side of the boundary they end up on.
 */

export type TitleStatus = 'watched' | 'watching' | 'want_to_watch';

/** The genre as a row draws it: a coloured dot and a name. */
export interface TitleListGenre {
  id: string;
  slug: string;
  name: string;
  colorSlot: number;
}

/** One row of the library table (06). */
export interface TitleListItem {
  id: string;
  name: string;
  /** Null for a hand-typed title: per A17 no form captures the year. */
  year: number | null;
  type: TitleType;
  genre: TitleListGenre;
  status: TitleStatus;
  /** Half-star units, 0 to 10, so 9 reads as 4.5 stars (A21). */
  rating: number | null;
  favorite: boolean;
}

/** The caption under a title name: "2024 · Movie". */
export function titleCaption({ year, type }: Pick<TitleListItem, 'year' | 'type'>): string {
  const typeLabel = type === 'movie' ? 'Movie' : 'Series';

  // A17 leaves `year` null for anything not added from the Picker, and the mock
  // has no placeholder for a missing one, so the caption collapses to the type
  // rather than rendering "— · Movie".
  return year === null ? typeLabel : `${year} · ${typeLabel}`;
}

/**
 * The three status tones (LIB-5).
 *
 * `label` is what a screen reader reads, which is why the chip renders it as
 * text rather than relying on the tone: the spec's own accessibility note asks
 * that status not be carried by colour alone.
 *
 * Watched and Watching have designed tones. Want-to-watch is the neutral surface,
 * which is what frame 06 draws, and the dot is the tertiary text colour so the
 * chip still has the same anatomy as the other two.
 */
export const STATUS_TONE: Record<TitleStatus, { label: string; chip: string; dot: string }> = {
  watched: {
    label: 'Watched',
    chip: 'bg-status-success-soft text-status-success-text',
    dot: 'bg-status-success',
  },
  watching: {
    label: 'Watching',
    chip: 'bg-status-warning-soft text-status-warning-text',
    dot: 'bg-status-warning',
  },
  want_to_watch: {
    label: 'Want to watch',
    chip: 'bg-surface-elevated text-text-secondary',
    dot: 'bg-text-tertiary',
  },
};

/**
 * How full each of the five stars is, left to right, as a fraction 0 to 1.
 *
 * **A21 allows half stars, so this cannot round.** A rating of 9 half-star units
 * is 4.5 stars and must draw four full and one half, not five full: rounding is
 * how a 4.5 becomes indistinguishable from a 5 in the one column whose whole job
 * is telling them apart.
 *
 * Returned as fractions rather than a "full / half / empty" enum because the
 * value is stored in half-star units today and a quarter-star could arrive
 * without changing this signature. Every value here is 0, 0.5 or 1 in practice.
 */
export function starFills(rating: number): number[] {
  const stars = rating / 2;

  return [0, 1, 2, 3, 4].map((index) => Math.min(1, Math.max(0, stars - index)));
}

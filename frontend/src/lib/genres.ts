/**
 * Everything the frontend knows about genres, from two directions.
 *
 * Onboarding and Settings need **the fixed set of twelve** before a user has any
 * titles, so those screens read the `GENRES` constant below. The Library's
 * Genres tab needs **the genres a user actually has titles in, with counts**, so
 * it reads `GenreWithCount` off `GET /api/genres/counts`. Two different
 * questions, which is why both live here rather than one being derived from the
 * other.
 *
 * **The two disagree about colour today, and it is visible.** See the note on
 * `GENRES`.
 */

/**
 * One of the twelve genres as the onboarding chips and Settings draw it.
 *
 * `id` is the slug stored in the profile's `favoriteGenres`, so it must match
 * `Genre.slug` in the database.
 */
export interface Genre {
  id: string;
  label: string;
  color: string;
}

/**
 * The app's twelve genres (A7), the set the onboarding chips and Settings use.
 *
 * **⚠️ The `color` here does not agree with the `colorSlot` the database seeds,
 * so the same genre is a different colour on onboarding than it is on the
 * Library and Dashboard.** Sci-Fi is purple in a chip and coral on a card;
 * Action is coral in a chip and blue on a card. Every one of the twelve differs.
 *
 * These hexes were taken from the same Figma palette, but assigned per genre
 * independently of the migration that seeded `colorSlot`, and the two were
 * written before either could see the other. Romance's `#E85C9E` has no token at
 * all, because it is palette slot 8 and `--color-genre-8` is undeclared.
 *
 * **The fix is to read `colorSlot` here too rather than carry hexes**, which
 * means these screens fetching `GET /api/genres` instead of using a constant.
 * That is a real change to how onboarding loads, not a find-and-replace, so it
 * is left as one decision rather than half-made during a merge. Until then treat
 * the migration's `colorSlot` as canonical: it is what three screens already
 * render.
 */
export const GENRES: Genre[] = [
  { id: 'sci-fi', label: 'Sci-Fi', color: '#A85CD6' },
  { id: 'drama', label: 'Drama', color: '#4E86E8' },
  { id: 'comedy', label: 'Comedy', color: '#E8A33D' },
  { id: 'thriller', label: 'Thriller', color: '#46C08A' },
  { id: 'action', label: 'Action', color: '#F0455F' },
  { id: 'romance', label: 'Romance', color: '#E85C9E' },
  { id: 'documentary', label: 'Documentary', color: '#33B1C4' },
  { id: 'horror', label: 'Horror', color: '#7B6EF0' },
  { id: 'animation', label: 'Animation', color: '#E8A33D' },
  { id: 'fantasy', label: 'Fantasy', color: '#A85CD6' },
  { id: 'mystery', label: 'Mystery', color: '#4E86E8' },
  { id: 'crime', label: 'Crime', color: '#F0455F' },
];

/**
 * One card on the Genres tab (GEN-2), from `GET /api/genres/counts`.
 *
 * **Hand-mirrored from `GenreWithCount` in
 * `backend/src/genres/genres.service.ts`, which is the source of truth.** Change
 * a field there and you must change it here. That is the known wart described in
 * CLAUDE.md; the fix is generating these from an OpenAPI spec the backend does
 * not expose yet.
 */
export interface GenreWithCount {
  id: string;
  slug: string;
  name: string;
  colorSlot: number;
  /** Set once the copy below is seeded into the `genres` table. Null today. */
  descriptor: string | null;
  titleCount: number;
}

/**
 * The card taglines, read out of frame 12.
 *
 * **A24 makes these static copy per genre, and nothing in the app captures
 * them.** `Genre.descriptor` exists for exactly this and is null in every row,
 * because the migration was written before the strings had been read off the
 * design. They live here in the meantime, keyed by slug, and the API's value
 * wins the moment the column is seeded, so this constant becomes dead rather
 * than contradictory.
 *
 * **Only eight of the twelve are here, on purpose.** Frame 12 draws eight cards,
 * so those are the eight strings that exist. Animation, Fantasy, Mystery and
 * Crime have no designed tagline, and writing one would be inventing product copy
 * in a component file. Their cards render without the line, which is the honest
 * gap rather than a guess: **worth putting to the designer**, since a card
 * without a descriptor is visibly shorter than its neighbours.
 */
const DESIGNED_DESCRIPTORS: Record<string, string> = {
  'sci-fi': 'Space, time, and everything after.',
  drama: 'Character-driven, awards-season bait.',
  comedy: 'Light watches for tired nights.',
  action: 'Explosions, chases, and set-pieces.',
  thriller: 'Edge-of-seat, twist-heavy plots.',
  romance: 'Love stories and slow burns.',
  documentary: 'Real stories worth knowing.',
  horror: 'Watch with the lights on.',
};

/** The stored tagline if there is one, else the designed one, else nothing. */
export function genreDescriptor({ slug, descriptor }: GenreWithCount): string | null {
  return descriptor ?? DESIGNED_DESCRIPTORS[slug] ?? null;
}

/**
 * "8 titles", and "1 title" rather than "1 titles".
 *
 * The singular is a working decision: the mock has no genre with one title, so
 * the wording is not drawn anywhere. It is also the kind of thing that only ever
 * gets noticed as a bug, which is why there is a test for it.
 */
export function titleCountLabel(count: number): string {
  return count === 1 ? '1 title' : `${count} titles`;
}

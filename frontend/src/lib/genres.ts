/**
 * The Genres tab's response shape and the copy the design supplies for it.
 *
 * **Hand-mirrored from `GenreWithCount` in
 * `backend/src/genres/genres.service.ts`, which is the source of truth.** Change
 * a field there and you must change it here. That is the known wart described in
 * CLAUDE.md; the fix is generating these from an OpenAPI spec the backend does
 * not expose yet.
 */

/** One card on the Genres tab (GEN-2), from `GET /api/genres/counts`. */
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

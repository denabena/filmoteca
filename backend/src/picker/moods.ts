import type { Prisma } from '@prisma/client';

/**
 * The six chips PIC-3 offers.
 *
 * **They are labels in the design and nothing more.** How each one shapes
 * selection is undesigned and needs product input; what follows is a working
 * interpretation, chosen to be explainable rather than clever, and every one of
 * them is a candidate for being told it is wrong.
 */
export const MOODS = [
  'something-light',
  'mind-bender',
  'edge-of-seat',
  'feel-good',
  'short-and-sweet',
  'critically-loved',
] as const;

export type Mood = (typeof MOODS)[number];

export function isMood(value: string): value is Mood {
  return (MOODS as readonly string[]).includes(value);
}

/** Genre slugs a mood leans on, where it leans on genre at all. */
const MOOD_GENRES: Partial<Record<Mood, string[]>> = {
  'edge-of-seat': ['thriller', 'horror'],
  'something-light': ['comedy', 'animation'],
  'feel-good': ['comedy', 'romance'],
  // A stand-in. The honest implementation is TMDB's `with_keywords` against a
  // hand-curated list, which the catalogue import does not fetch yet, so this
  // approximates "mind-bender" by the two genres that most often carry it.
  // Flagged in the tmdb-catalogue skill as still open.
  'mind-bender': ['mystery', 'sci-fi'],
};

/**
 * A minutes ceiling for "Short & sweet".
 *
 * 100 rather than 90 because for a series `runtime` is **per episode**, and a
 * ceiling tight enough to be meaningful for films would admit essentially every
 * series regardless.
 */
export const SHORT_RUNTIME_MINUTES = 100;

/** Floors for "Critically loved", above the import's own quality floor. */
export const ACCLAIM_VOTE_AVERAGE = 7.5;
export const ACCLAIM_VOTE_COUNT = 1000;

/**
 * Turns the selected chips into a candidate filter.
 *
 * Moods **narrow within their own dimension and stack across dimensions**: two
 * genre-flavoured moods widen the acceptable genres (OR), while a genre mood plus
 * a runtime mood must both hold (AND). Treating every chip as an AND would make
 * two chips return nothing on a catalogue this size, which is the wrong failure
 * for a feature whose whole promise is a suggestion.
 *
 * No moods selected means no filter, which is the acceptance criterion: picks
 * still come back, from the library and ratings alone.
 */
export function moodFilter(moods: Mood[]): Prisma.CatalogueTitleWhereInput {
  const clauses: Prisma.CatalogueTitleWhereInput[] = [];

  const genreSlugs = [
    ...new Set(moods.flatMap((mood) => MOOD_GENRES[mood] ?? [])),
  ];

  if (genreSlugs.length > 0) {
    clauses.push({ genre: { slug: { in: genreSlugs } } });
  }

  if (moods.includes('short-and-sweet')) {
    // A null runtime is excluded here rather than skipped at import: the row is
    // still a perfectly good candidate for every other mood.
    clauses.push({ runtime: { not: null, lte: SHORT_RUNTIME_MINUTES } });
  }

  if (moods.includes('critically-loved') || moods.includes('feel-good')) {
    clauses.push({
      voteAverage: {
        gte: moods.includes('critically-loved') ? ACCLAIM_VOTE_AVERAGE : 7,
      },
    });
  }

  if (moods.includes('critically-loved')) {
    clauses.push({ voteCount: { gte: ACCLAIM_VOTE_COUNT } });
  }

  return clauses.length > 0 ? { AND: clauses } : {};
}

/** How well a candidate matches the chips, 0 to 1. Feeds the match percentage. */
export function moodFit(
  moods: Mood[],
  candidate: {
    genreSlug: string;
    runtime: number | null;
    voteAverage: number;
    voteCount: number;
  },
): number {
  // No chips is not a bad match, it is no constraint, so it scores full marks
  // rather than dragging every percentage down for the user who picked none.
  if (moods.length === 0) return 1;

  const satisfied = moods.filter((mood) => {
    const genres = MOOD_GENRES[mood];
    if (genres) return genres.includes(candidate.genreSlug);

    if (mood === 'short-and-sweet') {
      return (
        candidate.runtime !== null && candidate.runtime <= SHORT_RUNTIME_MINUTES
      );
    }

    return (
      candidate.voteAverage >= ACCLAIM_VOTE_AVERAGE &&
      candidate.voteCount >= ACCLAIM_VOTE_COUNT
    );
  });

  return satisfied.length / moods.length;
}

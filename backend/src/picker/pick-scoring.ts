import type { Candidate } from './candidates.repository';
import { type Mood, moodFit } from './moods';

/**
 * What the scorer knows about a user, derived from their own titles.
 *
 * Taste is read from **behaviour, not settings**: the profile's `favoriteGenres`
 * is FIL-23 and does not exist yet, and a rating is a stronger signal than a
 * checkbox ticked once during onboarding anyway.
 */
export interface TasteProfile {
  /** Share of the user's rated titles per genre slug, 0 to 1. */
  genreAffinity: Map<string, number>;
  /** Their best-rated title per genre slug, for the reason line. */
  bestLoved: Map<string, { name: string; rating: number }>;
  ratedCount: number;
}

export interface ScoredCandidate {
  candidate: Candidate;
  matchPercent: number;
  reason: string;
}

/**
 * The floor and ceiling of the displayed percentage.
 *
 * The design shows "96% match", so the number has to read like a confident
 * recommendation rather than a probability. Nothing is ever shown below 60,
 * because a suggestion the app itself rates 12% is not worth making, and nothing
 * reaches 100, because that claims certainty the scoring does not have.
 */
export const MIN_MATCH = 60;
export const MAX_MATCH = 99;

/**
 * How the match percentage is computed.
 *
 * **Undesigned, so this is a decision and it is written down because "96% match"
 * invites the question.** Three weighted signals, each in 0 to 1:
 *
 * | Weight | Signal | Why |
 * |---|---|---|
 * | 0.45 | Genre affinity | Share of the user's rated titles in this genre. Their taste, measured. |
 * | 0.30 | Mood fit | Fraction of the selected chips this candidate satisfies. No chips scores 1. |
 * | 0.25 | Acclaim | TMDB vote average over 10. A weak signal about the user, a real one about the film. |
 *
 * Deterministic: the same user, moods and candidate always produce the same
 * number. Two candidates can tie, and generation breaks that by pool order.
 */
export function scoreCandidate(
  candidate: Candidate,
  taste: TasteProfile,
  moods: Mood[],
): number {
  const affinity = taste.genreAffinity.get(candidate.genre.slug) ?? 0;
  const fit = moodFit(moods, {
    genreSlug: candidate.genre.slug,
    runtime: candidate.runtime,
    voteAverage: candidate.voteAverage,
    voteCount: candidate.voteCount,
  });
  const acclaim = Math.min(candidate.voteAverage / 10, 1);

  const raw = affinity * 0.45 + fit * 0.3 + acclaim * 0.25;

  return Math.round(MIN_MATCH + raw * (MAX_MATCH - MIN_MATCH));
}

/**
 * The reason line under a pick card.
 *
 * FIL-65 requires it to reference **something real about the user's library**, so
 * every branch here names an actual title they rated or an actual count of what
 * they have watched. The order is strongest signal first: a specific title they
 * loved beats a genre tally, which beats a statement about the film itself.
 *
 * The last branch is the only one that says nothing about the user, and it is
 * reachable only when the candidate's genre is one they have never rated.
 */
export function buildReason(
  candidate: Candidate,
  taste: TasteProfile,
  moods: Mood[],
): string {
  const slug = candidate.genre.slug;
  const loved = taste.bestLoved.get(slug);
  const genreName = candidate.genre.name;

  if (loved) {
    // Ratings are stored in half-star units, so 9 reads as 4.5.
    const stars = loved.rating / 2;
    return `You rated ${loved.name} ${stars} out of 5, and this is ${genreName} too.`;
  }

  const affinity = taste.genreAffinity.get(slug) ?? 0;

  if (affinity > 0) {
    const share = Math.round(affinity * 100);
    return `${share}% of what you have rated is ${genreName}.`;
  }

  if (moods.length > 0) {
    return `A ${genreName} pick for the mood you chose, rated ${candidate.voteAverage.toFixed(1)} by ${candidate.voteCount.toLocaleString('en')} people.`;
  }

  return `${genreName} you have not tried yet, rated ${candidate.voteAverage.toFixed(1)} by ${candidate.voteCount.toLocaleString('en')} people.`;
}

/**
 * Builds the taste profile from the user's own rows.
 *
 * Only **rated** titles count towards affinity, for the same reason the Picker
 * gate counts only rated titles: adding something says you heard of it, rating it
 * says what you thought.
 */
export function buildTasteProfile(
  titles: { name: string; rating: number | null; genre: { slug: string } }[],
): TasteProfile {
  const rated = titles.filter(
    (title): title is (typeof titles)[number] & { rating: number } =>
      title.rating !== null,
  );

  const counts = new Map<string, number>();
  const bestLoved = new Map<string, { name: string; rating: number }>();

  for (const title of rated) {
    const slug = title.genre.slug;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);

    const best = bestLoved.get(slug);
    // Only titles they actually liked are quotable: "you rated this 1 star, so
    // here is more of the same" is not a recommendation.
    if (title.rating >= 6 && (!best || title.rating > best.rating)) {
      bestLoved.set(slug, { name: title.name, rating: title.rating });
    }
  }

  const genreAffinity = new Map<string, number>();
  for (const [slug, count] of counts) {
    genreAffinity.set(slug, count / rated.length);
  }

  return { genreAffinity, bestLoved, ratedCount: rated.length };
}

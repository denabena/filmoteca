import type { Candidate } from './candidates.repository';
import {
  MAX_MATCH,
  MIN_MATCH,
  buildReason,
  buildTasteProfile,
  scoreCandidate,
} from './pick-scoring';

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'candidate-uuid',
    tmdbId: 1,
    type: 'movie',
    name: 'Arrival',
    year: 2016,
    runtime: 116,
    genreId: 'genre-sci-fi',
    tmdbGenreIds: [878],
    overview: null,
    posterPath: null,
    voteAverage: 8,
    voteCount: 20000,
    syncedAt: new Date(),
    createdAt: new Date(),
    genre: {
      id: 'genre-sci-fi',
      slug: 'sci-fi',
      name: 'Sci-Fi',
      colorSlot: 1,
      descriptor: null,
      tmdbMovieId: 878,
      tmdbTvId: 10765,
    },
    ...overrides,
  };
}

describe('buildTasteProfile', () => {
  // Only rated titles count, for the same reason the Picker gate counts only
  // rated titles: adding says you heard of it, rating says what you thought.
  it('ignores unrated titles', () => {
    const taste = buildTasteProfile([
      { name: 'Arrival', rating: 9, genre: { slug: 'sci-fi' } },
      { name: 'Unwatched', rating: null, genre: { slug: 'comedy' } },
    ]);

    expect(taste.ratedCount).toBe(1);
    expect(taste.genreAffinity.get('sci-fi')).toBe(1);
    expect(taste.genreAffinity.has('comedy')).toBe(false);
  });

  it('measures affinity as a share of rated titles', () => {
    const taste = buildTasteProfile([
      { name: 'A', rating: 8, genre: { slug: 'sci-fi' } },
      { name: 'B', rating: 8, genre: { slug: 'sci-fi' } },
      { name: 'C', rating: 8, genre: { slug: 'crime' } },
      { name: 'D', rating: 8, genre: { slug: 'crime' } },
    ]);

    expect(taste.genreAffinity.get('sci-fi')).toBe(0.5);
  });

  it('remembers the best-rated title per genre', () => {
    const taste = buildTasteProfile([
      { name: 'Good', rating: 7, genre: { slug: 'sci-fi' } },
      { name: 'Better', rating: 10, genre: { slug: 'sci-fi' } },
    ]);

    expect(taste.bestLoved.get('sci-fi')).toEqual({
      name: 'Better',
      rating: 10,
    });
  });

  // "You rated this 1 star, so here is more of the same" is not a recommendation.
  it('will not quote a title the user disliked', () => {
    const taste = buildTasteProfile([
      { name: 'Hated it', rating: 2, genre: { slug: 'sci-fi' } },
    ]);

    expect(taste.bestLoved.has('sci-fi')).toBe(false);
    expect(taste.genreAffinity.get('sci-fi')).toBe(1);
  });
});

describe('scoreCandidate', () => {
  const empty = buildTasteProfile([]);

  it('stays inside the displayed range', () => {
    expect(scoreCandidate(candidate(), empty, [])).toBeGreaterThanOrEqual(
      MIN_MATCH,
    );
    expect(scoreCandidate(candidate(), empty, [])).toBeLessThanOrEqual(
      MAX_MATCH,
    );
  });

  it('scores a genre the user loves above one they have never rated', () => {
    const sciFiFan = buildTasteProfile([
      { name: 'Arrival', rating: 10, genre: { slug: 'sci-fi' } },
    ]);

    expect(scoreCandidate(candidate(), sciFiFan, [])).toBeGreaterThan(
      scoreCandidate(candidate(), empty, []),
    );
  });

  it('scores a matching mood above a missed one', () => {
    const matched = scoreCandidate(candidate({ runtime: 90 }), empty, [
      'short-and-sweet',
    ]);
    const missed = scoreCandidate(candidate({ runtime: 200 }), empty, [
      'short-and-sweet',
    ]);

    expect(matched).toBeGreaterThan(missed);
  });

  it('is deterministic', () => {
    const taste = buildTasteProfile([
      { name: 'Arrival', rating: 9, genre: { slug: 'sci-fi' } },
    ]);

    expect(scoreCandidate(candidate(), taste, ['critically-loved'])).toBe(
      scoreCandidate(candidate(), taste, ['critically-loved']),
    );
  });
});

describe('buildReason', () => {
  // FIL-65 requires the reason to reference something real about the library.
  it('quotes a title the user rated highly in the same genre', () => {
    const taste = buildTasteProfile([
      { name: 'Blade Runner 2049', rating: 9, genre: { slug: 'sci-fi' } },
    ]);

    expect(buildReason(candidate(), taste, [])).toBe(
      'You rated Blade Runner 2049 4.5 out of 5, and this is Sci-Fi too.',
    );
  });

  it('falls back to a genre share when nothing in it was loved', () => {
    const taste = buildTasteProfile([
      { name: 'Meh', rating: 4, genre: { slug: 'sci-fi' } },
      { name: 'Also meh', rating: 4, genre: { slug: 'crime' } },
    ]);

    expect(buildReason(candidate(), taste, [])).toBe(
      '50% of what you have rated is Sci-Fi.',
    );
  });

  it('names the mood when the genre is new to the user', () => {
    const taste = buildTasteProfile([
      { name: 'A', rating: 8, genre: { slug: 'crime' } },
    ]);

    expect(buildReason(candidate(), taste, ['critically-loved'])).toContain(
      'for the mood you chose',
    );
  });

  it('says the genre is untried when there is no other signal', () => {
    const taste = buildTasteProfile([
      { name: 'A', rating: 8, genre: { slug: 'crime' } },
    ]);

    expect(buildReason(candidate(), taste, [])).toContain(
      'you have not tried yet',
    );
  });
});

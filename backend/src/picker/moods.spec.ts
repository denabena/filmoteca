import { MOODS, isMood, moodFilter, moodFit } from './moods';

describe('isMood', () => {
  it.each(MOODS)('accepts %s', (mood) => expect(isMood(mood)).toBe(true));

  it.each(['', 'Something light', 'scary', 'SHORT-AND-SWEET'])(
    'rejects %p',
    (value) => expect(isMood(value)).toBe(false),
  );
});

describe('moodFilter', () => {
  // No chips must not become a filter that excludes everything: the acceptance
  // criterion is that picks still come back from library and ratings alone.
  it('is empty when nothing is selected', () => {
    expect(moodFilter([])).toEqual({});
  });

  it('widens the genre set across two genre moods rather than intersecting them', () => {
    const filter = moodFilter(['edge-of-seat', 'something-light']);

    expect(filter).toEqual({
      AND: [
        {
          genre: {
            slug: { in: ['thriller', 'horror', 'comedy', 'animation'] },
          },
        },
      ],
    });
  });

  it('stacks a genre mood and a runtime mood as separate conditions', () => {
    const filter = moodFilter(['edge-of-seat', 'short-and-sweet']);

    expect(filter.AND).toHaveLength(2);
  });

  it('excludes an unknown runtime from Short & sweet', () => {
    const filter = moodFilter(['short-and-sweet']);

    expect(filter.AND).toContainEqual({
      runtime: { not: null, lte: 100 },
    });
  });

  it('applies both acclaim floors for Critically loved', () => {
    const filter = moodFilter(['critically-loved']);

    expect(filter.AND).toContainEqual({ voteAverage: { gte: 7.5 } });
    expect(filter.AND).toContainEqual({ voteCount: { gte: 1000 } });
  });
});

describe('moodFit', () => {
  const candidate = {
    genreSlug: 'thriller',
    runtime: 95,
    voteAverage: 8,
    voteCount: 5000,
  };

  // No chips is no constraint, not a bad match, so it must not drag every
  // percentage down for the user who selected none.
  it('scores a full match when nothing was selected', () => {
    expect(moodFit([], candidate)).toBe(1);
  });

  it('scores the fraction of chips satisfied', () => {
    // Thriller satisfies edge-of-seat; comedy-flavoured something-light does not.
    expect(moodFit(['edge-of-seat', 'something-light'], candidate)).toBe(0.5);
  });

  it('scores zero when nothing matches', () => {
    expect(moodFit(['something-light'], candidate)).toBe(0);
  });

  it('counts an unknown runtime as failing Short & sweet', () => {
    expect(moodFit(['short-and-sweet'], { ...candidate, runtime: null })).toBe(
      0,
    );
  });
});

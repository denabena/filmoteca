import { BadRequestException } from '@nestjs/common';
import { parseTitlePayload } from './title-payload';

/**
 * EDT-3 says every Add title rule applies to Edit, so the rules live in one
 * function and this file is where they are pinned down. Both controllers'
 * specs then assert only that they call it, rather than each re-testing the
 * whole rule set and drifting apart the way the rules themselves would.
 */
describe('parseTitlePayload', () => {
  const valid = {
    name: 'Dune: Part Two',
    type: 'movie',
    status: 'want_to_watch',
    genreId: 'genre-uuid',
  };

  it('normalises a minimal valid payload', () => {
    expect(parseTitlePayload(valid)).toEqual({
      name: 'Dune: Part Two',
      type: 'movie',
      status: 'want_to_watch',
      genreId: 'genre-uuid',
      watchDate: null,
      rating: null,
      note: null,
      favorite: false,
    });
  });

  it('trims the name rather than storing the padding', () => {
    expect(parseTitlePayload({ ...valid, name: '  Arrival  ' }).name).toBe(
      'Arrival',
    );
  });

  // ADD-6. The response names the fields so the form can mark the inputs
  // (FIL-59) instead of showing one banner.
  it.each([
    ['name', { ...valid, name: '   ' }],
    ['type', { ...valid, type: 'film' }],
    ['status', { ...valid, status: 'someday' }],
    ['genreId', { ...valid, genreId: '' }],
  ])('rejects a bad %s and names the field', (field, body) => {
    expect(() => parseTitlePayload(body)).toThrow(BadRequestException);

    try {
      parseTitlePayload(body);
    } catch (error) {
      const response = (error as BadRequestException).getResponse();
      expect((response as { fields: string[] }).fields).toContain(field);
    }
  });

  it('names every missing required field at once, not just the first', () => {
    try {
      parseTitlePayload({});
      throw new Error('expected a BadRequestException');
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as {
        fields: string[];
      };
      expect(response.fields).toEqual(['name', 'type', 'status', 'genreId']);
    }
  });

  // A21: half-star units, 0 to 10, so "4.5 / 5" stores as 9.
  it.each([-1, 11, 4.5, 'four'])('rejects a rating of %p', (rating) => {
    expect(() => parseTitlePayload({ ...valid, rating })).toThrow(
      BadRequestException,
    );
  });

  it.each([0, 1, 9, 10])('accepts a rating of %p', (rating) => {
    expect(parseTitlePayload({ ...valid, rating }).rating).toBe(rating);
  });

  // A20 ties neither watch date nor rating to status, so a want-to-watch title
  // may carry both and a watched one neither.
  it('accepts a watch date and rating whatever the status', () => {
    expect(
      parseTitlePayload({
        ...valid,
        status: 'want_to_watch',
        watchDate: '2026-10-12',
        rating: 9,
      }),
    ).toMatchObject({
      watchDate: new Date('2026-10-12T00:00:00.000Z'),
      rating: 9,
    });
  });

  it('normalises every cleared optional to null rather than an empty value', () => {
    expect(
      parseTitlePayload({
        ...valid,
        note: '   ',
        watchDate: '',
        rating: null,
      }),
    ).toMatchObject({ note: null, watchDate: null, rating: null });
  });

  /*
   * FIL-54 and FIL-55 both say the added date is the server's and cannot be
   * supplied. There is no branch here that reads one, so this holds for any
   * spelling a caller invents rather than for a list of blocked keys.
   */
  it('never passes through a caller-supplied timestamp or id', () => {
    const parsed = parseTitlePayload({
      ...valid,
      createdAt: '1999-01-01T00:00:00.000Z',
      updatedAt: '1999-01-01T00:00:00.000Z',
      id: 'chosen-by-the-caller',
      userId: 'someone-else',
    } as Record<string, unknown>);

    expect(Object.keys(parsed).sort()).toEqual([
      'favorite',
      'genreId',
      'name',
      'note',
      'rating',
      'status',
      'type',
      'watchDate',
    ]);
  });

  it('treats favorite as a strict boolean rather than anything truthy', () => {
    expect(parseTitlePayload({ ...valid, favorite: true }).favorite).toBe(true);
    expect(parseTitlePayload({ ...valid, favorite: 'yes' }).favorite).toBe(
      false,
    );
  });
});

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { TitleStatus } from '@prisma/client';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { TitlesController } from './titles.controller';
import { TitlesRepository } from './titles.repository';

const user: NeonAuthUser = {
  id: 'neon-user-123',
  claims: { sub: 'neon-user-123' },
};

/**
 * FIL-41: "the three accepted values are exactly watched, watching and want to
 * watch". Spelt out here rather than imported so the test states the contract
 * instead of restating whatever the controller happens to allow.
 */
const STATUSES: TitleStatus[] = ['watched', 'watching', 'want_to_watch'];

describe('TitlesController', () => {
  const create = jest.fn();
  const findByIdOrThrow = jest.fn();
  const findManyWithGenre = jest.fn();

  let controller: TitlesController;

  const valid = {
    name: 'Dune: Part Two',
    type: 'movie',
    status: 'want_to_watch',
    genreId: 'genre-uuid',
  };

  beforeEach(async () => {
    create.mockReset().mockResolvedValue({});
    findByIdOrThrow.mockReset().mockResolvedValue({});
    findManyWithGenre.mockReset().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TitlesController],
      providers: [
        {
          provide: TitlesRepository,
          useValue: { create, findByIdOrThrow, findManyWithGenre },
        },
      ],
    })
      // The guard reads config on first use, and these tests call the handlers
      // directly rather than over HTTP, so it never runs. Overriding stops Nest
      // constructing it, which would otherwise need the whole ConfigModule.
      .overrideGuard(NeonAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(TitlesController);
  });

  it('reads a title scoped to the caller', async () => {
    await controller.getTitle(user, 'title-uuid');

    expect(findByIdOrThrow).toHaveBeenCalledWith('neon-user-123', 'title-uuid');
  });

  it('creates a title owned by the caller', async () => {
    await controller.createTitle(user, valid);

    expect(create).toHaveBeenCalledWith(
      'neon-user-123',
      expect.objectContaining({
        name: 'Dune: Part Two',
        status: 'want_to_watch',
      }),
    );
  });

  // ADD-6: name, type, genre and status are required, and the response names
  // which ones failed so the form can mark the fields rather than show a banner.
  it.each([
    ['name', { ...valid, name: '  ' }],
    ['type', { ...valid, type: 'film' }],
    ['status', { ...valid, status: 'someday' }],
    ['genreId', { ...valid, genreId: '' }],
  ])('rejects a bad %s and names the field', async (field, body) => {
    await expect(controller.createTitle(user, body)).rejects.toThrow(
      BadRequestException,
    );

    await controller
      .createTitle(user, body)
      .catch((error: BadRequestException) =>
        expect((error.getResponse() as { fields: string[] }).fields).toContain(
          field,
        ),
      );
    expect(create).not.toHaveBeenCalled();
  });

  // A20 ties none of these to the status, so a want-to-watch title may carry a
  // date and a rating and a watched one may carry neither.
  it('accepts a watch date and rating regardless of status', async () => {
    await controller.createTitle(user, {
      ...valid,
      status: 'want_to_watch',
      watchDate: '2026-10-12',
      rating: 9,
    });

    expect(create).toHaveBeenCalledWith(
      'neon-user-123',
      expect.objectContaining({
        rating: 9,
        watchDate: new Date('2026-10-12T00:00:00.000Z'),
      }),
    );
  });

  it('leaves optional fields null rather than empty strings', async () => {
    await controller.createTitle(user, { ...valid, note: '   ' });

    expect(create).toHaveBeenCalledWith(
      'neon-user-123',
      expect.objectContaining({ note: null, watchDate: null, rating: null }),
    );
  });

  // A21: half stars are stored as whole units of a half, 0 to 10.
  it.each([-1, 11, 4.5])('rejects a rating of %p', async (rating) => {
    await expect(
      controller.createTitle(user, { ...valid, rating }),
    ).rejects.toThrow(BadRequestException);
  });

  // FIL-41. These assert the query the controller builds rather than the rows a
  // database would return, for the same reason TitlesRepository's tests do: CI
  // runs with no `backend/.env` and so no Neon connection.
  describe('listing the library (FIL-41)', () => {
    interface ScopedQuery {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
    }

    /** The one `where`/`orderBy` pair the controller handed the repository. */
    function lastQuery(): ScopedQuery {
      const calls = findManyWithGenre.mock.calls as [string, ScopedQuery][];
      return calls[calls.length - 1][1];
    }

    it('defaults to the whole library, newest added first', async () => {
      await controller.listTitles(user, {});

      expect(findManyWithGenre).toHaveBeenCalledWith('neon-user-123', {
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('searches by name, case-insensitively', async () => {
      await controller.listTitles(user, { search: 'dune' });

      expect(lastQuery().where).toEqual({
        name: { contains: 'dune', mode: 'insensitive' },
      });
    });

    it('ignores a search term that is only whitespace', async () => {
      await controller.listTitles(user, { search: '   ' });

      expect(lastQuery().where).toEqual({});
    });

    it.each(STATUSES)('filters by the %s status', async (status) => {
      await controller.listTitles(user, { status });

      expect(lastQuery().where).toEqual({ status });
    });

    it('narrows by search and status together', async () => {
      await controller.listTitles(user, { search: 'dune', status: 'watched' });

      expect(lastQuery().where).toEqual({
        name: { contains: 'dune', mode: 'insensitive' },
        status: 'watched',
      });
    });

    it('reverses to oldest added first', async () => {
      await controller.listTitles(user, { sort: 'oldest' });

      expect(lastQuery().orderBy).toEqual({ createdAt: 'asc' });
    });

    it('sorts newest first when asked for recent explicitly', async () => {
      await controller.listTitles(user, { sort: 'recent' });

      expect(lastQuery().orderBy).toEqual({ createdAt: 'desc' });
    });

    it('returns an empty list rather than erroring when nothing matches', async () => {
      findManyWithGenre.mockResolvedValue([]);

      await expect(
        controller.listTitles(user, { search: 'no such film' }),
      ).resolves.toEqual([]);
    });

    // Silently ignoring these would hand back the full library under a filter
    // label, which reads as a bug in the table rather than in the caller.
    it.each([
      ['status', { status: 'someday' }],
      ['sort', { sort: 'rating' }],
    ])('rejects an unknown %s', async (field, query) => {
      await expect(controller.listTitles(user, query)).rejects.toThrow(
        BadRequestException,
      );

      expect(findManyWithGenre).not.toHaveBeenCalled();
    });

    it('serialises exactly what a row displays, and nothing else', async () => {
      findManyWithGenre.mockResolvedValue([
        {
          id: 'title-uuid',
          userId: 'neon-user-123',
          name: 'Dune: Part Two',
          type: 'movie',
          status: 'watched',
          rating: 9,
          favorite: true,
          year: 2024,
          note: 'private',
          runtime: 166,
          director: 'Denis Villeneuve',
          posterPath: '/poster.jpg',
          watchDate: new Date('2026-10-12'),
          genreId: 'genre-uuid',
          genre: {
            id: 'genre-uuid',
            slug: 'sci-fi',
            name: 'Sci-Fi',
            colorSlot: 4,
            descriptor: null,
            tmdbMovieId: 878,
            tmdbTvId: null,
          },
          createdAt: new Date('2026-09-28'),
          updatedAt: new Date('2026-09-28'),
        },
      ]);

      await expect(controller.listTitles(user, {})).resolves.toEqual([
        {
          id: 'title-uuid',
          name: 'Dune: Part Two',
          year: 2024,
          type: 'movie',
          genre: {
            id: 'genre-uuid',
            slug: 'sci-fi',
            name: 'Sci-Fi',
            colorSlot: 4,
          },
          status: 'watched',
          rating: 9,
          favorite: true,
        },
      ]);
    });
  });
});

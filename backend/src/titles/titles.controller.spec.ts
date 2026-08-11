import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { TitlesController } from './titles.controller';
import { TitlesRepository } from './titles.repository';

const user: NeonAuthUser = {
  id: 'neon-user-123',
  claims: { sub: 'neon-user-123' },
};

describe('TitlesController', () => {
  const create = jest.fn();
  const findByIdOrThrow = jest.fn();

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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TitlesController],
      providers: [
        { provide: TitlesRepository, useValue: { create, findByIdOrThrow } },
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
});

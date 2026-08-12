import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Title } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TitlesRepository } from './titles.repository';

/**
 * These assert the **shape of the query** rather than the contents of a database.
 *
 * CI runs with no `backend/.env` and therefore no Neon connection, so a test that
 * really wrote two users' rows and read them back could not run there. What
 * matters for FIL-14 is that the owner is present in every query and cannot be
 * displaced by a caller, and that is exactly what a query-shape assertion proves.
 * If this file ever gains a real database, keep these anyway: they fail faster and
 * they name the rule.
 */
describe('TitlesRepository', () => {
  const OWNER = 'neon-user-owner';
  const INTRUDER = 'neon-user-intruder';

  const create = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const count = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();

  let titles: TitlesRepository;

  const stored = { id: 'title-uuid', userId: OWNER } as Title;

  beforeEach(async () => {
    [create, findMany, findFirst, count, update, remove].forEach((m) =>
      m.mockReset(),
    );
    create.mockResolvedValue(stored);
    findMany.mockResolvedValue([stored]);
    findFirst.mockResolvedValue(stored);
    update.mockResolvedValue(stored);
    remove.mockResolvedValue(stored);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TitlesRepository,
        {
          provide: PrismaService,
          useValue: {
            title: {
              create,
              findMany,
              findFirst,
              count,
              update,
              delete: remove,
            },
          },
        },
      ],
    }).compile();

    titles = module.get(TitlesRepository);
  });

  describe('ownership on write', () => {
    it('stamps the owner onto a created title', async () => {
      await titles.create(OWNER, {
        name: 'Dune: Part Two',
        type: 'movie',
        status: 'want_to_watch',
        genreId: 'genre-uuid',
      });

      expect(create).toHaveBeenCalledWith({
        data: {
          name: 'Dune: Part Two',
          type: 'movie',
          status: 'want_to_watch',
          genreId: 'genre-uuid',
          userId: OWNER,
        },
      });
    });
  });

  describe('ownership on read', () => {
    it('scopes a list to the owner', async () => {
      await titles.findMany(OWNER, { orderBy: { createdAt: 'desc' } });

      expect(findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        where: { userId: OWNER },
      });
    });

    it('merges the owner into a caller filter without dropping it', async () => {
      await titles.findMany(OWNER, { where: { status: 'watching' } });

      expect(findMany).toHaveBeenCalledWith({
        where: { status: 'watching', userId: OWNER },
      });
    });

    // The rule the whole class exists for. `userId` is spread after the caller's
    // `where` precisely so this cannot succeed; swap the spread order and only
    // this test fails.
    it('refuses to let a caller substitute another owner', async () => {
      await titles.findMany(OWNER, {
        where: { userId: INTRUDER },
      });

      expect(findMany).toHaveBeenCalledWith({ where: { userId: OWNER } });
    });

    // FIL-41's list reads through this, so the owner has to survive the include.
    it('scopes a genre-joined list to the owner', async () => {
      await titles.findManyWithGenre(OWNER, {
        where: { status: 'watched' },
        orderBy: { createdAt: 'desc' },
      });

      expect(findMany).toHaveBeenCalledWith({
        where: { status: 'watched', userId: OWNER },
        orderBy: { createdAt: 'desc' },
        include: { genre: true },
      });
    });

    it('refuses to let a caller substitute another owner on the joined list', async () => {
      await titles.findManyWithGenre(OWNER, { where: { userId: INTRUDER } });

      expect(findMany).toHaveBeenCalledWith({
        where: { userId: OWNER },
        include: { genre: true },
      });
    });

    it('scopes a single read by id and owner together', async () => {
      await titles.findById(OWNER, 'title-uuid');

      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 'title-uuid', userId: OWNER },
      });
    });

    it('scopes a count to the owner', async () => {
      await titles.count(OWNER, { status: 'watched' });

      expect(count).toHaveBeenCalledWith({
        where: { status: 'watched', userId: OWNER },
      });
    });
  });

  describe("another user's row", () => {
    beforeEach(() => {
      // Nothing matches for the intruder: the row exists, but not for them.
      findFirst.mockResolvedValue(null);
      count.mockResolvedValue(0);
    });

    it('reads as absent rather than forbidden', async () => {
      await expect(titles.findById(INTRUDER, 'title-uuid')).resolves.toBeNull();
    });

    it('throws 404, not 403, on a required read', async () => {
      await expect(
        titles.findByIdOrThrow(INTRUDER, 'title-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('cannot be updated, and no update is attempted', async () => {
      await expect(
        titles.update(INTRUDER, 'title-uuid', { name: 'renamed' }),
      ).rejects.toThrow(NotFoundException);

      expect(update).not.toHaveBeenCalled();
    });

    it('cannot be deleted, and no delete is attempted', async () => {
      await expect(titles.delete(INTRUDER, 'title-uuid')).rejects.toThrow(
        NotFoundException,
      );

      expect(remove).not.toHaveBeenCalled();
    });
  });

  describe("the owner's own row", () => {
    beforeEach(() => {
      count.mockResolvedValue(1);
    });

    it('updates after the ownership check passes', async () => {
      await titles.update(OWNER, 'title-uuid', { name: 'renamed' });

      expect(count).toHaveBeenCalledWith({
        where: { id: 'title-uuid', userId: OWNER },
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'title-uuid' },
        data: { name: 'renamed' },
      });
    });

    it('deletes after the ownership check passes', async () => {
      await titles.delete(OWNER, 'title-uuid');

      expect(remove).toHaveBeenCalledWith({ where: { id: 'title-uuid' } });
    });

    it('returns the row from a required read', async () => {
      await expect(titles.findByIdOrThrow(OWNER, 'title-uuid')).resolves.toBe(
        stored,
      );
    });
  });
});

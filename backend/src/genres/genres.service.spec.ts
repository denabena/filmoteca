import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TitlesRepository } from '../titles/titles.repository';
import { GenresService } from './genres.service';

/**
 * The whole point of FIL-43 is that nothing is stored, so these tests are about
 * what the derivation does with a given set of title counts. CI has no database,
 * so the counts arrive from a stubbed repository rather than from real rows; what
 * that costs is the SQL, and what it buys is that every criterion below runs.
 */
describe('GenresService', () => {
  const USER = 'neon-user-123';

  /** The four of the twelve these tests care about, in the order Prisma returns. */
  const GENRES = [
    {
      id: 'g-comedy',
      slug: 'comedy',
      name: 'Comedy',
      colorSlot: 2,
      descriptor: null,
    },
    {
      id: 'g-drama',
      slug: 'drama',
      name: 'Drama',
      colorSlot: 5,
      descriptor: null,
    },
    {
      id: 'g-horror',
      slug: 'horror',
      name: 'Horror',
      colorSlot: 7,
      descriptor: null,
    },
    {
      id: 'g-scifi',
      slug: 'sci-fi',
      name: 'Sci-Fi',
      colorSlot: 4,
      descriptor: null,
    },
  ];

  const findMany = jest.fn();
  const countByGenre = jest.fn();

  let genres: GenresService;

  beforeEach(async () => {
    findMany.mockReset().mockResolvedValue(GENRES);
    countByGenre.mockReset().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenresService,
        { provide: PrismaService, useValue: { genre: { findMany } } },
        { provide: TitlesRepository, useValue: { countByGenre } },
      ],
    }).compile();

    genres = module.get(GenresService);
  });

  it('counts only the caller’s titles', async () => {
    await genres.listWithCounts(USER);

    expect(countByGenre).toHaveBeenCalledWith(USER);
  });

  it('returns one entry per genre that has at least one title', async () => {
    countByGenre.mockResolvedValue([
      { genreId: 'g-drama', count: 4 },
      { genreId: 'g-scifi', count: 2 },
    ]);

    const result = await genres.listWithCounts(USER);

    expect(result.map((genre) => genre.name)).toEqual(['Drama', 'Sci-Fi']);
    expect(result.map((genre) => genre.titleCount)).toEqual([4, 2]);
  });

  it('omits a genre with no titles entirely', async () => {
    countByGenre.mockResolvedValue([{ genreId: 'g-drama', count: 1 }]);

    const result = await genres.listWithCounts(USER);

    expect(result.some((genre) => genre.name === 'Comedy')).toBe(false);
  });

  it('serialises the name, the count and the palette slot', async () => {
    countByGenre.mockResolvedValue([{ genreId: 'g-scifi', count: 3 }]);

    await expect(genres.listWithCounts(USER)).resolves.toEqual([
      {
        id: 'g-scifi',
        slug: 'sci-fi',
        name: 'Sci-Fi',
        colorSlot: 4,
        descriptor: null,
        titleCount: 3,
      },
    ]);
  });

  // The three cases FIL-43 names explicitly.
  describe('the cases the ticket calls out', () => {
    it('returns nothing at all for an empty library', async () => {
      countByGenre.mockResolvedValue([]);

      await expect(genres.listWithCounts(USER)).resolves.toEqual([]);
    });

    it('returns exactly one card for a single-genre library', async () => {
      countByGenre.mockResolvedValue([{ genreId: 'g-horror', count: 6 }]);

      const result = await genres.listWithCounts(USER);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: 'Horror', titleCount: 6 });
    });

    /*
     * Deleting the last title in a genre removes its group from the count query
     * rather than leaving a zero behind, so the card disappears with no
     * invalidation anywhere. Modelled as two reads either side of the delete.
     */
    it('drops a genre once its last title is deleted', async () => {
      countByGenre.mockResolvedValueOnce([
        { genreId: 'g-drama', count: 2 },
        { genreId: 'g-horror', count: 1 },
      ]);
      const before = await genres.listWithCounts(USER);

      countByGenre.mockResolvedValueOnce([{ genreId: 'g-drama', count: 2 }]);
      const after = await genres.listWithCounts(USER);

      expect(before.map((genre) => genre.name)).toEqual(['Drama', 'Horror']);
      expect(after.map((genre) => genre.name)).toEqual(['Drama']);
    });

    it('moves the count when a title changes genre', async () => {
      countByGenre.mockResolvedValueOnce([
        { genreId: 'g-drama', count: 2 },
        { genreId: 'g-scifi', count: 1 },
      ]);
      const before = await genres.listWithCounts(USER);

      countByGenre.mockResolvedValueOnce([
        { genreId: 'g-drama', count: 1 },
        { genreId: 'g-scifi', count: 2 },
      ]);
      const after = await genres.listWithCounts(USER);

      expect(before.map((genre) => genre.titleCount)).toEqual([2, 1]);
      expect(after.map((genre) => genre.titleCount)).toEqual([1, 2]);
    });
  });

  // Settings shows "N genres", and N is the length of this list rather than a
  // separate count, so the two screens cannot disagree.
  it('has as many entries as the Settings summary line counts', async () => {
    countByGenre.mockResolvedValue([
      { genreId: 'g-comedy', count: 1 },
      { genreId: 'g-drama', count: 9 },
      { genreId: 'g-horror', count: 3 },
    ]);

    await expect(genres.listWithCounts(USER)).resolves.toHaveLength(3);
  });
});

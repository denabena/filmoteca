import { Test, TestingModule } from '@nestjs/testing';
import type { Genre } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CatalogueImportService,
  normaliseDiscoverResult,
  parseRuntime,
  parseYear,
} from './catalogue-import.service';
import type { DiscoverPage, TmdbClient, TmdbDetail } from './tmdb.client';

/** Just enough of Prisma's upsert argument to assert on, without pulling in its generics. */
interface UpsertArgs {
  where: { type_tmdbId_genreId: Record<string, unknown> };
  create: { name: string; genreId: string; runtime: number | null };
  update: { name: string; genreId: string; runtime: number | null };
}

function genre(overrides: Partial<Genre> = {}): Genre {
  return {
    id: 'genre-sci-fi',
    slug: 'sci-fi',
    name: 'Sci-Fi',
    colorSlot: 1,
    descriptor: null,
    tmdbMovieId: 878,
    tmdbTvId: 10765,
    ...overrides,
  };
}

describe('parseYear', () => {
  it.each([
    ['2024-03-01', 2024],
    ['1999-12-31', 1999],
  ])('reads the year out of %p', (date, expected) => {
    expect(parseYear(date)).toBe(expected);
  });

  // The trap: TMDB returns "" rather than omitting the field, and both
  // `new Date('')` and `Number('')` would quietly produce a nonsense year.
  it.each([
    ['', undefined],
    [undefined, undefined],
    ['not-a-date', undefined],
  ])('returns null for %p', (date) => {
    expect(parseYear(date)).toBeNull();
  });
});

describe('parseRuntime', () => {
  it('takes a film runtime directly', () => {
    expect(parseRuntime({ id: 1, runtime: 166 })).toBe(166);
  });

  // Series report per episode, not a total, which is the documented choice.
  it('takes the first per-episode runtime for a series', () => {
    expect(parseRuntime({ id: 1, episode_run_time: [25, 30] })).toBe(25);
  });

  it.each([
    ['a missing detail response', null],
    ['a null runtime', { id: 1, runtime: null }],
    ['a zero runtime', { id: 1, runtime: 0 }],
    ['an empty episode array', { id: 1, episode_run_time: [] }],
  ])('returns null for %s', (_label, detail) => {
    expect(parseRuntime(detail as TmdbDetail | null)).toBeNull();
  });
});

describe('normaliseDiscoverResult', () => {
  it('reads the movie field spellings', () => {
    const row = normaliseDiscoverResult(
      {
        id: 693134,
        title: 'Dune: Part Two',
        release_date: '2024-02-27',
        genre_ids: [878, 12],
        vote_average: 8.2,
        vote_count: 6000,
        poster_path: '/dune.jpg',
      },
      'movie',
      genre(),
    );

    expect(row).toEqual({
      tmdbId: 693134,
      type: 'movie',
      name: 'Dune: Part Two',
      year: 2024,
      genreId: 'genre-sci-fi',
      tmdbGenreIds: [878, 12],
      overview: null,
      posterPath: '/dune.jpg',
      voteAverage: 8.2,
      voteCount: 6000,
    });
  });

  it('reads the series field spellings', () => {
    const row = normaliseDiscoverResult(
      { id: 95396, name: 'Severance', first_air_date: '2022-02-17' },
      'series',
      genre(),
    );

    expect(row).toMatchObject({
      name: 'Severance',
      year: 2022,
      type: 'series',
    });
  });

  // The genre is assigned by which query returned the row, never read from the
  // response: TMDB returns several genres per title and A19 fixes us at one, so
  // reading it back would need a precedence rule nobody has designed.
  it('takes the genre from the query, not from the response', () => {
    const row = normaliseDiscoverResult(
      { id: 1, title: 'Multi-genre film', genre_ids: [28, 12, 878] },
      'movie',
      genre({ id: 'genre-crime', slug: 'crime', name: 'Crime' }),
    );

    expect(row).toMatchObject({
      genreId: 'genre-crime',
      tmdbGenreIds: [28, 12, 878],
    });
  });

  it.each([
    ['a missing name', { id: 1 }],
    ['an empty name', { id: 1, title: '' }],
    ['a whitespace-only name', { id: 1, title: '   ' }],
  ])('skips %s rather than half-importing it', (_label, result) => {
    expect(normaliseDiscoverResult(result, 'movie', genre())).toEqual({
      skip: 'no-name',
    });
  });
});

describe('CatalogueImportService', () => {
  const findManyGenres = jest.fn();
  const findUnique = jest.fn();
  const upsert = jest.fn<Promise<unknown>, [UpsertArgs]>();

  // Held as their own variables rather than read back off the client object, so
  // assertions do not detach a method from its receiver.
  const discover = jest.fn<Promise<DiscoverPage>, [string, number, number]>();
  const detail = jest.fn<Promise<TmdbDetail | null>, [string, number]>();
  const tmdb: TmdbClient = { discover, detail };

  let service: CatalogueImportService;

  const page = (results: DiscoverPage['results']): DiscoverPage => ({
    page: 1,
    total_pages: 1,
    results,
  });

  beforeEach(async () => {
    findManyGenres.mockReset().mockResolvedValue([genre()]);
    findUnique.mockReset().mockResolvedValue(null);
    upsert.mockReset().mockResolvedValue({});
    discover.mockReset().mockResolvedValue(page([]));
    detail.mockReset().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogueImportService,
        {
          provide: PrismaService,
          useValue: {
            genre: { findMany: findManyGenres },
            catalogueTitle: { findUnique, upsert },
          },
        },
      ],
    }).compile();

    service = module.get(CatalogueImportService);
  });

  it('queries movies and series separately, with each vocabulary id', async () => {
    await service.import(tmdb, 1);

    expect(discover).toHaveBeenCalledWith('movie', 878, 1);
    expect(discover).toHaveBeenCalledWith('tv', 10765, 1);
  });

  // Thriller, Romance, Horror and Fantasy have no TV genre at all, so those
  // queries must not be attempted with a null id.
  it('does not query series for a genre TV has no equivalent for', async () => {
    findManyGenres.mockResolvedValue([
      genre({
        slug: 'horror',
        name: 'Horror',
        tmdbMovieId: 27,
        tmdbTvId: null,
      }),
    ]);

    await service.import(tmdb, 1);

    expect(discover).toHaveBeenCalledWith('movie', 27, 1);
    expect(discover).toHaveBeenCalledTimes(1);
  });

  it('counts a skipped row and never writes it', async () => {
    discover.mockResolvedValue(page([{ id: 1, genre_ids: [9999] }]));

    const report = await service.import(tmdb, 1);

    expect(report.skipped['no-name']).toBe(2); // once per type
    expect(report.imported).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
  });

  // "reported at the end rather than silently dropped"
  it('reports the TMDB genre ids seen on skipped rows', async () => {
    discover.mockResolvedValue(page([{ id: 1, genre_ids: [9999, 8888] }]));

    const report = await service.import(tmdb, 1);

    expect(report.unmappedGenreIds).toEqual([9999, 8888]);
  });

  it('attaches the runtime from the second pass', async () => {
    discover.mockResolvedValue(page([{ id: 693134, title: 'Dune: Part Two' }]));
    detail.mockResolvedValue({ id: 693134, runtime: 166 });

    await service.import(tmdb, 1);

    const [created] = upsert.mock.calls.map(([args]) => args.create);
    expect(created.name).toBe('Dune: Part Two');
    expect(created.runtime).toBe(166);
  });

  it('keys on type, tmdb id and genre together', async () => {
    discover.mockResolvedValue(page([{ id: 1399, title: 'Shared id' }]));

    await service.import(tmdb, 1);

    // Separate id spaces, so movie 1399 and series 1399 are different rows.
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type_tmdbId_genreId: {
            type: 'movie',
            tmdbId: 1399,
            genreId: 'genre-sci-fi',
          },
        },
      }),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type_tmdbId_genreId: {
            type: 'series',
            tmdbId: 1399,
            genreId: 'genre-sci-fi',
          },
        },
      }),
    );
  });

  describe('re-running', () => {
    it('updates an existing row rather than ignoring it', async () => {
      findUnique.mockResolvedValue({ id: 'existing-uuid' });
      discover.mockResolvedValue(page([{ id: 1, title: 'Already here' }]));

      const report = await service.import(tmdb, 1);

      expect(report.updated).toBe(2);
      expect(report.imported).toBe(0);

      // The update carries the genre, which is what makes a re-mapping take
      // effect rather than leaving a stale row in place.
      const updated = upsert.mock.calls.map(([args]) => args.update.genreId);
      expect(updated).toEqual(['genre-sci-fi', 'genre-sci-fi']);
    });

    it('counts a first-time row as imported, not updated', async () => {
      findUnique.mockResolvedValue(null);
      discover.mockResolvedValue(page([{ id: 1, title: 'Brand new' }]));

      const report = await service.import(tmdb, 1);

      expect(report.imported).toBe(2);
      expect(report.updated).toBe(0);
    });

    // The bug this key shape exists to prevent. Keying on (type, tmdbId) alone,
    // Sci-Fi overwrote Action because genres are iterated alphabetically, and a
    // real 724-row run left Action holding one movie.
    it('files a cross-genre title under every genre that found it', async () => {
      findManyGenres.mockResolvedValue([
        genre({
          id: 'genre-action',
          slug: 'action',
          name: 'Action',
          tmdbMovieId: 28,
          tmdbTvId: null,
        }),
        genre(),
      ]);
      discover.mockResolvedValue(
        page([{ id: 693134, title: 'Dune: Part Two' }]),
      );

      const report = await service.import(tmdb, 1);

      // Action/movie, Sci-Fi/movie and Sci-Fi/series are three distinct rows,
      // and none of them overwrites another.
      expect(report.imported).toBe(3);
      expect(report.updated).toBe(0);

      const genreIds = upsert.mock.calls.map(([args]) => args.create.genreId);
      expect(genreIds).toEqual([
        'genre-action',
        'genre-sci-fi',
        'genre-sci-fi',
      ]);
    });

    it('reports how many titles span more than one genre', async () => {
      findManyGenres.mockResolvedValue([
        genre({
          id: 'genre-action',
          slug: 'action',
          name: 'Action',
          tmdbMovieId: 28,
          tmdbTvId: null,
        }),
        genre({ tmdbTvId: null }),
      ]);
      discover.mockResolvedValue(
        page([{ id: 693134, title: 'Dune: Part Two' }]),
      );

      const report = await service.import(tmdb, 1);

      // One title, found by both movie queries.
      expect(report.multiGenreTitles).toBe(1);
    });
  });

  it('stops early when TMDB runs out of pages', async () => {
    discover.mockResolvedValue({ page: 1, total_pages: 1, results: [] });

    await service.import(tmdb, 10);

    // Ten pages requested, one available, per type.
    expect(discover).toHaveBeenCalledTimes(2);
  });
});

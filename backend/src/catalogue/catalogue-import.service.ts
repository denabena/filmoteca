import { Injectable, Logger } from '@nestjs/common';
import type { Genre, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { TmdbClient, TmdbDetail, TmdbDiscoverResult } from './tmdb.client';

/** Why a candidate did not make it into the table. */
export type SkipReason = 'no-name' | 'unmapped-genre';

export interface ImportReport {
  /** Rows that did not exist before this run. */
  imported: number;
  /** Rows that already existed from an earlier run and were refreshed. */
  updated: number;
  /**
   * Distinct titles that ended up filed under more than one genre.
   *
   * Not a problem to fix, just a number worth seeing: it says how much of the
   * catalogue is genuinely cross-genre, and it was the measurement that exposed
   * the original key being wrong.
   */
  multiGenreTitles: number;
  skipped: Record<SkipReason, number>;
  /** TMDB genre ids seen on skipped rows, so an unmapped value is never silent. */
  unmappedGenreIds: number[];
  durationMs: number;
}

/** A candidate normalised into the shape the table stores. */
export interface NormalisedCandidate {
  tmdbId: number;
  type: TitleType;
  name: string;
  year: number | null;
  genreId: string;
  tmdbGenreIds: number[];
  overview: string | null;
  posterPath: string | null;
  voteAverage: number;
  voteCount: number;
}

/**
 * Turns one `/discover` result into a storable row, or explains why not.
 *
 * The genre is **not** read from the response. The import runs one query per
 * genre, so the row's genre is whichever query returned it, which is what makes
 * the mapping exact: TMDB returns several genres per title while A19 fixes us at
 * one, and picking from the response would need a precedence rule nobody has
 * designed.
 *
 * `name` is the only genuinely required field. TMDB spells it `title` for films
 * and `name` for series, and the release date is `release_date` or
 * `first_air_date`, so both spellings are tried.
 */
export function normaliseDiscoverResult(
  result: TmdbDiscoverResult,
  type: TitleType,
  genre: Genre,
): NormalisedCandidate | { skip: SkipReason } {
  const name = (result.title ?? result.name ?? '').trim();

  if (!name) {
    return { skip: 'no-name' };
  }

  return {
    tmdbId: result.id,
    type,
    name,
    year: parseYear(result.release_date ?? result.first_air_date),
    genreId: genre.id,
    tmdbGenreIds: result.genre_ids ?? [],
    overview: result.overview?.trim() || null,
    posterPath: result.poster_path ?? null,
    voteAverage: result.vote_average ?? 0,
    voteCount: result.vote_count ?? 0,
  };
}

/**
 * TMDB dates are `YYYY-MM-DD`, **or an empty string**, which is the trap: `new
 * Date('')` is Invalid Date and `Number('')` is 0, so either would quietly write
 * a nonsense year. Anything that is not four leading digits becomes null.
 */
export function parseYear(date?: string): number | null {
  const year = Number((date ?? '').slice(0, 4));

  return Number.isInteger(year) && year > 1800 ? year : null;
}

/**
 * Runtime, which differs in meaning between the two endpoints.
 *
 * Films give a single `runtime` in minutes. Series give `episode_run_time`, an
 * array that is **per episode**, so a sitcom reads 25 where a film reads 166. The
 * first entry is taken. That reads oddly on DET-4's Runtime row but is far more
 * useful for the "Short & sweet" mood chip than a series total would be, and the
 * choice is recorded in the `tmdb-catalogue` skill.
 */
export function parseRuntime(detail: TmdbDetail | null): number | null {
  if (!detail) return null;

  if (typeof detail.runtime === 'number' && detail.runtime > 0) {
    return detail.runtime;
  }

  const perEpisode = detail.episode_run_time?.find((value) => value > 0);

  return perEpisode ?? null;
}

/** How many `/discover` pages to pull per genre. Each page is 20 results. */
export const DEFAULT_PAGES_PER_GENRE = 3;

/**
 * Imports the Picker candidate catalogue from TMDB (FIL-81).
 *
 * **One `/discover` query per genre**, twelve against movies and eight against
 * series, because that assigns the genre by construction (see
 * `normaliseDiscoverResult`) and guarantees FIL-80's requirement that a pick is
 * possible for any favourite-genre selection.
 *
 * The four genres TV has no vocabulary for (Thriller, Romance, Horror, Fantasy)
 * carry a null `tmdbTvId` and are simply not queried against `/tv`. Nobody can
 * perceive the difference between "no horror series in the catalogue" and "the
 * algorithm picked three films this time".
 *
 * Re-runnable by design, which is both an acceptance criterion and a licence
 * requirement: TMDB caps caching at six months, so this cannot be a one-shot.
 */
@Injectable()
export class CatalogueImportService {
  private readonly logger = new Logger(CatalogueImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async import(
    client: TmdbClient,
    pagesPerGenre: number = DEFAULT_PAGES_PER_GENRE,
  ): Promise<ImportReport> {
    const startedAt = Date.now();
    const genres = await this.prisma.genre.findMany({
      orderBy: { slug: 'asc' },
    });

    const report: ImportReport = {
      imported: 0,
      updated: 0,
      multiGenreTitles: 0,
      skipped: { 'no-name': 0, 'unmapped-genre': 0 },
      unmappedGenreIds: [],
      durationMs: 0,
    };

    // How many genres each title has been filed under this run, so the report can
    // say how much of the catalogue is cross-genre.
    const genresPerTitle = new Map<string, number>();

    for (const genre of genres) {
      await this.importGenre(
        client,
        genre,
        'movie',
        pagesPerGenre,
        report,
        genresPerTitle,
      );
      await this.importGenre(
        client,
        genre,
        'series',
        pagesPerGenre,
        report,
        genresPerTitle,
      );
    }

    report.multiGenreTitles = [...genresPerTitle.values()].filter(
      (n) => n > 1,
    ).length;
    report.durationMs = Date.now() - startedAt;

    return report;
  }

  private async importGenre(
    client: TmdbClient,
    genre: Genre,
    type: TitleType,
    pages: number,
    report: ImportReport,
    genresPerTitle: Map<string, number>,
  ): Promise<void> {
    const kind = type === 'movie' ? 'movie' : 'tv';
    const tmdbGenreId = type === 'movie' ? genre.tmdbMovieId : genre.tmdbTvId;

    if (tmdbGenreId === null) {
      // Expected for the four genres TV has no equivalent for, so this is not a
      // skip: there is nothing to skip, the query is simply not run.
      this.logger.log(`${genre.name}/${type}: no TMDB genre, not queried`);
      return;
    }

    for (let page = 1; page <= pages; page += 1) {
      const response = await client.discover(kind, tmdbGenreId, page);

      for (const result of response.results) {
        const normalised = normaliseDiscoverResult(result, type, genre);

        if ('skip' in normalised) {
          report.skipped[normalised.skip] += 1;
          for (const id of result.genre_ids ?? []) {
            if (!report.unmappedGenreIds.includes(id)) {
              report.unmappedGenreIds.push(id);
            }
          }
          continue;
        }

        const detail = await client.detail(kind, result.id);
        await this.upsert(
          normalised,
          parseRuntime(detail),
          report,
          genresPerTitle,
        );
      }

      if (page >= response.total_pages) break;
    }
  }

  /**
   * Writes one candidate, updating rather than ignoring on conflict.
   *
   * **`update`, not a no-op.** Idempotency only requires that a re-run avoids
   * duplicates, which "do nothing" would satisfy while keeping a stale genre
   * forever. Since the query that found this row *is* the genre, an update is how
   * a re-mapping actually takes effect. `syncedAt` moves with it, so staleness
   * against TMDB's six-month cap stays visible.
   *
   * **The key is the triple, so query order no longer decides anything.** Keying
   * on `(type, tmdbId)` alone made the last genre queried overwrite every earlier
   * one; because genres are iterated alphabetically that starved the early ones,
   * and a real run left Action holding a single movie. Each genre query now keeps
   * what it found, and a cross-genre title is simply findable under both.
   */
  private async upsert(
    candidate: NormalisedCandidate,
    runtime: number | null,
    report: ImportReport,
    genresPerTitle: Map<string, number>,
  ): Promise<void> {
    const key = {
      type: candidate.type,
      tmdbId: candidate.tmdbId,
      genreId: candidate.genreId,
    };

    const existing = await this.prisma.catalogueTitle.findUnique({
      where: { type_tmdbId_genreId: key },
      select: { id: true },
    });

    await this.prisma.catalogueTitle.upsert({
      where: { type_tmdbId_genreId: key },
      create: { ...candidate, runtime },
      update: { ...candidate, runtime },
    });

    if (existing) {
      report.updated += 1;
    } else {
      report.imported += 1;
    }

    const titleKey = `${candidate.type}:${candidate.tmdbId}`;
    genresPerTitle.set(titleKey, (genresPerTitle.get(titleKey) ?? 0) + 1);
  }
}

/**
 * The slice of TMDB's `/discover` response the import reads.
 *
 * Movies and series disagree on two field names, which is why both spellings are
 * optional here and `normaliseDiscoverResult` picks. `title`/`release_date` are
 * the movie spellings; `name`/`first_air_date` are the series ones.
 */
export interface TmdbDiscoverResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  overview?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
}

/** Runtime lives only on the detail endpoint, never on `/discover`. */
export interface TmdbDetail {
  id: number;
  runtime?: number | null;
  episode_run_time?: number[];
}

export interface DiscoverPage {
  page: number;
  total_pages: number;
  results: TmdbDiscoverResult[];
}

/** What the import needs from TMDB, so tests can substitute it wholesale. */
export interface TmdbClient {
  discover(
    kind: 'movie' | 'tv',
    tmdbGenreId: number,
    page: number,
  ): Promise<DiscoverPage>;
  detail(kind: 'movie' | 'tv', tmdbId: number): Promise<TmdbDetail | null>;
}

const BASE = 'https://api.themoviedb.org/3';

/**
 * Quality floors applied at the `/discover` call rather than after.
 *
 * Filtering server-side keeps junk out of the table entirely instead of importing
 * it and hiding it later. `voteCount` matters more than it looks: without it the
 * Picker eventually suggests a film with one 10/10 vote.
 */
export const MIN_VOTE_COUNT = 300;
export const MIN_VOTE_AVERAGE = 6;

/**
 * The real TMDB HTTP client.
 *
 * The token goes in the `Authorization` header rather than an `api_key` query
 * parameter, so it never lands in a URL, a log line or an error message.
 */
export class HttpTmdbClient implements TmdbClient {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async discover(
    kind: 'movie' | 'tv',
    tmdbGenreId: number,
    page: number,
  ): Promise<DiscoverPage> {
    const params = new URLSearchParams({
      with_genres: String(tmdbGenreId),
      'vote_count.gte': String(MIN_VOTE_COUNT),
      'vote_average.gte': String(MIN_VOTE_AVERAGE),
      sort_by: 'popularity.desc',
      include_adult: 'false',
      page: String(page),
    });

    return this.get<DiscoverPage>(`/discover/${kind}?${params.toString()}`);
  }

  /**
   * The second pass, purely for runtime.
   *
   * A single missing title must not abort an import of thousands, so a 404 here
   * returns null and the row keeps a null runtime rather than being skipped.
   */
  async detail(
    kind: 'movie' | 'tv',
    tmdbId: number,
  ): Promise<TmdbDetail | null> {
    try {
      return await this.get<TmdbDetail>(`/${kind}/${tmdbId}`);
    } catch {
      return null;
    }
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      // The path is safe to echo; the token is in a header, not the URL.
      throw new Error(`TMDB ${response.status} for ${path}`);
    }

    return (await response.json()) as T;
  }
}

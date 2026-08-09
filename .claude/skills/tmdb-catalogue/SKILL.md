---
name: tmdb-catalogue
description: This skill should be used when working on the Scene Picker candidate catalogue, the movie dataset, the TMDB API, importing titles into the database, mapping TMDB genres onto the app's twelve genres, or whenever a task mentions FIL-80, FIL-81, FIL-64, pick generation, runtime, or the `type` column. Passive reference - records where the chosen dataset disagrees with the types this app expects, and which decisions are already settled.
license: MIT
metadata:
  version: "1.0.0"
---

# TMDB catalogue: what the data gives us versus what we expect

Reference for the Scene Picker candidate catalogue. Everything below is verified against
the live TMDB API and the tech spec, not remembered. Genre IDs were read from
`/3/genre/{movie,tv}/list` on 2026-08-04.

The point of this file: the dataset does **not** line up with our types, and the mismatches
are not obvious. Read it before writing import or pick-generation code.

## First, the thing that surprises everyone

**There is no TMDB dataset to download.** No CSV, no dump, no torrent. TMDB is an API only.
You register at themoviedb.org, get a v4 read access token, and make HTTP requests.

The only bulk file TMDB publishes is the daily ID export
(`files.tmdb.org/p/exports/movie_ids_MM_DD_YYYY.json.gz`, published by 08:00 UTC, deleted
after 3 months). Each line carries only `id`, `original_title`, `popularity`, `adult` and
`video`. **No genre, runtime or release date**, so it cannot build the catalogue. We do not
use it.

The token lives in `backend/.env` as `TMDB_API_READ_TOKEN`. Never `NEXT_PUBLIC_`, and never
in a tracked file. Send it as `Authorization: Bearer <token>`, not as an `api_key` query
parameter, so it stays out of URLs and logs.

## Field mapping

FIL-80 requires five fields per candidate: **name, year, genre, type, runtime.** None of
them map cleanly.

| Our column     | TMDB movie              | TMDB series                       | The catch                                                                                                 |
| -------------- | ----------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `tmdb_id`      | `id`                    | `id`                              | Movie and TV are **separate id spaces**, so the unique key must be `(type, tmdb_id)`, not `tmdb_id` alone |
| `name`         | `title`                 | `name`                            | Different field name per endpoint                                                                         |
| `year`         | `release_date`          | `first_air_date`                  | Slice the first 4 chars and cast to int. **Can be an empty string**                                       |
| `genre`        | the query you ran       | the query you ran                 | See the genre tables below. Not taken from the response                                                   |
| `type`         | the endpoint you called | the endpoint you called           | No field exists. Hardcode lowercase `movie` / `series`                                                    |
| `runtime`      | `runtime`, minutes      | `episode_run_time[]`, per episode | **Detail endpoint only, not on `/discover`.** Frequently null                                             |
| `poster_path`  | `poster_path`           | `poster_path`                     | Prepend an image base URL                                                                                 |
| `vote_average` | `vote_average`          | same                              | Filtering only                                                                                            |
| `vote_count`   | `vote_count`            | same                              | Filtering only. **Omit it and the picker suggests a film with one 10/10 vote**                            |

`runtime` not being on `/discover` is why the import is **two passes**: `/discover` to
select candidates, then one detail call per title. Use
`?append_to_response=keywords,external_ids` on that detail call and the same request also
yields the keywords for the Mind-bender mood chip and the `imdb_id` you would need for a
future IMDb join. Same request count, three problems solved.

## Genres: the largest mismatch

Onboarding offers **twelve** genres (tech spec GNR-2): Sci-Fi, Drama, Comedy, Thriller,
Action, Romance, Documentary, Horror, Animation, Fantasy, Mystery, Crime.

TMDB has **two different genre vocabularies**, 19 for movies and 16 for TV, and they are not
subsets of each other. This is the single most important fact in this file.

### Movies: all twelve covered, one rename

| Ours        | TMDB movie      | id      |
| ----------- | --------------- | ------- |
| Sci-Fi      | Science Fiction | `878`   |
| Drama       | Drama           | `18`    |
| Comedy      | Comedy          | `35`    |
| Thriller    | Thriller        | `53`    |
| Action      | Action          | `28`    |
| Romance     | Romance         | `10749` |
| Documentary | Documentary     | `99`    |
| Horror      | Horror          | `27`    |
| Animation   | Animation       | `16`    |
| Fantasy     | Fantasy         | `14`    |
| Mystery     | Mystery         | `9648`  |
| Crime       | Crime           | `80`    |

Seven TMDB movie genres have no home in our twelve and are simply never queried: Adventure
`12`, Family `10751`, History `36`, Music `10402`, TV Movie `10770`, War `10752`, Western
`37`.

### Series: only eight of twelve, and one of those is a fold

The full TMDB TV vocabulary: Action & Adventure `10759`, Animation `16`, Comedy `35`, Crime
`80`, Documentary `99`, Drama `18`, Family `10751`, Kids `10762`, Mystery `9648`, News
`10763`, Reality `10764`, Sci-Fi & Fantasy `10765`, Soap `10766`, Talk `10767`, War &
Politics `10768`, Western `37`.

| Ours        | TMDB TV            | id      | Note                                       |
| ----------- | ------------------ | ------- | ------------------------------------------ |
| Action      | Action & Adventure | `10759` | Rename. "Adventure" is discarded           |
| Animation   | Animation          | `16`    |                                            |
| Comedy      | Comedy             | `35`    |                                            |
| Crime       | Crime              | `80`    |                                            |
| Documentary | Documentary        | `99`    |                                            |
| Drama       | Drama              | `18`    |                                            |
| Mystery     | Mystery            | `9648`  |                                            |
| Sci-Fi      | Sci-Fi & Fantasy   | `10765` | **Fold.** Fantasy series land under Sci-Fi |
| Fantasy     | none               | -       | No TV genre exists                         |
| Thriller    | none               | -       | No TV genre exists                         |
| Horror      | none               | -       | No TV genre exists                         |
| Romance     | none               | -       | No TV genre exists                         |

**Why the Sci-Fi fold is acceptable:** assumption A19 already forces one genre per title, so
some loss is unavoidable, and the design's own example is DSH-1 rendering _Severance_ as
"2022 · Sci-Fi · Series". A fantasy series being labelled Sci-Fi is the price.

**Why the four gaps are acceptable:** if a user's favourite genre is Fantasy, Thriller,
Horror or Romance, the picker suggests **movies** for that genre. There is no empty state and
no error. Nobody can perceive the difference between "no horror series in the catalogue" and
"the algorithm picked three films this time".

If those four are ever wanted, the documented upgrade path is joining IMDb's
`title.basics.tsv.gz` (daily refresh, has `genres` and `runtimeMinutes`, covers `tvSeries`)
via `external_ids.imdb_id`. Note that IMDb does not publish its enumerated genre vocabulary,
so confirm it covers those four before committing to that work.

## The `type` column means less than it looks

`enum: movie, series`. It is **purely descriptive**. It appears only as the word after the
year in meta lines (`{year} · {genre} · {type}` on LIB-5, DSH-6, PIC-6) and as one row on
DET-4. There is no TYPE column in the library table and **nothing filters, groups or sorts by
it**. Its single functional role: Settings' "Default type" prefills the Add title form.

That is why hardcoding it per endpoint is safe.

## Runtime has a hole that is not TMDB's fault

TMDB provides runtime reliably. The gap is in our own design: per **A17 and DET-6**, `year`,
`runtime` and `director` are displayed on the title detail screen but **no form anywhere
captures them**. For a hand-typed title they stay empty until a designer answers.

Two consequences:

- **The catalogue is the only source of `runtime` and `year` in the whole app.** That is a
  bigger role than "picker feed".
- A null runtime should be **imported but excluded from the "Short & sweet" mood chip**, not
  skipped entirely.

For series, `runtime` means something different: `episode_run_time` is **per episode**, so a
sitcom reads 25 and a film reads 166. Arguably more useful for "Short & sweet" than a total,
but it reads oddly on DET-4's Runtime row. Pick one interpretation and write it down.

## Import shape (decided)

**Run one `/discover` query per genre: twelve against `/discover/movie`, eight against
`/discover/tv`.** This does three things at once:

1. **Genre is assigned by construction.** You queried `with_genres=878`, so the row is
   Sci-Fi. No precedence rule needed, which matters because TMDB returns _multiple_ genres
   per title while A19 fixes us at one.
2. It satisfies FIL-80's requirement that the catalogue cover all twelve genres, so a pick is
   possible for any favourite-genre selection.
3. Adding `vote_count.gte` and `vote_average.gte` to each query keeps junk out of the table
   entirely.

Two rules that follow:

- **Store TMDB's raw `genre_ids` array alongside the mapped genre.** Postgres has native
  `int[]`. Without it, changing the mapping means re-importing thousands of titles; with it,
  it is one `UPDATE`. The Sci-Fi fold above will get revisited, so this will pay off.
- **The upsert must `UPDATE` genre on conflict, not `DO NOTHING`.** FIL-81 only requires that
  re-runs avoid duplicates, which `DO NOTHING` satisfies while silently keeping stale genres
  forever.

A title appearing in two genre queries arrives twice. **Resolved in FIL-81: it is stored
twice**, once per genre, because `catalogue_titles` is keyed on `(type, tmdb_id, genre_id)`.

Query order deciding a single genre was tried first and is actively harmful. Genres are
iterated alphabetically, so last-write-wins starved the early ones: a real 724-row import
left Action with **one** movie, because almost every action film was later re-claimed by
Crime, Drama, Sci-Fi or Thriller. With the wider key every genre holds a full pool. A19
constrains the user's own `Title` to one genre and says nothing about a pool that exists to
be queried by genre; a candidate becomes single-genre when PIC-7 copies it into a watchlist.

## Mood chips map onto `/discover` almost entirely

PIC-3 offers six chips. Five are plain query parameters:

| Chip             | Maps to                                           |
| ---------------- | ------------------------------------------------- |
| Short & sweet    | `with_runtime.lte`                                |
| Critically loved | `vote_average.gte` + `vote_count.gte`             |
| Edge of seat     | `with_genres` Thriller, Horror                    |
| Something light  | `with_genres` Comedy, Family                      |
| Feel-good        | `with_genres` Comedy, Family + `vote_average.gte` |
| Mind-bender      | **`with_keywords`, hand-curated list needed**     |

Only Mind-bender needs work. This is also why MovieLens is unnecessary (see below).

## Licence constraints that affect architecture

- **Cache no longer than 6 months.** Verbatim from the TMDB terms. So the import cannot be a
  one-shot script: it needs to be re-runnable, which the idempotency requirement already
  forces. Consider a `synced_at` column.
- **Attribution is mandatory.** TMDB logo plus: "This product uses TMDB and the TMDB APIs but
  is not endorsed, certified, or otherwise approved by TMDB." This is a condition of use, not
  a nicety. Still not implemented.
- **Non-commercial only**, and the terms separately forbid use "in connection with, including
  for training, a machine learning (ML) or artificial intelligence (AI) based Application".
  The project owner has reviewed this and accepted it for an academy project. Recorded for
  accuracy, not to relitigate. Deterministic `/discover` filtering is clearly fine; an
  LLM-driven picker would not be.

## Why not MovieLens

Considered and rejected. `ml-latest`'s `movies.csv` is three columns (`movieId,title,genres`),
**no file in the dataset has runtime**, and it is films only with no series. That fails two of
FIL-80's five required fields outright. It was also generated 2023-07-20, so nothing recent
exists in it.

Its tag genome (1,100 tags, 14M relevance scores) is genuinely unique and was the original
reason to consider it, but `/discover` parameters cover five of six mood chips without it.
`links.csv` does map `movieId → imdbId → tmdbId` if it is ever revisited.

Also rejected: the Kaggle "The Movies Dataset" and "TMDB 5000" dumps, frozen around 2017.

## Sanity numbers

Verified live on 2026-08-04: `/discover/movie` with `with_genres=878` (Sci-Fi),
`vote_count.gte=500` and `with_runtime.lte=120` returns **904 results**. Twelve genres at ten
pages each is roughly 2,400 titles, then one detail call each, about a minute of wall clock
at TMDB's ~40 requests/second ceiling. Storage is trivial.

## Still open

| Question                                                                                     | Blocks  |
| -------------------------------------------------------------------------------------------- | ------- |
| Mind-bender keyword list, roughly ten TMDB keyword ids                                       | FIL-65  |
| TMDB attribution in the UI                                                                   | licence |
| Whether series runtime means per-episode or total on DET-4                                   | FIL-81  |
| FIL-64's wording still describes a hand-made bundled catalogue and duplicates FIL-81's scope | FIL-64  |

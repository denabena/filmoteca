-- One row per title per genre, instead of one row per title.
--
-- The previous key, (type, tmdb_id), meant the last genre queried overwrote every
-- earlier one. Genres are iterated alphabetically, so that systematically starved
-- the early ones: a real 724-row import left Action with a single movie, because
-- almost every action film was later re-claimed by Crime, Drama, Sci-Fi or
-- Thriller. Widening the key lets a title that genuinely matches several genres be
-- found under each of them, which is what a pool queried by genre needs.
--
-- Written by hand rather than generated: `prisma migrate dev` refuses to run
-- non-interactively once a change touches an existing index. Relaxing a unique
-- constraint cannot invalidate existing rows, so this needs no backfill.
DROP INDEX "catalogue_titles_type_tmdb_id_key";

CREATE UNIQUE INDEX "catalogue_titles_type_tmdb_id_genre_id_key"
  ON "catalogue_titles"("type", "tmdb_id", "genre_id");

-- CreateEnum
CREATE TYPE "TitleStatus" AS ENUM ('watched', 'watching', 'want_to_watch');

-- CreateTable
CREATE TABLE "genres" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color_slot" SMALLINT NOT NULL,
    "descriptor" TEXT,
    "tmdb_movie_id" INTEGER,
    "tmdb_tv_id" INTEGER,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titles" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TitleType" NOT NULL,
    "status" "TitleStatus" NOT NULL,
    "genre_id" UUID NOT NULL,
    "watch_date" DATE,
    "rating" SMALLINT,
    "note" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "year" INTEGER,
    "runtime" INTEGER,
    "director" TEXT,
    "poster_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "titles_user_id_status_idx" ON "titles"("user_id", "status");

-- CreateIndex
CREATE INDEX "titles_user_id_created_at_idx" ON "titles"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "titles_user_id_updated_at_idx" ON "titles"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "titles_user_id_watch_date_idx" ON "titles"("user_id", "watch_date");

-- AddForeignKey
ALTER TABLE "titles" ADD CONSTRAINT "titles_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the twelve genres from tech spec GNR-2.
--
-- In the migration rather than a seed script on purpose. A24 retires createGenre
-- and editGenre, so this set is fixed reference data that every environment needs
-- the moment the table exists. A separate `prisma db seed` step would be a second
-- manual action on deploy, next to the migrate that already has to be run by hand,
-- and forgetting it would surface as an empty genre list rather than an error.
--
-- color_slot indexes the eight-slot Foundations genre palette (crimson, amber,
-- green, teal, blue, indigo, purple, pink). Twelve genres over eight slots, so the
-- last four repeat from the start.
--
-- tmdb_tv_id is NULL for Thriller, Romance, Horror and Fantasy because TMDB's TV
-- vocabulary has no equivalent; the Picker serves films for those. Sci-Fi's TV id
-- 10765 is the fused "Sci-Fi & Fantasy", which is why fantasy series land under
-- Sci-Fi. See the tmdb-catalogue skill for the full mapping and its reasoning.
--
-- descriptor stays NULL until frame 12's card taglines are read out of the design.
INSERT INTO "genres" ("id", "slug", "name", "color_slot", "tmdb_movie_id", "tmdb_tv_id") VALUES
  (gen_random_uuid(), 'sci-fi',      'Sci-Fi',      1,   878, 10765),
  (gen_random_uuid(), 'drama',       'Drama',       2,    18,    18),
  (gen_random_uuid(), 'comedy',      'Comedy',      3,    35,    35),
  (gen_random_uuid(), 'thriller',    'Thriller',    4,    53,  NULL),
  (gen_random_uuid(), 'action',      'Action',      5,    28, 10759),
  (gen_random_uuid(), 'romance',     'Romance',     6, 10749,  NULL),
  (gen_random_uuid(), 'documentary', 'Documentary', 7,    99,    99),
  (gen_random_uuid(), 'horror',      'Horror',      8,    27,  NULL),
  (gen_random_uuid(), 'animation',   'Animation',   1,    16,    16),
  (gen_random_uuid(), 'fantasy',     'Fantasy',     2,    14,  NULL),
  (gen_random_uuid(), 'mystery',     'Mystery',     3,  9648,  9648),
  (gen_random_uuid(), 'crime',       'Crime',       4,    80,    80);

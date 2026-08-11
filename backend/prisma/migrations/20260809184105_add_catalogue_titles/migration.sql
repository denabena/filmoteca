-- CreateTable
CREATE TABLE "catalogue_titles" (
    "id" UUID NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "type" "TitleType" NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "runtime" INTEGER,
    "genre_id" UUID NOT NULL,
    "tmdb_genre_ids" INTEGER[],
    "overview" TEXT,
    "poster_path" TEXT,
    "vote_average" DOUBLE PRECISION NOT NULL,
    "vote_count" INTEGER NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogue_titles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalogue_titles_genre_id_type_idx" ON "catalogue_titles"("genre_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_titles_type_tmdb_id_key" ON "catalogue_titles"("type", "tmdb_id");

-- AddForeignKey
ALTER TABLE "catalogue_titles" ADD CONSTRAINT "catalogue_titles_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

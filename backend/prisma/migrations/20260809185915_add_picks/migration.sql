-- CreateEnum
CREATE TYPE "PickState" AS ENUM ('suggested', 'added', 'dismissed');

-- CreateTable
CREATE TABLE "picks" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "batch_id" UUID NOT NULL,
    "rank" SMALLINT NOT NULL,
    "catalogue_title_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "type" "TitleType" NOT NULL,
    "runtime" INTEGER,
    "genre_id" UUID NOT NULL,
    "poster_path" TEXT,
    "match_percent" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "moods" TEXT[],
    "state" "PickState" NOT NULL DEFAULT 'suggested',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "picks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "picks_user_id_batch_id_idx" ON "picks"("user_id", "batch_id");

-- CreateIndex
CREATE INDEX "picks_user_id_state_idx" ON "picks"("user_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "picks_user_id_catalogue_title_id_key" ON "picks"("user_id", "catalogue_title_id");

-- AddForeignKey
ALTER TABLE "picks" ADD CONSTRAINT "picks_catalogue_title_id_fkey" FOREIGN KEY ("catalogue_title_id") REFERENCES "catalogue_titles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picks" ADD CONSTRAINT "picks_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

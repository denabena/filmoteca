-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "favorite_genres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

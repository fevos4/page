-- AlterTable
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "downloadable" BOOLEAN NOT NULL DEFAULT false;

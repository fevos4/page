-- CreateEnum
CREATE TYPE "VideoFormat" AS ENUM ('landscape', 'portrait');

-- AlterTable
ALTER TABLE "videos" ADD COLUMN "format" "VideoFormat" NOT NULL DEFAULT 'landscape';

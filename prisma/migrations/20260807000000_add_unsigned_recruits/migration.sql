-- Backfill the tables and columns introduced with the Transfers and Unsigned pages.
-- This migration follows the champion-flags migration that shipped in v1.0.4.
ALTER TABLE "SignedRecruit" ADD COLUMN "previousTeam" TEXT;
ALTER TABLE "SignedRecruit" ADD COLUMN "classYear" TEXT;

CREATE TABLE "UnsignedRecruit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "posGroup" TEXT NOT NULL,
    "starRating" TEXT NOT NULL,
    "overall" INTEGER,
    "recruitType" TEXT NOT NULL,
    "previousTeam" TEXT,
    CONSTRAINT "UnsignedRecruit_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

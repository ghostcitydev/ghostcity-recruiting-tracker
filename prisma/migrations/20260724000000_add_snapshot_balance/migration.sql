-- Add snapshot type to Season (preseason | signing_day)
ALTER TABLE "Season" ADD COLUMN "snapshot" TEXT NOT NULL DEFAULT 'signing_day';

-- Replace the year-only unique index with a year+snapshot compound index
DROP INDEX "Season_year_key";
CREATE UNIQUE INDEX "Season_year_snapshot_key" ON "Season"("year", "snapshot");

-- Add balance score to TeamSeasonStat
ALTER TABLE "TeamSeasonStat" ADD COLUMN "balanceScore" REAL;

-- Remove balanceScore column — computed on the fly from roster depth data in players page
ALTER TABLE "TeamSeasonStat" DROP COLUMN "balanceScore";

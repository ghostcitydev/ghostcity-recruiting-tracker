-- AddColumn champion flags
ALTER TABLE "TeamSeasonStat" ADD COLUMN "isNationalChampion" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "isConferenceChampion" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ForceWinAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "forcedWinner" TEXT NOT NULL,
    "disparity" REAL,
    "probability" REAL,
    "roll" REAL,
    "talentValue" REAL,
    "matchupValue" REAL,
    "coachingValue" REAL,
    "homeFieldValue" REAL,
    "homeEnvValue" REAL,
    "reason" TEXT,
    "rivalryApplied" BOOLEAN NOT NULL DEFAULT false,
    "rivalryMultiplier" REAL,
    "fcsApplied" BOOLEAN NOT NULL DEFAULT false,
    "fcsMultiplier" REAL,
    "involvement" TEXT NOT NULL,
    "modelProfile" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ForceWinAssignment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ForceWinAssignment_seasonId_week_homeTeam_awayTeam_key"
ON "ForceWinAssignment"("seasonId", "week", "homeTeam", "awayTeam");

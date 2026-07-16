-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "nickname" TEXT,
    "conference" TEXT NOT NULL,
    "division" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFile" TEXT
);

-- CreateTable
CREATE TABLE "TeamSeasonStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "overall" INTEGER,
    "prestige" INTEGER,
    "prestigeRank" INTEGER,
    "recruitingRank" INTEGER,
    "teamRank" INTEGER,
    "wins" INTEGER,
    "losses" INTEGER,
    "transfersIn" INTEGER,
    "transfersOut" INTEGER,
    "recruitCount" INTEGER,
    "unsignedRecruits" INTEGER,
    "rosterSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamSeasonStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamSeasonStat_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Season_year_key" ON "Season"("year");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSeasonStat_teamId_seasonId_key" ON "TeamSeasonStat"("teamId", "seasonId");

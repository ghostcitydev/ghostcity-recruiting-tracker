CREATE TABLE "TeamPositionRecruit" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "teamId"     TEXT NOT NULL,
    "seasonId"   TEXT NOT NULL,
    "posGroup"   TEXT NOT NULL,
    "total"      INTEGER NOT NULL DEFAULT 0,
    "fiveStars"  INTEGER NOT NULL DEFAULT 0,
    "fourStars"  INTEGER NOT NULL DEFAULT 0,
    "threeStars" INTEGER NOT NULL DEFAULT 0,
    "twoStars"   INTEGER NOT NULL DEFAULT 0,
    "oneStars"   INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TeamPositionRecruit_teamId_fkey"   FOREIGN KEY ("teamId")   REFERENCES "Team"   ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPositionRecruit_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TeamPositionRecruit_teamId_seasonId_posGroup_key" ON "TeamPositionRecruit"("teamId", "seasonId", "posGroup");

CREATE TABLE "TeamPlayerRating" (
    "id"       TEXT NOT NULL PRIMARY KEY,
    "teamId"   TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "posGroup" TEXT NOT NULL,
    "r95_99"   INTEGER NOT NULL DEFAULT 0,
    "r90_94"   INTEGER NOT NULL DEFAULT 0,
    "r85_89"   INTEGER NOT NULL DEFAULT 0,
    "r80_84"   INTEGER NOT NULL DEFAULT 0,
    "r75_79"   INTEGER NOT NULL DEFAULT 0,
    "r70_74"   INTEGER NOT NULL DEFAULT 0,
    "rSub70"   INTEGER NOT NULL DEFAULT 0,
    "total"    INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TeamPlayerRating_teamId_fkey"   FOREIGN KEY ("teamId")   REFERENCES "Team"   ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPlayerRating_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TeamPlayerRating_teamId_seasonId_posGroup_key" ON "TeamPlayerRating"("teamId", "seasonId", "posGroup");

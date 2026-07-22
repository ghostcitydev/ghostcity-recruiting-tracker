-- Add HS/Transfer split columns to TeamPositionRecruit
ALTER TABLE "TeamPositionRecruit" ADD COLUMN "hs"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TeamPositionRecruit" ADD COLUMN "xfer" INTEGER NOT NULL DEFAULT 0;

-- Individual signed recruits per team/season
CREATE TABLE "SignedRecruit" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "teamId"      TEXT NOT NULL,
    "seasonId"    TEXT NOT NULL,
    "firstName"   TEXT NOT NULL,
    "lastName"    TEXT NOT NULL,
    "position"    TEXT NOT NULL,
    "posGroup"    TEXT NOT NULL,
    "starRating"  TEXT NOT NULL,
    "overall"     INTEGER,
    "recruitType" TEXT NOT NULL,
    CONSTRAINT "SignedRecruit_teamId_fkey"   FOREIGN KEY ("teamId")   REFERENCES "Team"   ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SignedRecruit_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Roster players (depth chart) per team/season
CREATE TABLE "RosterPlayer" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "teamId"     TEXT NOT NULL,
    "seasonId"   TEXT NOT NULL,
    "firstName"  TEXT NOT NULL,
    "lastName"   TEXT NOT NULL,
    "position"   TEXT NOT NULL,
    "posGroup"   TEXT NOT NULL,
    "overall"    INTEGER,
    "starRating" TEXT,
    "schoolYear" TEXT,
    CONSTRAINT "RosterPlayer_teamId_fkey"   FOREIGN KEY ("teamId")   REFERENCES "Team"   ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RosterPlayer_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

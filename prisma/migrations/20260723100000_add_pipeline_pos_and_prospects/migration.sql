-- Pipeline recruits broken down by position group per team
CREATE TABLE "TeamPipelinePositionRecruit" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "teamId"     TEXT NOT NULL,
    "seasonId"   TEXT NOT NULL,
    "pipeline"   TEXT NOT NULL,
    "posGroup"   TEXT NOT NULL,
    "fiveStars"  INTEGER NOT NULL DEFAULT 0,
    "fourStars"  INTEGER NOT NULL DEFAULT 0,
    "threeStars" INTEGER NOT NULL DEFAULT 0,
    "twoStars"   INTEGER NOT NULL DEFAULT 0,
    "oneStars"   INTEGER NOT NULL DEFAULT 0,
    "total"      INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TeamPipelinePositionRecruit_teamId_fkey"   FOREIGN KEY ("teamId")   REFERENCES "Team"   ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPipelinePositionRecruit_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TeamPipelinePositionRecruit_teamId_seasonId_pipeline_posGroup_key"
    ON "TeamPipelinePositionRecruit"("teamId", "seasonId", "pipeline", "posGroup");

-- Unsigned prospect pool counts by pipeline + position (for Access to Recruits)
CREATE TABLE "PipelineProspect" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "seasonId"   TEXT NOT NULL,
    "pipeline"   TEXT NOT NULL,
    "posGroup"   TEXT NOT NULL,
    "fiveStars"  INTEGER NOT NULL DEFAULT 0,
    "fourStars"  INTEGER NOT NULL DEFAULT 0,
    "threeStars" INTEGER NOT NULL DEFAULT 0,
    "twoStars"   INTEGER NOT NULL DEFAULT 0,
    "oneStars"   INTEGER NOT NULL DEFAULT 0,
    "total"      INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PipelineProspect_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PipelineProspect_seasonId_pipeline_posGroup_key"
    ON "PipelineProspect"("seasonId", "pipeline", "posGroup");

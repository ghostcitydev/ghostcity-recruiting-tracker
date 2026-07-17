-- CreateTable
CREATE TABLE "TeamPipelineRecruit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "pipeline" TEXT NOT NULL,
    "fiveStars" INTEGER NOT NULL DEFAULT 0,
    "fourStars" INTEGER NOT NULL DEFAULT 0,
    "threeStars" INTEGER NOT NULL DEFAULT 0,
    "twoStars" INTEGER NOT NULL DEFAULT 0,
    "oneStars" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TeamPipelineRecruit_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPipelineRecruit_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamPipelineRecruit_teamId_seasonId_pipeline_key" ON "TeamPipelineRecruit"("teamId", "seasonId", "pipeline");

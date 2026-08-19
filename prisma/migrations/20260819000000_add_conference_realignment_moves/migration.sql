CREATE TABLE "ConferenceRealignmentMove" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "fromConference" TEXT,
    "toConference" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConferenceRealignmentMove_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ConferenceRealignmentMove_seasonId_teamName_toConference_key"
ON "ConferenceRealignmentMove"("seasonId", "teamName", "toConference");

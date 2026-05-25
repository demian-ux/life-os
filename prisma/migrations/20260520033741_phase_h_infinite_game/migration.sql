-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "highestRank" INTEGER NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Season_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StreakTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "daysAt" INTEGER NOT NULL,
    "reachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreakTier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StreakTier_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HIDDEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "Quest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Season_userId_startDate_idx" ON "Season"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Season_userId_startDate_key" ON "Season"("userId", "startDate");

-- CreateIndex
CREATE INDEX "StreakTier_userId_habitId_idx" ON "StreakTier"("userId", "habitId");

-- CreateIndex
CREATE UNIQUE INDEX "StreakTier_userId_habitId_tier_key" ON "StreakTier"("userId", "habitId", "tier");

-- CreateIndex
CREATE INDEX "Quest_userId_status_idx" ON "Quest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_userId_slug_key" ON "Quest"("userId", "slug");

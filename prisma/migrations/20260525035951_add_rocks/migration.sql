-- CreateTable
CREATE TABLE "WeekRock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trait" TEXT NOT NULL DEFAULT 'FOCUS',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "xpReward" INTEGER NOT NULL DEFAULT 250,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "WeekRock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyRock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trait" TEXT NOT NULL DEFAULT 'FOCUS',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "weekRockId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "DailyRock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyRock_weekRockId_fkey" FOREIGN KEY ("weekRockId") REFERENCES "WeekRock" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WeekRock_userId_status_idx" ON "WeekRock"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WeekRock_userId_weekStart_key" ON "WeekRock"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "DailyRock_userId_status_idx" ON "DailyRock"("userId", "status");

-- CreateIndex
CREATE INDEX "DailyRock_weekRockId_idx" ON "DailyRock"("weekRockId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRock_userId_date_key" ON "DailyRock"("userId", "date");

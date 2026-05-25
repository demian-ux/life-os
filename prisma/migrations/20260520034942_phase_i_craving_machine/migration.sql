-- CreateTable
CREATE TABLE "CoachInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNSEEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shownAt" DATETIME,
    CONSTRAINT "CoachInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_XpEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "multiplier" REAL NOT NULL DEFAULT 1.0,
    "bonus" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_XpEvent" ("amount", "createdAt", "date", "id", "note", "source", "userId") SELECT "amount", "createdAt", "date", "id", "note", "source", "userId" FROM "XpEvent";
DROP TABLE "XpEvent";
ALTER TABLE "new_XpEvent" RENAME TO "XpEvent";
CREATE INDEX "XpEvent_userId_date_idx" ON "XpEvent"("userId", "date");
CREATE INDEX "XpEvent_userId_bonus_idx" ON "XpEvent"("userId", "bonus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CoachInsight_userId_status_idx" ON "CoachInsight"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CoachInsight_userId_slug_key" ON "CoachInsight"("userId", "slug");

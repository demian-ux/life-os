-- CreateTable
CREATE TABLE "Trait" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "value" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trait_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraitEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "delta" REAL NOT NULL,
    "jitter" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TraitEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Title" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Title_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "minimumVersion" TEXT NOT NULL,
    "idealVersion" TEXT,
    "anchor" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "startDate" TEXT,
    "axis" TEXT NOT NULL DEFAULT 'CRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Habit" ("active", "anchor", "category", "createdAt", "difficulty", "id", "idealVersion", "minimumVersion", "name", "startDate", "updatedAt", "userId") SELECT "active", "anchor", "category", "createdAt", "difficulty", "id", "idealVersion", "minimumVersion", "name", "startDate", "updatedAt", "userId" FROM "Habit";
DROP TABLE "Habit";
ALTER TABLE "new_Habit" RENAME TO "Habit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Trait_userId_axis_key" ON "Trait"("userId", "axis");

-- CreateIndex
CREATE INDEX "TraitEvent_userId_source_date_idx" ON "TraitEvent"("userId", "source", "date");

-- CreateIndex
CREATE INDEX "TraitEvent_userId_axis_date_idx" ON "TraitEvent"("userId", "axis", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Title_userId_slug_key" ON "Title"("userId", "slug");

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "gcalCalendarId" TEXT;
ALTER TABLE "Task" ADD COLUMN "gcalEventId" TEXT;
ALTER TABLE "Task" ADD COLUMN "lastSyncedAt" DATETIME;

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntegrationCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IntegrationCredential_userId_idx" ON "IntegrationCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_userId_provider_key" ON "IntegrationCredential"("userId", "provider");

-- CreateIndex
CREATE INDEX "Task_gcalEventId_idx" ON "Task"("gcalEventId");

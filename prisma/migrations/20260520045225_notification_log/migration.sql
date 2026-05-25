-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dispatchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NotificationLog_userId_dispatchedAt_idx" ON "NotificationLog"("userId", "dispatchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_userId_slug_key" ON "NotificationLog"("userId", "slug");

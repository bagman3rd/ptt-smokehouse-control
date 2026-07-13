-- Build 7.2.0 defect remediation
CREATE TABLE IF NOT EXISTS "SecurityEvent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "identifier" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityEvent_action_createdAt_idx" ON "SecurityEvent"("action", "createdAt");
DELETE FROM "EndOfDayProteinLog" a USING "EndOfDayProteinLog" b WHERE a."id" > b."id" AND a."endOfDayLogId" = b."endOfDayLogId" AND a."proteinId" = b."proteinId";
CREATE UNIQUE INDEX IF NOT EXISTS "EndOfDayProteinLog_endOfDayLogId_proteinId_key" ON "EndOfDayProteinLog"("endOfDayLogId", "proteinId");

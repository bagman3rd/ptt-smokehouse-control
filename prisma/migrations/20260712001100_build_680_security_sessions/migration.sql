CREATE TABLE IF NOT EXISTS "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
DO $$ BEGIN
  ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

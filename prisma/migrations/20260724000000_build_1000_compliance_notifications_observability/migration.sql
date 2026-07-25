-- Build 10.0.0 — Compliance, Notifications, Cost/Observability, Retention.
-- Additive & idempotent (safe to re-run; safe roll-forward per Section 40.3).

-- ---- Enums ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "ConsentChannel" AS ENUM ('SMS','EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ConsentState" AS ENUM ('OPTED_IN','OPTED_OUT','UNSET');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL','SMS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "NotificationCategory" AS ENUM ('TRANSACTIONAL','MARKETING','SYSTEM_ALERT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED','SUPPRESSED_CONSENT','SUPPRESSED_QUIET_HOURS','SENDING','SENT','DELIVERED','FAILED','BOUNCED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "CostService" AS ENUM ('STRIPE','ARCHER_AI','DATABASE','STORAGE','SMS','EMAIL','HOSTING','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- CommunicationConsent -------------------------------------------------
CREATE TABLE IF NOT EXISTS "CommunicationConsent" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "channel" "ConsentChannel" NOT NULL,
  "destination" TEXT NOT NULL,
  "marketingState" "ConsentState" NOT NULL DEFAULT 'UNSET',
  "transactionalState" "ConsentState" NOT NULL DEFAULT 'OPTED_IN',
  "consentSource" TEXT,
  "consentText" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "lastOptInAt" TIMESTAMP(3),
  "lastOptOutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationConsent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommunicationConsent_channel_destination_key" ON "CommunicationConsent"("channel","destination");
CREATE INDEX IF NOT EXISTS "CommunicationConsent_restaurantId_channel_idx" ON "CommunicationConsent"("restaurantId","channel");
CREATE INDEX IF NOT EXISTS "CommunicationConsent_destination_idx" ON "CommunicationConsent"("destination");

-- ---- ConsentEvent (immutable audit) ---------------------------------------
CREATE TABLE IF NOT EXISTS "ConsentEvent" (
  "id" TEXT NOT NULL,
  "consentId" TEXT NOT NULL,
  "channel" "ConsentChannel" NOT NULL,
  "destination" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "source" TEXT,
  "consentText" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ConsentEvent_destination_createdAt_idx" ON "ConsentEvent"("destination","createdAt");
CREATE INDEX IF NOT EXISTS "ConsentEvent_channel_action_createdAt_idx" ON "ConsentEvent"("channel","action","createdAt");

-- ---- NotificationLog ------------------------------------------------------
CREATE TABLE IF NOT EXISTS "NotificationLog" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "templateKey" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "subject" TEXT,
  "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
  "providerId" TEXT,
  "errorMessage" TEXT,
  "suppressionReason" TEXT,
  "scheduledFor" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationLog_idempotencyKey_key" ON "NotificationLog"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "NotificationLog_restaurantId_channel_createdAt_idx" ON "NotificationLog"("restaurantId","channel","createdAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_status_scheduledFor_idx" ON "NotificationLog"("status","scheduledFor");
CREATE INDEX IF NOT EXISTS "NotificationLog_destination_createdAt_idx" ON "NotificationLog"("destination","createdAt");

-- ---- CostEvent ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CostEvent" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "service" "CostService" NOT NULL,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit" TEXT,
  "occurredOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CostEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CostEvent_service_occurredOn_idx" ON "CostEvent"("service","occurredOn");
CREATE INDEX IF NOT EXISTS "CostEvent_restaurantId_service_occurredOn_idx" ON "CostEvent"("restaurantId","service","occurredOn");

-- ---- AiUsageDaily ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AiUsageDaily" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "usageDate" TIMESTAMP(3) NOT NULL,
  "conversations" INTEGER NOT NULL DEFAULT 0,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageDaily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AiUsageDaily_restaurantId_usageDate_key" ON "AiUsageDaily"("restaurantId","usageDate");
CREATE INDEX IF NOT EXISTS "AiUsageDaily_usageDate_idx" ON "AiUsageDaily"("usageDate");

-- ---- DataRetentionSetting -------------------------------------------------
CREATE TABLE IF NOT EXISTS "DataRetentionSetting" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "aiLogRetentionDays" INTEGER NOT NULL DEFAULT 90,
  "notificationRetentionDays" INTEGER NOT NULL DEFAULT 365,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataRetentionSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DataRetentionSetting_restaurantId_key" ON "DataRetentionSetting"("restaurantId");

-- ---- RetentionJobRun ------------------------------------------------------
CREATE TABLE IF NOT EXISTS "RetentionJobRun" (
  "id" TEXT NOT NULL,
  "jobType" TEXT NOT NULL,
  "recordsDeleted" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "errorMessage" TEXT,
  CONSTRAINT "RetentionJobRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RetentionJobRun_jobType_startedAt_idx" ON "RetentionJobRun"("jobType","startedAt");

-- ---- ArcherConversationLog ------------------------------------------------
CREATE TABLE IF NOT EXISTS "ArcherConversationLog" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "userId" TEXT,
  "sessionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "flagged" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArcherConversationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ArcherConversationLog_restaurantId_sessionId_createdAt_idx" ON "ArcherConversationLog"("restaurantId","sessionId","createdAt");
CREATE INDEX IF NOT EXISTS "ArcherConversationLog_restaurantId_createdAt_idx" ON "ArcherConversationLog"("restaurantId","createdAt");
CREATE INDEX IF NOT EXISTS "ArcherConversationLog_flagged_createdAt_idx" ON "ArcherConversationLog"("flagged","createdAt");

-- ---- CookieConsent --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CookieConsent" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "essential" BOOLEAN NOT NULL DEFAULT true,
  "functional" BOOLEAN NOT NULL DEFAULT false,
  "analytics" BOOLEAN NOT NULL DEFAULT false,
  "marketing" BOOLEAN NOT NULL DEFAULT false,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CookieConsent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CookieConsent_visitorId_key" ON "CookieConsent"("visitorId");
CREATE INDEX IF NOT EXISTS "CookieConsent_createdAt_idx" ON "CookieConsent"("createdAt");

-- ---- DeployRecord ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "DeployRecord" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "commitSha" TEXT,
  "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "healthyAt" TIMESTAMP(3),
  "rolledBackAt" TIMESTAMP(3),
  "errorCountAfterDeploy" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DEPLOYING',
  "notes" TEXT,
  CONSTRAINT "DeployRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DeployRecord_deployedAt_idx" ON "DeployRecord"("deployedAt");

-- ---- Foreign keys (added if the referenced tables exist) ------------------
DO $$ BEGIN
  ALTER TABLE "CommunicationConsent" ADD CONSTRAINT "CommunicationConsent_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_consentId_fkey"
    FOREIGN KEY ("consentId") REFERENCES "CommunicationConsent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CostEvent" ADD CONSTRAINT "CostEvent_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AiUsageDaily" ADD CONSTRAINT "AiUsageDaily_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DataRetentionSetting" ADD CONSTRAINT "DataRetentionSetting_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ArcherConversationLog" ADD CONSTRAINT "ArcherConversationLog_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

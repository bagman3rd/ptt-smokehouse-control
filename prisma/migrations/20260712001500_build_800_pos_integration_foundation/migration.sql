DO $$ BEGIN
  CREATE TYPE "PosProvider" AS ENUM ('SQUARE','TOAST','CLOVER','LIGHTSPEED','TOUCHBISTRO','SPOTON','REVEL','ORACLE_SIMPHONY','NCR_ALOHA','PAR_BRINK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "PosConnectionStatus" AS ENUM ('NOT_CONNECTED','CONNECTING','CONNECTED','DEGRADED','REAUTH_REQUIRED','DISCONNECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "PosSyncStatus" AS ENUM ('QUEUED','RUNNING','SUCCEEDED','PARTIAL','FAILED','SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PosConnection" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "provider" "PosProvider" NOT NULL,
  "status" "PosConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
  "externalMerchantId" TEXT,
  "externalLocationId" TEXT,
  "externalLocationName" TEXT,
  "encryptedAccessToken" TEXT,
  "encryptedRefreshToken" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "automaticSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
  "dailySyncTime" TEXT NOT NULL DEFAULT '03:00',
  "syncTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
  "syncCursor" TEXT,
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "lastAttemptedSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL DEFAULT 'System',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosConnection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "PosSyncRun" (
  "id" TEXT NOT NULL, "restaurantId" TEXT NOT NULL, "connectionId" TEXT NOT NULL,
  "status" "PosSyncStatus" NOT NULL DEFAULT 'QUEUED', "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
  "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "rangeStart" TIMESTAMP(3), "rangeEnd" TIMESTAMP(3),
  "cursorBefore" TEXT, "cursorAfter" TEXT, "ordersRead" INTEGER NOT NULL DEFAULT 0,
  "lineItemsRead" INTEGER NOT NULL DEFAULT 0, "rawRecordsSaved" INTEGER NOT NULL DEFAULT 0,
  "unmappedItems" INTEGER NOT NULL DEFAULT 0, "errorMessage" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosSyncRun_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "PosRawRecord" (
  "id" TEXT NOT NULL, "restaurantId" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "provider" "PosProvider" NOT NULL,
  "externalRecordId" TEXT NOT NULL, "recordType" TEXT NOT NULL, "businessDate" TIMESTAMP(3), "payload" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processedAt" TIMESTAMP(3),
  "processingError" TEXT, CONSTRAINT "PosRawRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "PosMenuItem" (
  "id" TEXT NOT NULL, "restaurantId" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "provider" "PosProvider" NOT NULL,
  "externalItemId" TEXT NOT NULL, "externalName" TEXT NOT NULL, "normalizedName" TEXT NOT NULL, "categoryName" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosMenuItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "PosOrder" (
  "id" TEXT NOT NULL, "restaurantId" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "provider" "PosProvider" NOT NULL,
  "externalOrderId" TEXT NOT NULL, "externalCheckId" TEXT, "businessDate" TIMESTAMP(3) NOT NULL, "openedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3), "grossSalesCents" INTEGER NOT NULL DEFAULT 0, "discountCents" INTEGER NOT NULL DEFAULT 0,
  "netSalesCents" INTEGER NOT NULL DEFAULT 0, "taxCents" INTEGER NOT NULL DEFAULT 0, "tipCents" INTEGER NOT NULL DEFAULT 0,
  "refundCents" INTEGER NOT NULL DEFAULT 0, "serviceChargeCents" INTEGER NOT NULL DEFAULT 0, "voided" BOOLEAN NOT NULL DEFAULT false,
  "diningOption" TEXT, "revenueCenter" TEXT, "rawUpdatedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PosOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "PosLineItem" (
  "id" TEXT NOT NULL, "restaurantId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "externalLineItemId" TEXT NOT NULL,
  "externalItemId" TEXT, "itemName" TEXT NOT NULL, "categoryName" TEXT, "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grossSalesCents" INTEGER NOT NULL DEFAULT 0, "discountCents" INTEGER NOT NULL DEFAULT 0, "netSalesCents" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0, "refundCents" INTEGER NOT NULL DEFAULT 0, "voided" BOOLEAN NOT NULL DEFAULT false,
  "modifierNames" JSONB, "mappedProteinId" TEXT, "estimatedCookedLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosLineItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "PosWebhookEvent" (
  "id" TEXT NOT NULL, "restaurantId" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "provider" "PosProvider" NOT NULL,
  "externalEventId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL, "signatureValid" BOOLEAN NOT NULL DEFAULT false,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processedAt" TIMESTAMP(3), "processingError" TEXT,
  CONSTRAINT "PosWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PosConnection_restaurantId_provider_externalLocationId_key" ON "PosConnection"("restaurantId","provider","externalLocationId");
CREATE INDEX IF NOT EXISTS "PosConnection_restaurantId_status_idx" ON "PosConnection"("restaurantId","status");
CREATE INDEX IF NOT EXISTS "PosConnection_automaticSyncEnabled_status_lastSuccessfulSyncAt_idx" ON "PosConnection"("automaticSyncEnabled","status","lastSuccessfulSyncAt");
CREATE INDEX IF NOT EXISTS "PosSyncRun_restaurantId_createdAt_idx" ON "PosSyncRun"("restaurantId","createdAt");
CREATE INDEX IF NOT EXISTS "PosSyncRun_connectionId_status_createdAt_idx" ON "PosSyncRun"("connectionId","status","createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PosRawRecord_connectionId_recordType_externalRecordId_key" ON "PosRawRecord"("connectionId","recordType","externalRecordId");
CREATE INDEX IF NOT EXISTS "PosRawRecord_restaurantId_businessDate_idx" ON "PosRawRecord"("restaurantId","businessDate");
CREATE INDEX IF NOT EXISTS "PosRawRecord_connectionId_processedAt_idx" ON "PosRawRecord"("connectionId","processedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PosMenuItem_connectionId_externalItemId_key" ON "PosMenuItem"("connectionId","externalItemId");
CREATE INDEX IF NOT EXISTS "PosMenuItem_restaurantId_active_idx" ON "PosMenuItem"("restaurantId","active");
CREATE INDEX IF NOT EXISTS "PosMenuItem_restaurantId_normalizedName_idx" ON "PosMenuItem"("restaurantId","normalizedName");
CREATE UNIQUE INDEX IF NOT EXISTS "PosOrder_connectionId_externalOrderId_key" ON "PosOrder"("connectionId","externalOrderId");
CREATE INDEX IF NOT EXISTS "PosOrder_restaurantId_businessDate_idx" ON "PosOrder"("restaurantId","businessDate");
CREATE INDEX IF NOT EXISTS "PosOrder_connectionId_rawUpdatedAt_idx" ON "PosOrder"("connectionId","rawUpdatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PosLineItem_orderId_externalLineItemId_key" ON "PosLineItem"("orderId","externalLineItemId");
CREATE INDEX IF NOT EXISTS "PosLineItem_restaurantId_createdAt_idx" ON "PosLineItem"("restaurantId","createdAt");
CREATE INDEX IF NOT EXISTS "PosLineItem_restaurantId_externalItemId_idx" ON "PosLineItem"("restaurantId","externalItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "PosWebhookEvent_connectionId_externalEventId_key" ON "PosWebhookEvent"("connectionId","externalEventId");
CREATE INDEX IF NOT EXISTS "PosWebhookEvent_restaurantId_receivedAt_idx" ON "PosWebhookEvent"("restaurantId","receivedAt");
CREATE INDEX IF NOT EXISTS "PosWebhookEvent_connectionId_processedAt_idx" ON "PosWebhookEvent"("connectionId","processedAt");

DO $$ BEGIN
  ALTER TABLE "PosConnection" ADD CONSTRAINT "PosConnection_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosSyncRun" ADD CONSTRAINT "PosSyncRun_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosSyncRun" ADD CONSTRAINT "PosSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PosConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosRawRecord" ADD CONSTRAINT "PosRawRecord_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosRawRecord" ADD CONSTRAINT "PosRawRecord_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PosConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosMenuItem" ADD CONSTRAINT "PosMenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosMenuItem" ADD CONSTRAINT "PosMenuItem_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PosConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PosConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosLineItem" ADD CONSTRAINT "PosLineItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosLineItem" ADD CONSTRAINT "PosLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosWebhookEvent" ADD CONSTRAINT "PosWebhookEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosWebhookEvent" ADD CONSTRAINT "PosWebhookEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PosConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

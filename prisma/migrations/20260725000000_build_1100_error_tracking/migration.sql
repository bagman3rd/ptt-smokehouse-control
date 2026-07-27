-- Build 11.0.0 — real error tracking & observability (v3.0 §41).
-- Additive & idempotent.

CREATE TABLE IF NOT EXISTS "ErrorEvent" (
  "id" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'error',
  "name" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "fingerprint" TEXT NOT NULL,
  "route" TEXT,
  "restaurantId" TEXT,
  "userId" TEXT,
  "release" TEXT,
  "tagsJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ErrorEvent_createdAt_idx" ON "ErrorEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "ErrorEvent_severity_createdAt_idx" ON "ErrorEvent"("severity","createdAt");
CREATE INDEX IF NOT EXISTS "ErrorEvent_fingerprint_createdAt_idx" ON "ErrorEvent"("fingerprint","createdAt");
CREATE INDEX IF NOT EXISTS "ErrorEvent_restaurantId_createdAt_idx" ON "ErrorEvent"("restaurantId","createdAt");

-- Stripe payment webhook idempotency & audit (v3.0 §30, §50.2)
CREATE TABLE IF NOT EXISTS "PaymentEvent" (
  "id" TEXT NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "restaurantId" TEXT,
  "subscriptionId" TEXT,
  "stripeObjectId" TEXT,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "outcome" TEXT,
  "payloadHash" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentEvent_stripeEventId_key" ON "PaymentEvent"("stripeEventId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_eventType_createdAt_idx" ON "PaymentEvent"("eventType","createdAt");
CREATE INDEX IF NOT EXISTS "PaymentEvent_restaurantId_createdAt_idx" ON "PaymentEvent"("restaurantId","createdAt");
CREATE INDEX IF NOT EXISTS "PaymentEvent_stripeObjectId_idx" ON "PaymentEvent"("stripeObjectId");

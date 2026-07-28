-- Build 11.0.3 — Web Vitals RUM field data (v3.0 §27.1). Additive & idempotent.
CREATE TABLE IF NOT EXISTS "WebVitalSample" (
  "id" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "rating" TEXT,
  "route" TEXT,
  "navType" TEXT,
  "deviceType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebVitalSample_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WebVitalSample_metric_createdAt_idx" ON "WebVitalSample"("metric","createdAt");
CREATE INDEX IF NOT EXISTS "WebVitalSample_route_metric_idx" ON "WebVitalSample"("route","metric");

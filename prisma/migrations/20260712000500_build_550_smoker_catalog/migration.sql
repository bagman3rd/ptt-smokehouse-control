CREATE TABLE IF NOT EXISTS "SmokerCatalog" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "series" TEXT,
    "smokerType" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "rackCount" INTEGER NOT NULL DEFAULT 0,
    "rackWidthIn" DOUBLE PRECISION,
    "rackDepthIn" DOUBLE PRECISION,
    "cookingAreaSqIn" DOUBLE PRECISION,
    "brisketCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porkCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ribCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chickenCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cookWindow" TEXT,
    "notes" TEXT,
    "sourceUrl" TEXT,
    "sourceLabel" TEXT,
    "sourceConfidence" TEXT NOT NULL DEFAULT 'RESEARCHED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmokerCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmokerCatalog_brand_model_key" ON "SmokerCatalog"("brand", "model");
CREATE INDEX IF NOT EXISTS "SmokerCatalog_brand_active_idx" ON "SmokerCatalog"("brand", "active");
CREATE INDEX IF NOT EXISTS "SmokerCatalog_sourceConfidence_idx" ON "SmokerCatalog"("sourceConfidence");

ALTER TABLE "Smoker" ADD COLUMN IF NOT EXISTS "catalogId" TEXT;
ALTER TABLE "Smoker" ADD COLUMN IF NOT EXISTS "brand" TEXT;
CREATE INDEX IF NOT EXISTS "Smoker_catalogId_idx" ON "Smoker"("catalogId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Smoker_catalogId_fkey' AND table_name = 'Smoker'
  ) THEN
    ALTER TABLE "Smoker" ADD CONSTRAINT "Smoker_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "SmokerCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

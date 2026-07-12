CREATE TABLE IF NOT EXISTS "MenuItemMapping" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "posItemName" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "proteinId" TEXT,
  "portionSizeLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "yieldFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "source" TEXT NOT NULL DEFAULT 'CSV',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MenuItemMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MenuItemMapping_restaurantId_normalizedName_key" ON "MenuItemMapping"("restaurantId", "normalizedName");
CREATE INDEX IF NOT EXISTS "MenuItemMapping_restaurantId_active_idx" ON "MenuItemMapping"("restaurantId", "active");
CREATE INDEX IF NOT EXISTS "MenuItemMapping_restaurantId_proteinId_idx" ON "MenuItemMapping"("restaurantId", "proteinId");
DO $$ BEGIN
  ALTER TABLE "MenuItemMapping" ADD CONSTRAINT "MenuItemMapping_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MenuItemMapping" ADD CONSTRAINT "MenuItemMapping_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PosImportBatch" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'CSV',
  "status" TEXT NOT NULL DEFAULT 'PREVIEWED',
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "validRowCount" INTEGER NOT NULL DEFAULT 0,
  "invalidRowCount" INTEGER NOT NULL DEFAULT 0,
  "unmappedCount" INTEGER NOT NULL DEFAULT 0,
  "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bbqSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "importedBy" TEXT NOT NULL DEFAULT 'System',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosImportBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PosImportBatch_restaurantId_createdAt_idx" ON "PosImportBatch"("restaurantId", "createdAt");
CREATE INDEX IF NOT EXISTS "PosImportBatch_restaurantId_status_idx" ON "PosImportBatch"("restaurantId", "status");
DO $$ BEGIN
  ALTER TABLE "PosImportBatch" ADD CONSTRAINT "PosImportBatch_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PosImportRow" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "itemName" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grossSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "mappedProteinId" TEXT,
  "portionSizeLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "estimatedCookedLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "valid" BOOLEAN NOT NULL DEFAULT true,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosImportRow_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PosImportRow_restaurantId_serviceDate_idx" ON "PosImportRow"("restaurantId", "serviceDate");
CREATE INDEX IF NOT EXISTS "PosImportRow_restaurantId_batchId_idx" ON "PosImportRow"("restaurantId", "batchId");
CREATE INDEX IF NOT EXISTS "PosImportRow_restaurantId_mappedProteinId_idx" ON "PosImportRow"("restaurantId", "mappedProteinId");
DO $$ BEGIN
  ALTER TABLE "PosImportRow" ADD CONSTRAINT "PosImportRow_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosImportRow" ADD CONSTRAINT "PosImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PosImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PosImportRow" ADD CONSTRAINT "PosImportRow_mappedProteinId_fkey" FOREIGN KEY ("mappedProteinId") REFERENCES "Protein"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

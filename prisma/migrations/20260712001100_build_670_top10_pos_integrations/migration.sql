CREATE TABLE "PosConnection" (
  "id" TEXT NOT NULL PRIMARY KEY, "restaurantId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "displayName" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DISCONNECTED', "mode" TEXT NOT NULL DEFAULT 'DEMO',
  "merchantExternalId" TEXT, "encryptedAccessToken" TEXT, "encryptedRefreshToken" TEXT, "credentialHint" TEXT,
  "syncFrequencyMinutes" INTEGER NOT NULL DEFAULT 15, "lastSuccessfulSyncAt" TIMESTAMP(3), "lastAttemptAt" TIMESTAMP(3),
  "lastError" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PosConnection_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PosConnection_restaurantId_provider_key" ON "PosConnection"("restaurantId", "provider");
CREATE INDEX "PosConnection_restaurantId_status_active_idx" ON "PosConnection"("restaurantId", "status", "active");
CREATE TABLE "PosLocation" (
  "id" TEXT NOT NULL PRIMARY KEY, "restaurantId" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "externalLocationId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "timezone" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosLocation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PosLocation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PosConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PosLocation_connectionId_externalLocationId_key" ON "PosLocation"("connectionId", "externalLocationId");
CREATE INDEX "PosLocation_restaurantId_active_idx" ON "PosLocation"("restaurantId", "active");
CREATE TABLE "PosCatalogItem" (
  "id" TEXT NOT NULL PRIMARY KEY, "restaurantId" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "externalItemId" TEXT NOT NULL,
  "externalVariationId" TEXT NOT NULL DEFAULT '', "name" TEXT NOT NULL, "category" TEXT, "modifierJson" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true, "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosCatalogItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PosCatalogItem_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PosConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PosCatalogItem_connectionId_externalItemId_externalVariationId_key" ON "PosCatalogItem"("connectionId", "externalItemId", "externalVariationId");
CREATE INDEX "PosCatalogItem_restaurantId_active_idx" ON "PosCatalogItem"("restaurantId", "active");
CREATE TABLE "PosSyncRun" (
  "id" TEXT NOT NULL PRIMARY KEY, "restaurantId" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "syncType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING', "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  "recordsRead" INTEGER NOT NULL DEFAULT 0, "recordsWritten" INTEGER NOT NULL DEFAULT 0, "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "unmappedCount" INTEGER NOT NULL DEFAULT 0, "grossSales" DOUBLE PRECISION NOT NULL DEFAULT 0, "netSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "errorMessage" TEXT, "notes" TEXT,
  CONSTRAINT "PosSyncRun_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PosSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PosConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PosSyncRun_restaurantId_startedAt_idx" ON "PosSyncRun"("restaurantId", "startedAt");
CREATE INDEX "PosSyncRun_restaurantId_connectionId_status_idx" ON "PosSyncRun"("restaurantId", "connectionId", "status");
CREATE TABLE "PosOrderLine" (
  "id" TEXT NOT NULL PRIMARY KEY, "restaurantId" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "externalLocationId" TEXT,
  "externalOrderId" TEXT NOT NULL, "externalLineId" TEXT NOT NULL, "externalItemId" TEXT, "businessDate" TIMESTAMP(3) NOT NULL,
  "orderedAt" TIMESTAMP(3) NOT NULL, "itemName" TEXT NOT NULL, "category" TEXT, "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grossSales" DOUBLE PRECISION NOT NULL DEFAULT 0, "discounts" DOUBLE PRECISION NOT NULL DEFAULT 0, "refunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netSales" DOUBLE PRECISION NOT NULL DEFAULT 0, "voided" BOOLEAN NOT NULL DEFAULT false, "orderChannel" TEXT, "modifiersJson" TEXT,
  "mappedProteinId" TEXT, "portionSizeLb" DOUBLE PRECISION NOT NULL DEFAULT 0, "estimatedCookedLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sourceUpdatedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosOrderLine_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PosOrderLine_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PosConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PosOrderLine_mappedProteinId_fkey" FOREIGN KEY ("mappedProteinId") REFERENCES "Protein" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PosOrderLine_connectionId_externalOrderId_externalLineId_key" ON "PosOrderLine"("connectionId", "externalOrderId", "externalLineId");
CREATE INDEX "PosOrderLine_restaurantId_businessDate_idx" ON "PosOrderLine"("restaurantId", "businessDate");
CREATE INDEX "PosOrderLine_restaurantId_mappedProteinId_businessDate_idx" ON "PosOrderLine"("restaurantId", "mappedProteinId", "businessDate");

-- Build 5.9.0 repaired full-schema baseline.
-- Purpose: a fresh PostgreSQL database must be rebuildable from repository migrations using prisma migrate deploy.
-- Existing production databases that already have this migration marked applied should not run this SQL;
-- verify/repair their _prisma_migrations baseline record per MIGRATION_BASELINE_REPAIR_BUILD_5_9_0.md.

DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('ADMIN','OWNER','KITCHEN_MANAGER','KITCHEN_CREW','CONSULTANT','KM','PITMASTER','VIEWER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ScenarioType" AS ENUM ('CONSERVATIVE','BASE','AGGRESSIVE','EVENT_DAY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProteinUnit" AS ENUM ('EACH','RACK','LB_RAW','LB_COOKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "Restaurant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "city" TEXT,
  "state" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "name" TEXT NOT NULL,
  "username" TEXT,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorSecret" TEXT,
  "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false,
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastFailedLoginAt" TIMESTAMP(3),
  "role" "Role" NOT NULL DEFAULT 'KITCHEN_CREW',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL DEFAULT 'System',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestaurantMembership" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'KITCHEN_CREW',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "actorUserId" TEXT,
  "actorName" TEXT NOT NULL DEFAULT 'System',
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "beforeJson" TEXT,
  "afterJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Protein" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "name" TEXT NOT NULL,
  "inputUnit" "ProteinUnit" NOT NULL,
  "rawWeightEachLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cookedWeightEachLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cookedYieldPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "avgSalesPerCookedLb" DOUBLE PRECISION NOT NULL DEFAULT 22,
  "purchaseCostEach" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "salesPriceEach" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sandwichOz" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "plateOz" DOUBLE PRECISION NOT NULL DEFAULT 7,
  "minCookUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxCookUnits" DOUBLE PRECISION NOT NULL DEFAULT 999,
  "reusableLeftover" BOOLEAN NOT NULL DEFAULT true,
  "maxReuseHours" INTEGER NOT NULL DEFAULT 24,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" TEXT NOT NULL DEFAULT 'System',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Protein_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedReport" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "source" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "groupBy" TEXT NOT NULL,
  "protein" TEXT NOT NULL DEFAULT 'all',
  "range" TEXT NOT NULL DEFAULT 'last30',
  "start" TEXT NOT NULL,
  "end" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL DEFAULT 'Archer',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportRun" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "source" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "groupBy" TEXT NOT NULL,
  "protein" TEXT NOT NULL DEFAULT 'all',
  "start" TEXT NOT NULL,
  "end" TEXT NOT NULL,
  "dataset" TEXT NOT NULL DEFAULT 'aggregate',
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL DEFAULT 'Archer',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ForecastScenario" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "name" TEXT NOT NULL,
  "type" "ScenarioType" NOT NULL,
  "annualSales" DOUBLE PRECISION NOT NULL,
  "bbqSalesPercent" DOUBLE PRECISION NOT NULL DEFAULT 40,
  "safetyFactorPct" DOUBLE PRECISION NOT NULL DEFAULT 8,
  "brisketMixPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
  "porkMixPct" DOUBLE PRECISION NOT NULL DEFAULT 40,
  "ribsMixPct" DOUBLE PRECISION NOT NULL DEFAULT 15,
  "chickenMixPct" DOUBLE PRECISION NOT NULL DEFAULT 15,
  "averagePricePerLbCooked" DOUBLE PRECISION NOT NULL DEFAULT 31,
  "updatedBy" TEXT NOT NULL DEFAULT 'System',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForecastScenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DayMultiplier" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "updatedBy" TEXT NOT NULL DEFAULT 'System',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DayMultiplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonthMultiplier" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "month" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "updatedBy" TEXT NOT NULL DEFAULT 'System',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonthMultiplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventModifier" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "name" TEXT NOT NULL,
  "startsOn" TIMESTAMP(3) NOT NULL,
  "endsOn" TIMESTAMP(3) NOT NULL,
  "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventModifier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CookPlan" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "forecastSales" DOUBLE PRECISION NOT NULL,
  "forecastBbqSales" DOUBLE PRECISION NOT NULL,
  "confidence" TEXT NOT NULL DEFAULT 'LOW',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdBy" TEXT NOT NULL DEFAULT 'Archer',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CookPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CookPlanItem" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "cookPlanId" TEXT NOT NULL,
  "proteinId" TEXT NOT NULL,
  "cookedLbNeeded" DOUBLE PRECISION NOT NULL,
  "usableLeftoverLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "usableLeftoverUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "forecastCookUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "safetyFactorPct" DOUBLE PRECISION NOT NULL,
  "rawLbNeeded" DOUBLE PRECISION NOT NULL,
  "recommendedCookUnits" DOUBLE PRECISION NOT NULL,
  "approvedCookUnits" DOUBLE PRECISION,
  "overrideReason" TEXT,
  "notes" TEXT,
  CONSTRAINT "CookPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EndOfDayLog" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "enteredBy" TEXT NOT NULL DEFAULT 'KM',
  "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bbqSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EndOfDayLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EndOfDayProteinLog" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "endOfDayLogId" TEXT NOT NULL,
  "proteinId" TEXT NOT NULL,
  "cookedUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "soldCookedLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "usableLeftoverLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "usableLeftoverUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wasteLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "eightySixed" BOOLEAN NOT NULL DEFAULT false,
  "wasteReason" TEXT,
  CONSTRAINT "EndOfDayProteinLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmokerCatalog" (
  "id" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "series" TEXT,
  "smokerType" TEXT NOT NULL,
  "fuelType" TEXT NOT NULL,
  "rackCount" INTEGER,
  "rackWidthIn" DOUBLE PRECISION,
  "rackDepthIn" DOUBLE PRECISION,
  "cookingAreaSqIn" DOUBLE PRECISION,
  "brisketCapacity" DOUBLE PRECISION,
  "porkCapacity" DOUBLE PRECISION,
  "ribCapacity" DOUBLE PRECISION,
  "chickenCapacity" DOUBLE PRECISION,
  "cookWindow" TEXT,
  "notes" TEXT,
  "sourceUrl" TEXT,
  "sourceLabel" TEXT,
  "officialCapacityText" TEXT,
  "brisketCapacityUnit" TEXT,
  "porkCapacityUnit" TEXT,
  "ribCapacityUnit" TEXT,
  "chickenCapacityUnit" TEXT,
  "sourceConfidence" TEXT NOT NULL DEFAULT 'RESEARCHED',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmokerCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Smoker" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "catalogId" TEXT,
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "model" TEXT,
  "location" TEXT,
  "rackCount" INTEGER NOT NULL DEFAULT 0,
  "brisketCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "porkCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ribCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "chickenCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cookWindow" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Smoker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningRecommendation" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "targetEntity" TEXT,
  "targetId" TEXT,
  "settingKey" TEXT,
  "beforeJson" TEXT,
  "afterJson" TEXT,
  "confidence" TEXT NOT NULL DEFAULT 'LOW',
  "sampleCount" INTEGER NOT NULL DEFAULT 0,
  "minimumSampleCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdBy" TEXT NOT NULL DEFAULT 'System',
  "decidedBy" TEXT,
  "decidedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "rolledBackAt" TIMESTAMP(3),
  "rollbackBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemCheck" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "verifiedBy" TEXT NOT NULL DEFAULT 'System',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "plan" TEXT NOT NULL DEFAULT 'PILOT',
  "status" TEXT NOT NULL DEFAULT 'TRIALING',
  "trialEndsAt" TIMESTAMP(3),
  "currentPeriodEndsAt" TIMESTAMP(3),
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "stripeCheckoutUrl" TEXT,
  "stripePortalUrl" TEXT,
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerDataRequest" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL DEFAULT 'System',
  "notes" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerDataRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuItemMapping" (
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

CREATE TABLE "PosImportBatch" (
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

CREATE TABLE "PosImportRow" (
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

-- Current-schema indexes. Later migrations use IF NOT EXISTS where they repeat these names.
CREATE UNIQUE INDEX "RestaurantMembership_restaurantId_userId_key" ON "RestaurantMembership"("restaurantId", "userId");
CREATE INDEX "RestaurantMembership_userId_idx" ON "RestaurantMembership"("userId");
CREATE INDEX "RestaurantMembership_restaurantId_active_idx" ON "RestaurantMembership"("restaurantId", "active");
CREATE INDEX "AuditLog_restaurantId_createdAt_idx" ON "AuditLog"("restaurantId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "User_restaurantId_idx" ON "User"("restaurantId");
CREATE INDEX "User_active_idx" ON "User"("active");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_lockedUntil_idx" ON "User"("lockedUntil");
CREATE UNIQUE INDEX "Protein_restaurantId_name_key" ON "Protein"("restaurantId", "name");
CREATE INDEX "Protein_restaurantId_active_idx" ON "Protein"("restaurantId", "active");
CREATE INDEX "SavedReport_restaurantId_createdAt_idx" ON "SavedReport"("restaurantId", "createdAt");
CREATE INDEX "ReportRun_restaurantId_createdAt_idx" ON "ReportRun"("restaurantId", "createdAt");
CREATE UNIQUE INDEX "ForecastScenario_restaurantId_name_key" ON "ForecastScenario"("restaurantId", "name");
CREATE INDEX "ForecastScenario_restaurantId_idx" ON "ForecastScenario"("restaurantId");
CREATE UNIQUE INDEX "DayMultiplier_restaurantId_dayOfWeek_key" ON "DayMultiplier"("restaurantId", "dayOfWeek");
CREATE UNIQUE INDEX "MonthMultiplier_restaurantId_month_key" ON "MonthMultiplier"("restaurantId", "month");
CREATE INDEX "EventModifier_restaurantId_startsOn_endsOn_idx" ON "EventModifier"("restaurantId", "startsOn", "endsOn");
CREATE UNIQUE INDEX "CookPlan_restaurantId_serviceDate_scenarioId_key" ON "CookPlan"("restaurantId", "serviceDate", "scenarioId");
CREATE INDEX "CookPlan_restaurantId_serviceDate_idx" ON "CookPlan"("restaurantId", "serviceDate");
CREATE INDEX "CookPlan_scenarioId_idx" ON "CookPlan"("scenarioId");
CREATE INDEX "CookPlanItem_restaurantId_cookPlanId_idx" ON "CookPlanItem"("restaurantId", "cookPlanId");
CREATE INDEX "CookPlanItem_restaurantId_proteinId_idx" ON "CookPlanItem"("restaurantId", "proteinId");
CREATE UNIQUE INDEX "EndOfDayLog_restaurantId_serviceDate_key" ON "EndOfDayLog"("restaurantId", "serviceDate");
CREATE INDEX "EndOfDayLog_restaurantId_serviceDate_idx" ON "EndOfDayLog"("restaurantId", "serviceDate");
CREATE INDEX "EndOfDayProteinLog_restaurantId_endOfDayLogId_idx" ON "EndOfDayProteinLog"("restaurantId", "endOfDayLogId");
CREATE INDEX "EndOfDayProteinLog_restaurantId_proteinId_idx" ON "EndOfDayProteinLog"("restaurantId", "proteinId");
CREATE UNIQUE INDEX "Smoker_restaurantId_name_key" ON "Smoker"("restaurantId", "name");
CREATE INDEX "Smoker_restaurantId_active_idx" ON "Smoker"("restaurantId", "active");
CREATE INDEX "Smoker_catalogId_idx" ON "Smoker"("catalogId");
CREATE UNIQUE INDEX "SmokerCatalog_brand_model_key" ON "SmokerCatalog"("brand", "model");
CREATE INDEX "SmokerCatalog_brand_active_idx" ON "SmokerCatalog"("brand", "active");
CREATE INDEX "SmokerCatalog_sourceConfidence_idx" ON "SmokerCatalog"("sourceConfidence");
CREATE INDEX "LearningRecommendation_restaurantId_status_createdAt_idx" ON "LearningRecommendation"("restaurantId", "status", "createdAt");
CREATE INDEX "SystemCheck_restaurantId_type_createdAt_idx" ON "SystemCheck"("restaurantId", "type", "createdAt");
CREATE UNIQUE INDEX "RateLimitBucket_key_key" ON "RateLimitBucket"("key");
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
CREATE INDEX "Subscription_restaurantId_status_idx" ON "Subscription"("restaurantId", "status");
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");
CREATE INDEX "SupportTicket_restaurantId_status_createdAt_idx" ON "SupportTicket"("restaurantId", "status", "createdAt");
CREATE INDEX "SupportTicket_email_idx" ON "SupportTicket"("email");
CREATE INDEX "CustomerDataRequest_restaurantId_type_status_createdAt_idx" ON "CustomerDataRequest"("restaurantId", "type", "status", "createdAt");
CREATE UNIQUE INDEX "MenuItemMapping_restaurantId_normalizedName_key" ON "MenuItemMapping"("restaurantId", "normalizedName");
CREATE INDEX "MenuItemMapping_restaurantId_active_idx" ON "MenuItemMapping"("restaurantId", "active");
CREATE INDEX "MenuItemMapping_restaurantId_proteinId_idx" ON "MenuItemMapping"("restaurantId", "proteinId");
CREATE INDEX "PosImportBatch_restaurantId_createdAt_idx" ON "PosImportBatch"("restaurantId", "createdAt");
CREATE INDEX "PosImportBatch_restaurantId_status_idx" ON "PosImportBatch"("restaurantId", "status");
CREATE INDEX "PosImportRow_restaurantId_serviceDate_idx" ON "PosImportRow"("restaurantId", "serviceDate");
CREATE INDEX "PosImportRow_restaurantId_batchId_idx" ON "PosImportRow"("restaurantId", "batchId");
CREATE INDEX "PosImportRow_restaurantId_mappedProteinId_idx" ON "PosImportRow"("restaurantId", "mappedProteinId");

-- Current-schema base foreign keys. POS and SaaS extension foreign keys are added idempotently by later migrations.
ALTER TABLE "User" ADD CONSTRAINT "User_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestaurantMembership" ADD CONSTRAINT "RestaurantMembership_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantMembership" ADD CONSTRAINT "RestaurantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Protein" ADD CONSTRAINT "Protein_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ForecastScenario" ADD CONSTRAINT "ForecastScenario_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DayMultiplier" ADD CONSTRAINT "DayMultiplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MonthMultiplier" ADD CONSTRAINT "MonthMultiplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventModifier" ADD CONSTRAINT "EventModifier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CookPlan" ADD CONSTRAINT "CookPlan_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CookPlan" ADD CONSTRAINT "CookPlan_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ForecastScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CookPlanItem" ADD CONSTRAINT "CookPlanItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CookPlanItem" ADD CONSTRAINT "CookPlanItem_cookPlanId_fkey" FOREIGN KEY ("cookPlanId") REFERENCES "CookPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CookPlanItem" ADD CONSTRAINT "CookPlanItem_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EndOfDayLog" ADD CONSTRAINT "EndOfDayLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EndOfDayProteinLog" ADD CONSTRAINT "EndOfDayProteinLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EndOfDayProteinLog" ADD CONSTRAINT "EndOfDayProteinLog_endOfDayLogId_fkey" FOREIGN KEY ("endOfDayLogId") REFERENCES "EndOfDayLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndOfDayProteinLog" ADD CONSTRAINT "EndOfDayProteinLog_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Smoker" ADD CONSTRAINT "Smoker_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Smoker" ADD CONSTRAINT "Smoker_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "SmokerCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningRecommendation" ADD CONSTRAINT "LearningRecommendation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SystemCheck" ADD CONSTRAINT "SystemCheck_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

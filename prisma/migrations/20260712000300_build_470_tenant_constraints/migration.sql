-- Build 4.7.0 tenant isolation hardening.
-- Adds tenant scope columns to child tables, backfills from parents, and adds tenant indexes.
-- Unique indexes intentionally use restaurantId composites because names/dates repeat across tenants.

ALTER TABLE "CookPlanItem" ADD COLUMN IF NOT EXISTS "restaurantId" TEXT;
ALTER TABLE "EndOfDayProteinLog" ADD COLUMN IF NOT EXISTS "restaurantId" TEXT;

UPDATE "CookPlanItem" cpi
SET "restaurantId" = cp."restaurantId"
FROM "CookPlan" cp
WHERE cpi."cookPlanId" = cp."id" AND cpi."restaurantId" IS NULL;

UPDATE "EndOfDayProteinLog" epl
SET "restaurantId" = eod."restaurantId"
FROM "EndOfDayLog" eod
WHERE epl."endOfDayLogId" = eod."id" AND epl."restaurantId" IS NULL;

CREATE INDEX IF NOT EXISTS "RestaurantMembership_userId_idx" ON "RestaurantMembership"("userId");
CREATE INDEX IF NOT EXISTS "RestaurantMembership_restaurantId_active_idx" ON "RestaurantMembership"("restaurantId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantMembership_restaurantId_userId_key" ON "RestaurantMembership"("restaurantId", "userId");

CREATE INDEX IF NOT EXISTS "AuditLog_restaurantId_createdAt_idx" ON "AuditLog"("restaurantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

CREATE INDEX IF NOT EXISTS "User_restaurantId_idx" ON "User"("restaurantId");
CREATE INDEX IF NOT EXISTS "User_active_idx" ON "User"("active");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "Protein_restaurantId_name_key" ON "Protein"("restaurantId", "name");
CREATE INDEX IF NOT EXISTS "Protein_restaurantId_active_idx" ON "Protein"("restaurantId", "active");
CREATE INDEX IF NOT EXISTS "SavedReport_restaurantId_createdAt_idx" ON "SavedReport"("restaurantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReportRun_restaurantId_createdAt_idx" ON "ReportRun"("restaurantId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ForecastScenario_restaurantId_name_key" ON "ForecastScenario"("restaurantId", "name");
CREATE INDEX IF NOT EXISTS "ForecastScenario_restaurantId_idx" ON "ForecastScenario"("restaurantId");
CREATE UNIQUE INDEX IF NOT EXISTS "DayMultiplier_restaurantId_dayOfWeek_key" ON "DayMultiplier"("restaurantId", "dayOfWeek");
CREATE UNIQUE INDEX IF NOT EXISTS "MonthMultiplier_restaurantId_month_key" ON "MonthMultiplier"("restaurantId", "month");
CREATE INDEX IF NOT EXISTS "EventModifier_restaurantId_startsOn_endsOn_idx" ON "EventModifier"("restaurantId", "startsOn", "endsOn");
CREATE UNIQUE INDEX IF NOT EXISTS "CookPlan_restaurantId_serviceDate_scenarioId_key" ON "CookPlan"("restaurantId", "serviceDate", "scenarioId");
CREATE INDEX IF NOT EXISTS "CookPlan_restaurantId_serviceDate_idx" ON "CookPlan"("restaurantId", "serviceDate");
CREATE INDEX IF NOT EXISTS "CookPlan_scenarioId_idx" ON "CookPlan"("scenarioId");
CREATE INDEX IF NOT EXISTS "CookPlanItem_restaurantId_cookPlanId_idx" ON "CookPlanItem"("restaurantId", "cookPlanId");
CREATE INDEX IF NOT EXISTS "CookPlanItem_restaurantId_proteinId_idx" ON "CookPlanItem"("restaurantId", "proteinId");
CREATE UNIQUE INDEX IF NOT EXISTS "EndOfDayLog_restaurantId_serviceDate_key" ON "EndOfDayLog"("restaurantId", "serviceDate");
CREATE INDEX IF NOT EXISTS "EndOfDayLog_restaurantId_serviceDate_idx" ON "EndOfDayLog"("restaurantId", "serviceDate");
CREATE INDEX IF NOT EXISTS "EndOfDayProteinLog_restaurantId_endOfDayLogId_idx" ON "EndOfDayProteinLog"("restaurantId", "endOfDayLogId");
CREATE INDEX IF NOT EXISTS "EndOfDayProteinLog_restaurantId_proteinId_idx" ON "EndOfDayProteinLog"("restaurantId", "proteinId");
CREATE UNIQUE INDEX IF NOT EXISTS "Smoker_restaurantId_name_key" ON "Smoker"("restaurantId", "name");
CREATE INDEX IF NOT EXISTS "Smoker_restaurantId_active_idx" ON "Smoker"("restaurantId", "active");
CREATE INDEX IF NOT EXISTS "LearningRecommendation_restaurantId_status_createdAt_idx" ON "LearningRecommendation"("restaurantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "SystemCheck_restaurantId_type_createdAt_idx" ON "SystemCheck"("restaurantId", "type", "createdAt");

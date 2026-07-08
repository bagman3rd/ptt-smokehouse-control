CREATE TYPE "Role" AS ENUM ('CONSULTANT', 'OWNER', 'KM', 'PITMASTER', 'VIEWER');
CREATE TYPE "ScenarioType" AS ENUM ('CONSERVATIVE', 'BASE', 'AGGRESSIVE', 'EVENT_DAY');
CREATE TYPE "ProteinUnit" AS ENUM ('EACH', 'RACK', 'LB_RAW', 'LB_COOKED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'VIEWER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Protein" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "inputUnit" "ProteinUnit" NOT NULL,
  "rawWeightEachLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cookedYieldPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "sandwichOz" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "plateOz" DOUBLE PRECISION NOT NULL DEFAULT 7,
  "minCookUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxCookUnits" DOUBLE PRECISION NOT NULL DEFAULT 999,
  "reusableLeftover" BOOLEAN NOT NULL DEFAULT true,
  "maxReuseHours" INTEGER NOT NULL DEFAULT 24,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Protein_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Protein_name_key" ON "Protein"("name");

CREATE TABLE "ForecastScenario" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ScenarioType" NOT NULL,
  "annualSales" DOUBLE PRECISION NOT NULL,
  "bbqSalesPercent" DOUBLE PRECISION NOT NULL DEFAULT 55,
  "safetyFactorPct" DOUBLE PRECISION NOT NULL DEFAULT 8,
  "brisketMixPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
  "porkMixPct" DOUBLE PRECISION NOT NULL DEFAULT 40,
  "ribsMixPct" DOUBLE PRECISION NOT NULL DEFAULT 15,
  "chickenMixPct" DOUBLE PRECISION NOT NULL DEFAULT 15,
  "averagePricePerLbCooked" DOUBLE PRECISION NOT NULL DEFAULT 31,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForecastScenario_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ForecastScenario_name_key" ON "ForecastScenario"("name");

CREATE TABLE "DayMultiplier" (
  "id" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  CONSTRAINT "DayMultiplier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DayMultiplier_dayOfWeek_key" ON "DayMultiplier"("dayOfWeek");

CREATE TABLE "MonthMultiplier" (
  "id" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  CONSTRAINT "MonthMultiplier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MonthMultiplier_month_key" ON "MonthMultiplier"("month");

CREATE TABLE "EventModifier" (
  "id" TEXT NOT NULL,
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
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "forecastSales" DOUBLE PRECISION NOT NULL,
  "forecastBbqSales" DOUBLE PRECISION NOT NULL,
  "confidence" TEXT NOT NULL DEFAULT 'LOW',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdBy" TEXT NOT NULL DEFAULT 'Archer',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CookPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CookPlan_serviceDate_key" ON "CookPlan"("serviceDate");

CREATE TABLE "CookPlanItem" (
  "id" TEXT NOT NULL,
  "cookPlanId" TEXT NOT NULL,
  "proteinId" TEXT NOT NULL,
  "cookedLbNeeded" DOUBLE PRECISION NOT NULL,
  "usableLeftoverLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
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
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "enteredBy" TEXT NOT NULL DEFAULT 'KM',
  "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bbqSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EndOfDayLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EndOfDayLog_serviceDate_key" ON "EndOfDayLog"("serviceDate");

CREATE TABLE "EndOfDayProteinLog" (
  "id" TEXT NOT NULL,
  "endOfDayLogId" TEXT NOT NULL,
  "proteinId" TEXT NOT NULL,
  "cookedUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "soldCookedLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "usableLeftoverLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wasteLb" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "eightySixed" BOOLEAN NOT NULL DEFAULT false,
  "wasteReason" TEXT,
  CONSTRAINT "EndOfDayProteinLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CookPlan" ADD CONSTRAINT "CookPlan_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ForecastScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CookPlanItem" ADD CONSTRAINT "CookPlanItem_cookPlanId_fkey" FOREIGN KEY ("cookPlanId") REFERENCES "CookPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CookPlanItem" ADD CONSTRAINT "CookPlanItem_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EndOfDayProteinLog" ADD CONSTRAINT "EndOfDayProteinLog_endOfDayLogId_fkey" FOREIGN KEY ("endOfDayLogId") REFERENCES "EndOfDayLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndOfDayProteinLog" ADD CONSTRAINT "EndOfDayProteinLog_proteinId_fkey" FOREIGN KEY ("proteinId") REFERENCES "Protein"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

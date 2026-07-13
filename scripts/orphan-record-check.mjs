#!/usr/bin/env node
/*
  Fails if tenant-scoped records exist without restaurantId.
  Uses SQL so the check remains valid after Prisma marks core tenant fields non-null.
*/
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tables = [
  'Protein', 'ForecastScenario', 'DayMultiplier', 'MonthMultiplier',
  'CookPlan', 'CookPlanItem', 'EndOfDayLog', 'EndOfDayProteinLog',
  'SavedReport', 'ReportRun', 'Smoker', 'LearningRecommendation', 'SystemCheck', 'AuditLog'
];

async function main() {
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${table}" WHERE "restaurantId" IS NULL`);
    const count = Number(rows[0]?.count ?? 0);
    assert.equal(count, 0, `${table} has ${count} orphan records with restaurantId=null`);
  }
  console.log('Build 7.8.2 orphan record check completed. No tenant-scoped orphan records found.');
}

main().finally(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

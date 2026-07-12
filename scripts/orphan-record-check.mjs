#!/usr/bin/env node
/*
  Fails if tenant-scoped operating records exist without restaurantId.
  Run against staging/CI before adding external customers.
*/
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countOrphans(modelName, delegate) {
  const count = await delegate.count({ where: { restaurantId: null } });
  assert.equal(count, 0, `${modelName} has ${count} orphan records with restaurantId=null`);
}

async function main() {
  await countOrphans('Protein', prisma.protein);
  await countOrphans('ForecastScenario', prisma.forecastScenario);
  await countOrphans('DayMultiplier', prisma.dayMultiplier);
  await countOrphans('MonthMultiplier', prisma.monthMultiplier);
  await countOrphans('CookPlan', prisma.cookPlan);
  await countOrphans('CookPlanItem', prisma.cookPlanItem);
  await countOrphans('EndOfDayLog', prisma.endOfDayLog);
  await countOrphans('EndOfDayProteinLog', prisma.endOfDayProteinLog);
  await countOrphans('SavedReport', prisma.savedReport);
  await countOrphans('ReportRun', prisma.reportRun);
  await countOrphans('Smoker', prisma.smoker);
  await countOrphans('LearningRecommendation', prisma.learningRecommendation);
  await countOrphans('SystemCheck', prisma.systemCheck);
  console.log('Build 4.7.0 orphan record check completed. No tenant-scoped orphan records found.');
}

main().finally(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

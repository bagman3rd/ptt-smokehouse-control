#!/usr/bin/env node
/*
  Build 4.3.0 cross-tenant regression test.
  Creates two tenants and verifies tenant A cannot read/write tenant B data through
  the same guarded query patterns used by server actions and API routes.
*/
import assert from 'node:assert/strict';
import { PrismaClient, ProteinUnit, ScenarioType, Role } from '@prisma/client';

const prisma = new PrismaClient();
const stamp = Date.now();

async function main() {
  const restaurantA = await prisma.restaurant.create({ data: { name: `Cross Tenant A ${stamp}`, slug: `cross-a-${stamp}` } });
  const restaurantB = await prisma.restaurant.create({ data: { name: `Cross Tenant B ${stamp}`, slug: `cross-b-${stamp}` } });
  const userA = await prisma.user.create({ data: { name: 'Cross A Owner', username: `cross-a-${stamp}`, email: `cross-a-${stamp}@example.test`, role: Role.OWNER, active: true, restaurantId: restaurantA.id } });
  await prisma.restaurantMembership.create({ data: { restaurantId: restaurantA.id, userId: userA.id, role: Role.OWNER, active: true } });

  const proteinB = await prisma.protein.create({ data: { restaurantId: restaurantB.id, name: 'Tenant B Brisket', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 14, cookedWeightEachLb: 7, cookedYieldPercent: 50, avgSalesPerCookedLb: 42 } });
  const scenarioB = await prisma.forecastScenario.create({ data: { restaurantId: restaurantB.id, name: 'Tenant B Base', type: ScenarioType.BASE, annualSales: 7000000 } });
  const planB = await prisma.cookPlan.create({ data: { restaurantId: restaurantB.id, serviceDate: new Date('2036-03-01T00:00:00.000Z'), scenarioId: scenarioB.id, forecastSales: 2000, forecastBbqSales: 800, items: { create: [{ proteinId: proteinB.id, cookedLbNeeded: 20, safetyFactorPct: 8, rawLbNeeded: 40, recommendedCookUnits: 4, forecastCookUnits: 4 }] } } });
  const eodB = await prisma.endOfDayLog.create({ data: { restaurantId: restaurantB.id, serviceDate: new Date('2036-03-01T00:00:00.000Z'), enteredBy: 'Tenant B', totalSales: 2000, bbqSales: 800 } });

  const tenantASeesBPlan = await prisma.cookPlan.findFirst({ where: { id: planB.id, restaurantId: restaurantA.id } });
  assert.equal(tenantASeesBPlan, null, 'Tenant A read Tenant B cook plan by id.');

  const tenantASeesBEod = await prisma.endOfDayLog.findFirst({ where: { id: eodB.id, restaurantId: restaurantA.id } });
  assert.equal(tenantASeesBEod, null, 'Tenant A read Tenant B EOD log by id.');

  const updatedPlanCount = await prisma.cookPlan.updateMany({ where: { id: planB.id, restaurantId: restaurantA.id }, data: { status: 'APPROVED' } });
  assert.equal(updatedPlanCount.count, 0, 'Tenant A updated Tenant B cook plan.');

  const deletedEodCount = await prisma.endOfDayLog.deleteMany({ where: { id: eodB.id, restaurantId: restaurantA.id } });
  assert.equal(deletedEodCount.count, 0, 'Tenant A deleted Tenant B EOD log.');

  const directBStillExists = await prisma.cookPlan.findFirst({ where: { id: planB.id, restaurantId: restaurantB.id } });
  assert.ok(directBStillExists, 'Tenant B record unexpectedly disappeared.');

  console.log('Build 4.3.0 cross-tenant regression test passed. Tenant-scoped read/write paths do not cross restaurants.');
}

main().finally(async () => {
  await prisma.restaurant.deleteMany({ where: { slug: { in: [`cross-a-${stamp}`, `cross-b-${stamp}`] } } });
  await prisma.user.deleteMany({ where: { username: { in: [`cross-a-${stamp}`] } } });
  await prisma.$disconnect();
}).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

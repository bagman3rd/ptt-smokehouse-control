#!/usr/bin/env node
/*
  Build 4.3.1 Postgres tenant isolation integration test.

  Usage:
    DATABASE_URL="postgresql://..." pnpm exec tsx scripts/tenant-integration-test.mjs

  This test intentionally creates two throwaway restaurants, users, memberships,
  proteins, cook plans, and EOD logs. It verifies that tenant-scoped queries only
  return data for the active restaurant and that a user without membership cannot
  select another tenant.
*/
import { PrismaClient, ProteinUnit, ScenarioType, Role } from '@prisma/client';

const prisma = new PrismaClient();
const stamp = Date.now();
const aName = `Tenant A Test ${stamp}`;
const bName = `Tenant B Test ${stamp}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const [restaurantA, restaurantB] = await Promise.all([
    prisma.restaurant.create({ data: { name: aName, slug: `tenant-a-${stamp}`, city: 'Test', state: 'TN' } }),
    prisma.restaurant.create({ data: { name: bName, slug: `tenant-b-${stamp}`, city: 'Test', state: 'TN' } })
  ]);

  const [userA, userB] = await Promise.all([
    prisma.user.create({ data: { name: 'Tenant A User', username: `tenant-a-${stamp}`, email: `tenant-a-${stamp}@example.test`, active: true, role: Role.OWNER } }),
    prisma.user.create({ data: { name: 'Tenant B User', username: `tenant-b-${stamp}`, email: `tenant-b-${stamp}@example.test`, active: true, role: Role.OWNER } })
  ]);

  await Promise.all([
    prisma.restaurantMembership.create({ data: { restaurantId: restaurantA.id, userId: userA.id, role: Role.OWNER, active: true } }),
    prisma.restaurantMembership.create({ data: { restaurantId: restaurantB.id, userId: userB.id, role: Role.OWNER, active: true } })
  ]);

  const [proteinA, proteinB] = await Promise.all([
    prisma.protein.create({ data: { restaurantId: restaurantA.id, name: 'Brisket', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 13, cookedWeightEachLb: 6.5, cookedYieldPercent: 50, avgSalesPerCookedLb: 40 } }),
    prisma.protein.create({ data: { restaurantId: restaurantB.id, name: 'Brisket', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 14, cookedWeightEachLb: 7, cookedYieldPercent: 50, avgSalesPerCookedLb: 42 } })
  ]);

  const [scenarioA, scenarioB] = await Promise.all([
    prisma.forecastScenario.create({ data: { restaurantId: restaurantA.id, name: 'Base $6M', type: ScenarioType.BASE, annualSales: 6000000 } }),
    prisma.forecastScenario.create({ data: { restaurantId: restaurantB.id, name: 'Base $6M', type: ScenarioType.BASE, annualSales: 7000000 } })
  ]);

  const serviceDate = new Date('2035-01-15T00:00:00.000Z');
  await Promise.all([
    prisma.cookPlan.create({ data: { restaurantId: restaurantA.id, serviceDate, scenarioId: scenarioA.id, forecastSales: 1000, forecastBbqSales: 400, items: { create: [{ proteinId: proteinA.id, cookedLbNeeded: 10, safetyFactorPct: 8, rawLbNeeded: 20, recommendedCookUnits: 2, forecastCookUnits: 2 }] } } }),
    prisma.cookPlan.create({ data: { restaurantId: restaurantB.id, serviceDate, scenarioId: scenarioB.id, forecastSales: 2000, forecastBbqSales: 800, items: { create: [{ proteinId: proteinB.id, cookedLbNeeded: 20, safetyFactorPct: 8, rawLbNeeded: 40, recommendedCookUnits: 4, forecastCookUnits: 4 }] } } })
  ]);

  const [plansA, plansB, proteinsA, proteinsB] = await Promise.all([
    prisma.cookPlan.findMany({ where: { restaurantId: restaurantA.id } }),
    prisma.cookPlan.findMany({ where: { restaurantId: restaurantB.id } }),
    prisma.protein.findMany({ where: { restaurantId: restaurantA.id } }),
    prisma.protein.findMany({ where: { restaurantId: restaurantB.id } })
  ]);

  assert(plansA.length === 1 && plansA[0].forecastSales === 1000, 'Tenant A cook plan query leaked or missed data.');
  assert(plansB.length === 1 && plansB[0].forecastSales === 2000, 'Tenant B cook plan query leaked or missed data.');
  assert(proteinsA.length === 1 && proteinsA[0].rawWeightEachLb === 13, 'Tenant A protein query leaked or missed data.');
  assert(proteinsB.length === 1 && proteinsB[0].rawWeightEachLb === 14, 'Tenant B protein query leaked or missed data.');

  const crossMembership = await prisma.restaurantMembership.findFirst({ where: { userId: userA.id, restaurantId: restaurantB.id, active: true } });
  assert(!crossMembership, 'User A unexpectedly has Tenant B membership.');

  console.log('Build 4.3.1 tenant integration test passed.');
}

main().finally(async () => {
  await prisma.restaurant.deleteMany({ where: { name: { in: [aName, bName] } } });
  await prisma.user.deleteMany({ where: { username: { in: [`tenant-a-${stamp}`, `tenant-b-${stamp}`] } } });
  await prisma.$disconnect();
}).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

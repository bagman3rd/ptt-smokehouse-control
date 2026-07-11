import { PrismaClient, ProteinUnit, ScenarioType, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({ where: { email: 'archer@example.com' }, update: {}, create: { name: 'Archer', email: 'archer@example.com', role: Role.CONSULTANT } });

  const proteins = [
    { name: 'Brisket', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 13, cookedWeightEachLb: 6.5, cookedYieldPercent: 50, avgSalesPerCookedLb: 40, purchaseCostEach: 0, salesPriceEach: 0, sandwichOz: 5, plateOz: 7, minCookUnits: 1, maxCookUnits: 88, reusableLeftover: true, maxReuseHours: 24, updatedBy: 'System Seed' },
    { name: 'Pulled Pork', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 9, cookedWeightEachLb: 4.95, cookedYieldPercent: 55, avgSalesPerCookedLb: 22, purchaseCostEach: 0, salesPriceEach: 0, sandwichOz: 5, plateOz: 7, minCookUnits: 2, maxCookUnits: 84, reusableLeftover: true, maxReuseHours: 36, updatedBy: 'System Seed' },
    { name: 'Ribs', inputUnit: ProteinUnit.RACK, rawWeightEachLb: 3.3, cookedWeightEachLb: 3.0, cookedYieldPercent: 90.9, avgSalesPerCookedLb: 11, purchaseCostEach: 10, salesPriceEach: 33, sandwichOz: 0, plateOz: 0, minCookUnits: 6, maxCookUnits: 240, reusableLeftover: true, maxReuseHours: 24, updatedBy: 'System Seed' },
    { name: 'Pulled Chicken', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 2.5, cookedWeightEachLb: 1.875, cookedYieldPercent: 75, avgSalesPerCookedLb: 22, purchaseCostEach: 0, salesPriceEach: 0, sandwichOz: 5, plateOz: 7, minCookUnits: 8, maxCookUnits: 220, reusableLeftover: true, maxReuseHours: 36, updatedBy: 'System Seed' }
  ];
  for (const protein of proteins) await prisma.protein.upsert({ where: { name: protein.name }, update: {}, create: protein });

  const scenarios = [
    { name: 'Base $6M', type: ScenarioType.BASE, annualSales: 6000000, bbqSalesPercent: 40, safetyFactorPct: 8, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, updatedBy: 'System Seed' },
    { name: 'Aggressive $8M', type: ScenarioType.AGGRESSIVE, annualSales: 8000000, bbqSalesPercent: 40, safetyFactorPct: 10, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, updatedBy: 'System Seed' }
  ];
  for (const scenario of scenarios) await prisma.forecastScenario.upsert({ where: { name: scenario.name }, update: {}, create: scenario });

  const days = [[0,'Sunday',1.33], [1,'Monday',0.63], [2,'Tuesday',0.56], [3,'Wednesday',0.70], [4,'Thursday',0.84], [5,'Friday',1.19], [6,'Saturday',1.75]] as const;
  for (const [dayOfWeek,label,multiplier] of days) await prisma.dayMultiplier.upsert({ where: { dayOfWeek }, update: {}, create: { dayOfWeek, label, multiplier, updatedBy: 'System Seed' } });

  const months = [[1,'January',0.584],[2,'February',0.555],[3,'March',0.808],[4,'April',0.935],[5,'May',0.954],[6,'June',1.320],[7,'July',1.506],[8,'August',1.163],[9,'September',0.890],[10,'October',1.232],[11,'November',0.821],[12,'December',1.232]] as const;
  for (const [month,label,multiplier] of months) await prisma.monthMultiplier.upsert({ where: { month }, update: {}, create: { month, label, multiplier, updatedBy: 'System Seed' } });

  await prisma.eventModifier.upsert({
    where: { id: 'rod-run-placeholder' },
    update: {},
    create: { id: 'rod-run-placeholder', name: 'Rod Run Multiplier Reference', startsOn: new Date('2026-09-10T00:00:00Z'), endsOn: new Date('2026-09-13T00:00:00Z'), multiplier: 1.75, notes: 'Use Base/Aggressive forecast scenario plus manual event multiplier for Rod Run and event surges.' }
  });
}

main().finally(async () => prisma.$disconnect());

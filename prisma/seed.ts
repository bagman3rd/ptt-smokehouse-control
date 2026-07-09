import { PrismaClient, ProteinUnit, ScenarioType, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({ where: { email: 'archer@example.com' }, update: {}, create: { name: 'Archer', email: 'archer@example.com', role: Role.CONSULTANT } });
  const proteins = [
    { name: 'Brisket', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 13, cookedYieldPercent: 50, sandwichOz: 5, plateOz: 7, minCookUnits: 1, maxCookUnits: 88, reusableLeftover: true, maxReuseHours: 24 },
    { name: 'Pulled Pork', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 9, cookedYieldPercent: 50, sandwichOz: 5, plateOz: 7, minCookUnits: 2, maxCookUnits: 84, reusableLeftover: true, maxReuseHours: 36 },
    { name: 'Ribs', inputUnit: ProteinUnit.RACK, rawWeightEachLb: 3.2, cookedYieldPercent: 72, sandwichOz: 0, plateOz: 0, minCookUnits: 6, maxCookUnits: 240, reusableLeftover: true, maxReuseHours: 24 },
    { name: 'Pulled Chicken', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 2.75, cookedYieldPercent: 58, sandwichOz: 5, plateOz: 7, minCookUnits: 8, maxCookUnits: 220, reusableLeftover: true, maxReuseHours: 36 }
  ];
  for (const p of proteins) await prisma.protein.upsert({ where: { name: p.name }, update: p, create: p });

  const rodRunDefaults = { name: 'ROD RUN', type: ScenarioType.EVENT_DAY, annualSales: 12000000, bbqSalesPercent: 60, safetyFactorPct: 15, brisketMixPct: 32, porkMixPct: 38, ribsMixPct: 16, chickenMixPct: 14, averagePricePerLbCooked: 32 };
  const existingRodRun = await prisma.forecastScenario.findUnique({ where: { name: 'ROD RUN' } });
  const existingEventDay = await prisma.forecastScenario.findUnique({ where: { name: 'Event Day' } });
  if (existingEventDay && !existingRodRun) {
    await prisma.forecastScenario.update({ where: { id: existingEventDay.id }, data: rodRunDefaults });
  } else if (existingEventDay && existingRodRun) {
    await prisma.forecastScenario.update({ where: { id: existingEventDay.id }, data: { name: 'Legacy Event Day', annualSales: 12000000 } }).catch(() => null);
  }
  await prisma.forecastScenario.updateMany({ where: { name: 'Conservative $6M' }, data: { name: 'Legacy Conservative $6M' } }).catch(() => null);

  const scenarios = [
    { name: 'Base $6M', type: ScenarioType.BASE, annualSales: 6000000, bbqSalesPercent: 55, safetyFactorPct: 8, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, averagePricePerLbCooked: 31 },
    { name: 'Aggressive $8M', type: ScenarioType.AGGRESSIVE, annualSales: 8000000, bbqSalesPercent: 58, safetyFactorPct: 10, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, averagePricePerLbCooked: 31 },
    rodRunDefaults
  ];
  for (const s of scenarios) await prisma.forecastScenario.upsert({ where: { name: s.name }, update: s, create: s });

  const days = [
    [0,'Sunday',1.04], [1,'Monday',0.78], [2,'Tuesday',0.82], [3,'Wednesday',0.88], [4,'Thursday',0.96], [5,'Friday',1.17], [6,'Saturday',1.35]
  ] as const;
  for (const [dayOfWeek,label,multiplier] of days) await prisma.dayMultiplier.upsert({ where: { dayOfWeek }, update: { label, multiplier }, create: { dayOfWeek, label, multiplier } });

  const months = [
    [1,'January',0.68],[2,'February',0.72],[3,'March',0.92],[4,'April',1.08],[5,'May',1.05],[6,'June',1.22],[7,'July',1.28],[8,'August',1.14],[9,'September',1.05],[10,'October',1.18],[11,'November',0.95],[12,'December',0.92]
  ] as const;
  for (const [month,label,multiplier] of months) await prisma.monthMultiplier.upsert({ where: { month }, update: { label, multiplier }, create: { month, label, multiplier } });

  await prisma.eventModifier.upsert({
    where: { id: 'rod-run-placeholder' },
    update: { name: 'ROD RUN Placeholder', multiplier: 1.75, notes: 'Use ROD RUN scenario plus manual event multiplier until event calendar automation is added.' },
    create: { id: 'rod-run-placeholder', name: 'ROD RUN Placeholder', startsOn: new Date('2026-09-10T00:00:00Z'), endsOn: new Date('2026-09-13T00:00:00Z'), multiplier: 1.75, notes: 'Use ROD RUN scenario plus manual event multiplier until event calendar automation is added.' }
  });
}

main().finally(async () => prisma.$disconnect());

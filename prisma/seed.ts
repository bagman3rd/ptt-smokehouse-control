import { PrismaClient, ProteinUnit, ScenarioType, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({ where: { email: 'archer@example.com' }, update: {}, create: { name: 'Archer', email: 'archer@example.com', role: Role.CONSULTANT } });
  const proteins = [
    { name: 'Brisket', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 13, cookedYieldPercent: 50, sandwichOz: 5, plateOz: 7, minCookUnits: 1, maxCookUnits: 88, reusableLeftover: true, maxReuseHours: 24 },
    { name: 'Pulled Pork', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 9, cookedYieldPercent: 55, sandwichOz: 5, plateOz: 7, minCookUnits: 2, maxCookUnits: 84, reusableLeftover: true, maxReuseHours: 36 },
    { name: 'Ribs', inputUnit: ProteinUnit.RACK, rawWeightEachLb: 3.2, cookedYieldPercent: 90, sandwichOz: 0, plateOz: 0, minCookUnits: 6, maxCookUnits: 240, reusableLeftover: true, maxReuseHours: 24 },
    { name: 'Pulled Chicken', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 2.75, cookedYieldPercent: 75, sandwichOz: 5, plateOz: 7, minCookUnits: 8, maxCookUnits: 220, reusableLeftover: true, maxReuseHours: 36 }
  ];
  for (const p of proteins) await prisma.protein.upsert({ where: { name: p.name }, update: p, create: p });

  // ROD RUN is no longer a forecast scenario; use Base/Aggressive plus the Event Multiplier.
  for (const legacyName of ['Conservative $6M', 'Event Day', 'ROD RUN']) {
    await prisma.forecastScenario.updateMany({
      where: { name: legacyName },
      data: { name: `Legacy ${legacyName}` }
    }).catch(() => null);
  }

  const scenarios = [
    { name: 'Base $6M', type: ScenarioType.BASE, annualSales: 6000000, bbqSalesPercent: 55, safetyFactorPct: 8, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, averagePricePerLbCooked: 31 },
    { name: 'Aggressive $8M', type: ScenarioType.AGGRESSIVE, annualSales: 8000000, bbqSalesPercent: 58, safetyFactorPct: 10, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, averagePricePerLbCooked: 31 }
  ];
  for (const s of scenarios) await prisma.forecastScenario.upsert({ where: { name: s.name }, update: s, create: s });

  const days = [
    [0,'Sunday',1.33], [1,'Monday',0.63], [2,'Tuesday',0.56], [3,'Wednesday',0.70], [4,'Thursday',0.84], [5,'Friday',1.19], [6,'Saturday',1.75]
  ] as const;
  for (const [dayOfWeek,label,multiplier] of days) await prisma.dayMultiplier.upsert({ where: { dayOfWeek }, update: { label, multiplier }, create: { dayOfWeek, label, multiplier } });

  const months = [
    [1,'January',0.584],[2,'February',0.555],[3,'March',0.808],[4,'April',0.935],[5,'May',0.954],[6,'June',1.320],[7,'July',1.506],[8,'August',1.163],[9,'September',0.890],[10,'October',1.232],[11,'November',0.821],[12,'December',1.232]
  ] as const;
  for (const [month,label,multiplier] of months) await prisma.monthMultiplier.upsert({ where: { month }, update: { label, multiplier }, create: { month, label, multiplier } });

  await prisma.eventModifier.upsert({
    where: { id: 'rod-run-placeholder' },
    update: { name: 'Rod Run Multiplier Reference', multiplier: 1.75, notes: 'Use Base/Aggressive forecast scenario plus manual event multiplier for Rod Run and event surges.' },
    create: { id: 'rod-run-placeholder', name: 'Rod Run Multiplier Reference', startsOn: new Date('2026-09-10T00:00:00Z'), endsOn: new Date('2026-09-13T00:00:00Z'), multiplier: 1.75, notes: 'Use Base/Aggressive forecast scenario plus manual event multiplier for Rod Run and event surges.' }
  });
}

main().finally(async () => prisma.$disconnect());

import { PrismaClient, ProteinUnit, ScenarioType, Role } from '@prisma/client';

const activeScenarioNames = ['Base $6M', 'Aggressive $8M', 'ROD RUN'];

export async function ensureDefaultData(prisma: PrismaClient) {
  const [proteinCount, dayCount, monthCount] = await Promise.all([
    prisma.protein.count(),
    prisma.dayMultiplier.count(),
    prisma.monthMultiplier.count()
  ]);

  if (proteinCount === 0) {
    const proteins = [
      { name: 'Brisket', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 13, cookedYieldPercent: 50, sandwichOz: 5, plateOz: 7, minCookUnits: 1, maxCookUnits: 88, reusableLeftover: true, maxReuseHours: 24 },
      { name: 'Pulled Pork', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 9, cookedYieldPercent: 50, sandwichOz: 5, plateOz: 7, minCookUnits: 2, maxCookUnits: 84, reusableLeftover: true, maxReuseHours: 36 },
      { name: 'Ribs', inputUnit: ProteinUnit.RACK, rawWeightEachLb: 3.2, cookedYieldPercent: 72, sandwichOz: 0, plateOz: 0, minCookUnits: 6, maxCookUnits: 240, reusableLeftover: true, maxReuseHours: 24 },
      { name: 'Pulled Chicken', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 2.75, cookedYieldPercent: 58, sandwichOz: 5, plateOz: 7, minCookUnits: 8, maxCookUnits: 220, reusableLeftover: true, maxReuseHours: 36 }
    ];
    for (const p of proteins) await prisma.protein.upsert({ where: { name: p.name }, update: p, create: p });
  }

  // Forecast scenarios are normalized every time the app boots so deployed databases
  // pick up planning-model changes without manual database editing.
  const rodRunDefaults = {
    name: 'ROD RUN',
    type: ScenarioType.EVENT_DAY,
    annualSales: 12000000,
    bbqSalesPercent: 60,
    safetyFactorPct: 15,
    brisketMixPct: 32,
    porkMixPct: 38,
    ribsMixPct: 16,
    chickenMixPct: 14,
    averagePricePerLbCooked: 32
  };

  const existingRodRun = await prisma.forecastScenario.findUnique({ where: { name: 'ROD RUN' } });
  const existingEventDay = await prisma.forecastScenario.findUnique({ where: { name: 'Event Day' } });
  if (existingEventDay && !existingRodRun) {
    await prisma.forecastScenario.update({ where: { id: existingEventDay.id }, data: rodRunDefaults });
  } else if (existingEventDay && existingRodRun) {
    // If old plans reference Event Day, deletion can fail. In that case, rename it so it stays hidden.
    await prisma.forecastScenario.update({ where: { id: existingEventDay.id }, data: { name: 'Legacy Event Day', annualSales: 12000000 } }).catch(() => null);
  }

  await prisma.forecastScenario.updateMany({
    where: { name: 'Conservative $6M' },
    data: { name: 'Legacy Conservative $6M' }
  }).catch(() => null);

  const scenarios = [
    { name: 'Base $6M', type: ScenarioType.BASE, annualSales: 6000000, bbqSalesPercent: 55, safetyFactorPct: 8, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, averagePricePerLbCooked: 31 },
    { name: 'Aggressive $8M', type: ScenarioType.AGGRESSIVE, annualSales: 8000000, bbqSalesPercent: 58, safetyFactorPct: 10, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, averagePricePerLbCooked: 31 },
    rodRunDefaults
  ];
  for (const s of scenarios) await prisma.forecastScenario.upsert({ where: { name: s.name }, update: s, create: s });

  if (dayCount === 0) {
    const days = [
      [0, 'Sunday', 1.04], [1, 'Monday', 0.78], [2, 'Tuesday', 0.82], [3, 'Wednesday', 0.88], [4, 'Thursday', 0.96], [5, 'Friday', 1.17], [6, 'Saturday', 1.35]
    ] as const;
    for (const [dayOfWeek, label, multiplier] of days) await prisma.dayMultiplier.upsert({ where: { dayOfWeek }, update: { label, multiplier }, create: { dayOfWeek, label, multiplier } });
  }

  if (monthCount === 0) {
    const months = [
      [1, 'January', 0.68], [2, 'February', 0.72], [3, 'March', 0.92], [4, 'April', 1.08], [5, 'May', 1.05], [6, 'June', 1.22], [7, 'July', 1.28], [8, 'August', 1.14], [9, 'September', 1.05], [10, 'October', 1.18], [11, 'November', 0.95], [12, 'December', 0.92]
    ] as const;
    for (const [month, label, multiplier] of months) await prisma.monthMultiplier.upsert({ where: { month }, update: { label, multiplier }, create: { month, label, multiplier } });
  }

  await prisma.user.upsert({ where: { email: 'archer@example.com' }, update: {}, create: { name: 'Archer', email: 'archer@example.com', role: Role.CONSULTANT } });
}

export function activeScenarioWhere() {
  return { name: { in: activeScenarioNames } };
}

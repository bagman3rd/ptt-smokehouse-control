import { ProteinUnit, ScenarioType } from '@prisma/client';

export type StarterProfile = 'generic' | 'tourist' | 'demo';

export function slugifyRestaurant(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || `restaurant-${Date.now()}`;
}

export async function createDefaultRestaurantData(prisma: any, restaurantId: string, profile: StarterProfile = 'generic') {
  const proteins = [
    { name: 'Brisket', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 13, cookedWeightEachLb: 6.5, cookedYieldPercent: 50, avgSalesPerCookedLb: 38, purchaseCostEach: 0, salesPriceEach: 0, sandwichOz: 5, plateOz: 7, minCookUnits: 1, maxCookUnits: 80, reusableLeftover: true, maxReuseHours: 24, updatedBy: 'Self-Service Setup' },
    { name: 'Pulled Pork', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 9, cookedWeightEachLb: 4.95, cookedYieldPercent: 55, avgSalesPerCookedLb: 21, purchaseCostEach: 0, salesPriceEach: 0, sandwichOz: 5, plateOz: 7, minCookUnits: 2, maxCookUnits: 84, reusableLeftover: true, maxReuseHours: 36, updatedBy: 'Self-Service Setup' },
    { name: 'Ribs', inputUnit: ProteinUnit.RACK, rawWeightEachLb: 3.3, cookedWeightEachLb: 3.0, cookedYieldPercent: 90.9, avgSalesPerCookedLb: 11, purchaseCostEach: 10, salesPriceEach: 33, sandwichOz: 0, plateOz: 0, minCookUnits: 4, maxCookUnits: 200, reusableLeftover: true, maxReuseHours: 24, updatedBy: 'Self-Service Setup' },
    { name: 'Pulled Chicken', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 2.5, cookedWeightEachLb: 1.875, cookedYieldPercent: 75, avgSalesPerCookedLb: 20, purchaseCostEach: 0, salesPriceEach: 0, sandwichOz: 5, plateOz: 7, minCookUnits: 6, maxCookUnits: 180, reusableLeftover: true, maxReuseHours: 36, updatedBy: 'Self-Service Setup' }
  ];
  for (const protein of proteins) {
    const exists = await prisma.protein.findFirst({ where: { restaurantId, name: protein.name } });
    if (!exists) await prisma.protein.create({ data: { ...protein, restaurantId } });
  }

  const scenarios = [
    { name: 'Base Forecast', type: ScenarioType.BASE, annualSales: profile === 'demo' ? 2400000 : 3000000, bbqSalesPercent: 38, safetyFactorPct: 8, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, updatedBy: 'Self-Service Setup' },
    { name: 'Busy Forecast', type: ScenarioType.AGGRESSIVE, annualSales: profile === 'demo' ? 3200000 : 4000000, bbqSalesPercent: 40, safetyFactorPct: 10, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, updatedBy: 'Self-Service Setup' }
  ];
  for (const scenario of scenarios) {
    const exists = await prisma.forecastScenario.findFirst({ where: { restaurantId, name: scenario.name } });
    if (!exists) await prisma.forecastScenario.create({ data: { ...scenario, restaurantId } });
  }

  const genericDays = [[0,'Sunday',1.05],[1,'Monday',0.82],[2,'Tuesday',0.82],[3,'Wednesday',0.90],[4,'Thursday',1.02],[5,'Friday',1.24],[6,'Saturday',1.15]] as const;
  const touristDays = [[0,'Sunday',1.33],[1,'Monday',0.63],[2,'Tuesday',0.56],[3,'Wednesday',0.70],[4,'Thursday',0.84],[5,'Friday',1.19],[6,'Saturday',1.75]] as const;
  const days = profile === 'tourist' ? touristDays : genericDays;
  for (const [dayOfWeek, label, multiplier] of days) {
    const exists = await prisma.dayMultiplier.findFirst({ where: { restaurantId, dayOfWeek } });
    if (!exists) await prisma.dayMultiplier.create({ data: { dayOfWeek, label, multiplier, updatedBy: 'Self-Service Setup', restaurantId } });
  }

  const flatMonths = [[1,'January',0.88],[2,'February',0.88],[3,'March',0.95],[4,'April',1.00],[5,'May',1.04],[6,'June',1.08],[7,'July',1.08],[8,'August',1.04],[9,'September',1.00],[10,'October',1.02],[11,'November',1.00],[12,'December',1.03]] as const;
  const touristMonths = [[1,'January',0.584],[2,'February',0.555],[3,'March',0.808],[4,'April',0.935],[5,'May',0.954],[6,'June',1.320],[7,'July',1.506],[8,'August',1.163],[9,'September',0.890],[10,'October',1.232],[11,'November',0.821],[12,'December',1.232]] as const;
  const months = profile === 'tourist' ? touristMonths : flatMonths;
  for (const [month, label, multiplier] of months) {
    const exists = await prisma.monthMultiplier.findFirst({ where: { restaurantId, month } });
    if (!exists) await prisma.monthMultiplier.create({ data: { month, label, multiplier, updatedBy: 'Self-Service Setup', restaurantId } });
  }
}

type DemoProteinForHistory = { id: string; avgSalesPerCookedLb: number };

export async function createDemoHistory(prisma: any, restaurantId: string) {
  const proteins = await prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } }) as DemoProteinForHistory[];
  const scenario = await prisma.forecastScenario.findFirst({ where: { restaurantId }, orderBy: { annualSales: 'asc' } });
  if (!scenario || proteins.length === 0) return;
  const today = new Date();
  today.setUTCHours(0,0,0,0);
  for (let i = 28; i >= 1; i--) {
    const serviceDate = new Date(today);
    serviceDate.setUTCDate(today.getUTCDate() - i);
    const dow = serviceDate.getUTCDay();
    const sales = Math.round(6200 + dow * 350 + (i % 5) * 420);
    const bbqSales = Math.round(sales * 0.38);
    const eod = await prisma.endOfDayLog.create({ data: { restaurantId, serviceDate, totalSales: sales, bbqSales, status: 'COMPLETE', enteredBy: 'Demo System', notes: 'Demo operating data' } });
    await prisma.endOfDayProteinLog.createMany({ data: proteins.map((protein: DemoProteinForHistory, idx: number) => ({
      endOfDayLogId: eod.id,
      proteinId: protein.id,
      cookedUnits: 8 + idx * 3 + (dow === 6 ? 5 : 0),
      soldCookedLb: Math.round((bbqSales * ([0.30,0.40,0.15,0.15][idx] || 0.1)) / Math.max(1, protein.avgSalesPerCookedLb)),
      usableLeftoverUnits: i % 4 === 0 ? 2 : 1,
      usableLeftoverLb: i % 4 === 0 ? 8 : 3,
      wasteLb: i % 6 === 0 ? 6 : 2,
      eightySixed: i % 13 === 0,
      wasteReason: i % 6 === 0 ? 'Demo overproduction' : ''
    })) });
  }
}

export type ProteinForecastInput = {
  name: string;
  cookedYieldPercent: number;
  rawWeightEachLb: number;
  cookedWeightEachLb?: number;
  purchaseCostEach?: number;
  salesPriceEach?: number;
  minCookUnits: number;
  maxCookUnits: number;
  inputUnit?: string;
  avgSalesPerCookedLb?: number;
};

export type ScenarioInput = {
  annualSales: number;
  bbqSalesPercent: number;
  safetyFactorPct: number;
  brisketMixPct: number;
  porkMixPct: number;
  ribsMixPct: number;
  chickenMixPct: number;
};

export function confidenceForHistory(daysWithLogs: number) {
  if (daysWithLogs >= 28) return 'HIGH';
  if (daysWithLogs >= 7) return 'MEDIUM';
  return 'LOW';
}

export function dailySalesForecast(annualSales: number, dayMultiplier: number, monthMultiplier: number, eventMultiplier = 1) {
  const averageDailySales = annualSales / 365;
  return Math.round(averageDailySales * dayMultiplier * monthMultiplier * eventMultiplier);
}

export function proteinMixPercent(name: string, scenario: ScenarioInput) {
  const lower = name.toLowerCase();
  if (lower.includes('brisket')) return scenario.brisketMixPct;
  if (lower.includes('pork')) return scenario.porkMixPct;
  if (lower.includes('rib')) return scenario.ribsMixPct;
  if (lower.includes('chicken')) return scenario.chickenMixPct;
  return 0;
}

export function forecastProteinLoad(args: {
  protein: ProteinForecastInput;
  scenario: ScenarioInput;
  forecastBbqSales: number;
  usableLeftoverLb: number;
  usableLeftoverUnits?: number;
}) {
  const mixPct = proteinMixPercent(args.protein.name, args.scenario) / 100;
  const proteinSalesDollars = args.forecastBbqSales * mixPct;
  const leftoverUnits = Math.max(0, args.usableLeftoverUnits ?? 0);
  const lower = args.protein.name.toLowerCase();

  // Ribs are operationally managed by rack, not by cooked pounds.
  // The primary calculation is sales dollars / sales price per rack.
  // Weight/yield assumptions remain available for raw/cooked reporting.
  if (lower.includes('rib') && args.protein.inputUnit === 'RACK') {
    const salesPricePerRack = Math.max(1, args.protein.salesPriceEach ?? 33);
    const cookedLbPerRack = Math.max(0.1, args.protein.cookedWeightEachLb || (args.protein.rawWeightEachLb * (args.protein.cookedYieldPercent / 100)) || 3);
    const rawLbPerRack = Math.max(0.1, args.protein.rawWeightEachLb || 3.3);
    const grossRackNeedBeforeSafety = proteinSalesDollars / salesPricePerRack;
    const grossRackNeedWithSafety = grossRackNeedBeforeSafety * (1 + args.scenario.safetyFactorPct / 100);
    const grossCookUnits = Math.ceil(grossRackNeedWithSafety);
    const recommendedCookUnits = Math.min(
      args.protein.maxCookUnits,
      Math.max(args.protein.minCookUnits, Math.ceil(Math.max(0, grossCookUnits - leftoverUnits)))
    );

    return {
      cookedLbNeeded: round1(recommendedCookUnits * cookedLbPerRack),
      grossCookedLbNeeded: round1(grossCookUnits * cookedLbPerRack),
      rawLbNeeded: round1(recommendedCookUnits * rawLbPerRack),
      forecastCookUnits: grossCookUnits,
      recommendedCookUnits
    };
  }

  const proteinSalesPerCookedLb = Math.max(1, args.protein.avgSalesPerCookedLb ?? 22);
  const targetCookedLbBeforeLeftover = proteinSalesDollars / proteinSalesPerCookedLb;
  const grossCookedLbWithSafety = targetCookedLbBeforeLeftover * (1 + args.scenario.safetyFactorPct / 100);
  const grossRawLbNeeded = args.protein.cookedYieldPercent > 0 ? grossCookedLbWithSafety / (args.protein.cookedYieldPercent / 100) : grossCookedLbWithSafety;
  const grossCookUnits = args.protein.rawWeightEachLb > 0 ? Math.ceil(grossRawLbNeeded / args.protein.rawWeightEachLb) : Math.ceil(grossCookedLbWithSafety);

  const unitBasedLeftoverCredit = args.protein.inputUnit === 'EACH' || args.protein.inputUnit === 'RACK';
  const lbLeftoverCredit = unitBasedLeftoverCredit ? 0 : Math.max(0, args.usableLeftoverLb);
  const leftoverUnitsAsCookedLb = unitBasedLeftoverCredit
    ? leftoverUnits * args.protein.rawWeightEachLb * (args.protein.cookedYieldPercent / 100)
    : 0;

  const netCookedLb = Math.max(0, grossCookedLbWithSafety - lbLeftoverCredit - leftoverUnitsAsCookedLb);
  const rawLbNeeded = args.protein.cookedYieldPercent > 0 ? netCookedLb / (args.protein.cookedYieldPercent / 100) : netCookedLb;
  const cookUnitsBeforeClamp = unitBasedLeftoverCredit
    ? Math.max(0, grossCookUnits - leftoverUnits)
    : (args.protein.rawWeightEachLb > 0 ? rawLbNeeded / args.protein.rawWeightEachLb : netCookedLb);
  const recommendedCookUnits = Math.min(args.protein.maxCookUnits, Math.max(args.protein.minCookUnits, Math.ceil(cookUnitsBeforeClamp)));

  return {
    cookedLbNeeded: round1(netCookedLb),
    grossCookedLbNeeded: round1(grossCookedLbWithSafety),
    rawLbNeeded: round1(rawLbNeeded),
    forecastCookUnits: grossCookUnits,
    recommendedCookUnits
  };
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

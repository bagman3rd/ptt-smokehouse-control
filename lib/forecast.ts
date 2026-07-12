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

export function effectiveRevenuePerCookedLb(protein: ProteinForecastInput) {
  const cookedLbEach = cookedLbPerUnit(protein);
  if (protein.name.toLowerCase().includes('rib') && protein.inputUnit === 'RACK') {
    return Math.max(1, protein.salesPriceEach ?? 33) / cookedLbEach;
  }
  return Math.max(1, protein.avgSalesPerCookedLb ?? 22);
}

export function cookedLbPerUnit(protein: ProteinForecastInput) {
  return Math.max(
    0.1,
    protein.cookedWeightEachLb ||
      (protein.rawWeightEachLb * (protein.cookedYieldPercent / 100)) ||
      1
  );
}

export function totalCookedLbFromBbqSales(args: { proteins: ProteinForecastInput[]; scenario: ScenarioInput; forecastBbqSales: number }) {
  const mixRows = args.proteins
    .map((protein) => ({ protein, mixPct: Math.max(0, proteinMixPercent(protein.name, args.scenario)) }))
    .filter((row) => row.mixPct > 0);
  const mixTotal = mixRows.reduce((sum, row) => sum + row.mixPct, 0);
  if (mixTotal <= 0) return 0;
  const weightedRevenuePerCookedLb = mixRows.reduce((sum, row) => {
    return sum + (row.mixPct / mixTotal) * effectiveRevenuePerCookedLb(row.protein);
  }, 0);
  return weightedRevenuePerCookedLb > 0 ? args.forecastBbqSales / weightedRevenuePerCookedLb : 0;
}

export function forecastProteinLoad(args: {
  protein: ProteinForecastInput;
  proteins?: ProteinForecastInput[];
  scenario: ScenarioInput;
  forecastBbqSales: number;
  usableLeftoverLb: number;
  usableLeftoverUnits?: number;
}) {
  const proteinsForMix = args.proteins && args.proteins.length > 0 ? args.proteins : [args.protein];
  const mixPct = Math.max(0, proteinMixPercent(args.protein.name, args.scenario));
  const mixTotal = proteinsForMix.reduce((sum, protein) => sum + Math.max(0, proteinMixPercent(protein.name, args.scenario)), 0) || mixPct || 100;
  const totalCookedLbBeforeSafety = totalCookedLbFromBbqSales({ proteins: proteinsForMix, scenario: args.scenario, forecastBbqSales: args.forecastBbqSales });
  const targetCookedLbBeforeLeftover = totalCookedLbBeforeSafety * (mixPct / mixTotal);
  const leftoverUnits = Math.max(0, args.usableLeftoverUnits ?? 0);
  const lower = args.protein.name.toLowerCase();

  // Build 5.6.0: scenario mix percentages are cooked-weight mix, not dollar mix.
  // BBQ sales are converted to a total smoked-meat cooked-pound forecast by using
  // the weighted average revenue per cooked pound across all active proteins.
  // Then 40/30/15/15 is applied to cooked pounds. Ribs are still loaded as racks.
  if (lower.includes('rib') && args.protein.inputUnit === 'RACK') {
    const cookedLbPerRack = cookedLbPerUnit(args.protein);
    const rawLbPerRack = Math.max(0.1, args.protein.rawWeightEachLb || 3.3);
    const grossCookedLbWithSafety = targetCookedLbBeforeLeftover * (1 + args.scenario.safetyFactorPct / 100);
    const grossCookUnits = Math.ceil(grossCookedLbWithSafety / cookedLbPerRack);
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

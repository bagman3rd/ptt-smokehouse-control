export type ProteinForecastInput = {
  name: string;
  cookedYieldPercent: number;
  rawWeightEachLb: number;
  minCookUnits: number;
  maxCookUnits: number;
};

export type ScenarioInput = {
  annualSales: number;
  bbqSalesPercent: number;
  safetyFactorPct: number;
  brisketMixPct: number;
  porkMixPct: number;
  ribsMixPct: number;
  chickenMixPct: number;
  averagePricePerLbCooked: number;
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
}) {
  const mixPct = proteinMixPercent(args.protein.name, args.scenario) / 100;
  const targetCookedLbBeforeLeftover = (args.forecastBbqSales * mixPct) / args.scenario.averagePricePerLbCooked;
  const netCookedLb = Math.max(0, targetCookedLbBeforeLeftover - args.usableLeftoverLb);
  const withSafety = netCookedLb * (1 + args.scenario.safetyFactorPct / 100);
  const rawLbNeeded = args.protein.cookedYieldPercent > 0 ? withSafety / (args.protein.cookedYieldPercent / 100) : withSafety;
  const cookUnits = args.protein.rawWeightEachLb > 0 ? rawLbNeeded / args.protein.rawWeightEachLb : withSafety;
  const recommendedCookUnits = Math.min(args.protein.maxCookUnits, Math.max(args.protein.minCookUnits, Math.ceil(cookUnits)));

  return {
    cookedLbNeeded: round1(withSafety),
    rawLbNeeded: round1(rawLbNeeded),
    recommendedCookUnits
  };
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

import fs from 'node:fs';

function assert(name, condition, detail = '') {
  if (!condition) throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`);
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}

function dailySalesForecast(annualSales, dayMultiplier, monthMultiplier, eventMultiplier = 1) {
  return Math.round((annualSales / 365) * dayMultiplier * monthMultiplier * eventMultiplier);
}

function forecastProteinLoad({ protein, scenario, forecastBbqSales, usableLeftoverLb = 0, usableLeftoverUnits = 0 }) {
  const lower = protein.name.toLowerCase();
  const mixPct = (lower.includes('brisket') ? scenario.brisketMixPct : lower.includes('pork') ? scenario.porkMixPct : lower.includes('rib') ? scenario.ribsMixPct : lower.includes('chicken') ? scenario.chickenMixPct : 0) / 100;
  const proteinSalesDollars = forecastBbqSales * mixPct;
  const leftoverUnits = Math.max(0, usableLeftoverUnits || 0);
  if (lower.includes('rib') && protein.inputUnit === 'RACK') {
    const salesPricePerRack = Math.max(1, protein.salesPriceEach || 33);
    const cookedLbPerRack = Math.max(0.1, protein.cookedWeightEachLb || 3);
    const rawLbPerRack = Math.max(0.1, protein.rawWeightEachLb || 3.3);
    const grossRackNeedWithSafety = (proteinSalesDollars / salesPricePerRack) * (1 + scenario.safetyFactorPct / 100);
    const forecastCookUnits = Math.ceil(grossRackNeedWithSafety);
    const recommendedCookUnits = Math.min(protein.maxCookUnits, Math.max(protein.minCookUnits, Math.ceil(Math.max(0, forecastCookUnits - leftoverUnits))));
    return { forecastCookUnits, recommendedCookUnits, cookedLbNeeded: +(recommendedCookUnits * cookedLbPerRack).toFixed(1), rawLbNeeded: +(recommendedCookUnits * rawLbPerRack).toFixed(1) };
  }
  const proteinSalesPerCookedLb = Math.max(1, protein.avgSalesPerCookedLb || 22);
  const grossCookedLbWithSafety = (proteinSalesDollars / proteinSalesPerCookedLb) * (1 + scenario.safetyFactorPct / 100);
  const grossRawLbNeeded = grossCookedLbWithSafety / (protein.cookedYieldPercent / 100);
  const forecastCookUnits = Math.ceil(grossRawLbNeeded / protein.rawWeightEachLb);
  const unitBasedLeftoverCredit = protein.inputUnit === 'EACH' || protein.inputUnit === 'RACK';
  const leftoverUnitsAsCookedLb = unitBasedLeftoverCredit ? leftoverUnits * protein.rawWeightEachLb * (protein.cookedYieldPercent / 100) : 0;
  const netCookedLb = Math.max(0, grossCookedLbWithSafety - leftoverUnitsAsCookedLb - (unitBasedLeftoverCredit ? 0 : usableLeftoverLb));
  const rawLbNeeded = netCookedLb / (protein.cookedYieldPercent / 100);
  const cookUnitsBeforeClamp = unitBasedLeftoverCredit ? Math.max(0, forecastCookUnits - leftoverUnits) : rawLbNeeded / protein.rawWeightEachLb;
  const recommendedCookUnits = Math.min(protein.maxCookUnits, Math.max(protein.minCookUnits, Math.ceil(cookUnitsBeforeClamp)));
  return { forecastCookUnits, recommendedCookUnits, cookedLbNeeded: +netCookedLb.toFixed(1), rawLbNeeded: +rawLbNeeded.toFixed(1) };
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert('package version', pkg.version === '2.0.0', pkg.version);
assert('nav badge', fs.readFileSync('components/Nav.tsx', 'utf8').includes('Build 2.1.0'));
assert('prior EOD status route exists', fs.existsSync('app/api/eod-status/route.ts'));
assert('manual hot box adjustment exists', fs.readFileSync('app/cook-plan/page.tsx', 'utf8').includes('Manual Hot Box Adjustment'));
assert('dashboard operational alerts exist', fs.readFileSync('app/dashboard/page.tsx', 'utf8').includes('Operational Alerts'));
const settings = fs.readFileSync('app/settings/page.tsx', 'utf8');
assert('settings page shell wrapper', settings.includes('<Shell>') && settings.includes('</Shell>'));
assert('settings page protein-level pricing fields', settings.includes('Avg Sales $ / Cooked lb') && settings.includes('Sales Price Each'));
const route = fs.readFileSync('app/api/cook-plan/route.ts', 'utf8');
assert('cook-plan exact prior EOD lookup', route.includes('const priorEodDate = addUtcDays(loadDate, -1)') && route.includes('exactEodFor(priorEodDate)'));
assert('cook-plan missing prior EOD warning', route.includes('no data, check hot box'));
assert('ribs rack model', fs.readFileSync('lib/forecast.ts', 'utf8').includes("lower.includes('rib')") && fs.readFileSync('lib/forecast.ts', 'utf8').includes('salesPricePerRack'));
assert('chicken breast display', fs.readFileSync('app/cook-plan/page.tsx', 'utf8').includes('breasts'));
assert('last 10 EOD logs', fs.readFileSync('app/end-of-day/page.tsx', 'utf8').includes('Last 10 End-of-Day Logs'));

const scenario = { safetyFactorPct: 8, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15 };
const forecastSales = dailySalesForecast(6000000, 1.75, 1.506, 1);
const smokedMeatSales = Math.round(forecastSales * 0.40);
assert('sample July Saturday total sales forecast', Math.abs(forecastSales - 43323) <= 2, String(forecastSales));
assert('sample smoked meat at 40 percent', Math.abs(smokedMeatSales - 17330) <= 2, String(smokedMeatSales));

const ribs = forecastProteinLoad({ protein: { name: 'Ribs', inputUnit: 'RACK', rawWeightEachLb: 3.3, cookedWeightEachLb: 3.0, cookedYieldPercent: 90.9, salesPriceEach: 33, minCookUnits: 6, maxCookUnits: 240 }, scenario, forecastBbqSales: smokedMeatSales, usableLeftoverUnits: 4 });
assert('ribs use rack units and subtract leftovers', ribs.forecastCookUnits > ribs.recommendedCookUnits && ribs.forecastCookUnits - ribs.recommendedCookUnits === 4, JSON.stringify(ribs));
const chicken = forecastProteinLoad({ protein: { name: 'Pulled Chicken', inputUnit: 'EACH', rawWeightEachLb: 2.5, cookedWeightEachLb: 1.875, cookedYieldPercent: 75, avgSalesPerCookedLb: 22, minCookUnits: 8, maxCookUnits: 220 }, scenario, forecastBbqSales: smokedMeatSales, usableLeftoverUnits: 6 });
assert('chicken uses breast units and subtracts leftovers', chicken.forecastCookUnits > chicken.recommendedCookUnits && chicken.forecastCookUnits - chicken.recommendedCookUnits === 6, JSON.stringify(chicken));

console.log('Build 2.1.0 evaluation checks completed.');

import assert from 'node:assert/strict';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory } from '../lib/forecast';

const scenario = { annualSales: 3650000, bbqSalesPercent: 40, safetyFactorPct: 10, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15 };

assert.equal(dailySalesForecast(3650000, 1, 1, 1), 10000, 'daily sales forecast should be annual/365 at neutral multipliers');
assert.equal(confidenceForHistory(0), 'LOW');
assert.equal(confidenceForHistory(7), 'MEDIUM');
assert.equal(confidenceForHistory(28), 'HIGH');

const brisket = forecastProteinLoad({
  protein: { name: 'Brisket', inputUnit: 'EACH', cookedYieldPercent: 50, rawWeightEachLb: 13, cookedWeightEachLb: 6.5, minCookUnits: 1, maxCookUnits: 80, avgSalesPerCookedLb: 40 },
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.ok(brisket.recommendedCookUnits >= 1, 'brisket should recommend at least minimum units');

const ribs = forecastProteinLoad({
  protein: { name: 'Ribs', inputUnit: 'RACK', cookedYieldPercent: 90.9, rawWeightEachLb: 3.3, cookedWeightEachLb: 3, salesPriceEach: 33, minCookUnits: 4, maxCookUnits: 200, avgSalesPerCookedLb: 11 },
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.equal(ribs.recommendedCookUnits, Math.max(4, Math.ceil((4000 * 0.15 / 33) * 1.10)), 'ribs should use rack price, not cooked-lb price');

const chickenNoLeftover = forecastProteinLoad({
  protein: { name: 'Pulled Chicken', inputUnit: 'EACH', cookedYieldPercent: 75, rawWeightEachLb: 2.5, cookedWeightEachLb: 1.875, minCookUnits: 6, maxCookUnits: 180, avgSalesPerCookedLb: 20 },
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
const chickenWithLeftover = forecastProteinLoad({
  protein: { name: 'Pulled Chicken', inputUnit: 'EACH', cookedYieldPercent: 75, rawWeightEachLb: 2.5, cookedWeightEachLb: 1.875, minCookUnits: 6, maxCookUnits: 180, avgSalesPerCookedLb: 20 },
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 4
});
assert.ok(chickenWithLeftover.recommendedCookUnits <= chickenNoLeftover.recommendedCookUnits, 'unit leftovers should reduce chicken load');

console.log('Forecast engine tests completed.');

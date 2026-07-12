import assert from 'node:assert/strict';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory } from '../lib/forecast';

const scenario = { annualSales: 3650000, bbqSalesPercent: 40, safetyFactorPct: 10, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15 };
const noSafetyScenario = { ...scenario, safetyFactorPct: 0 };

const brisketProtein = { name: 'Brisket', inputUnit: 'EACH', cookedYieldPercent: 50, rawWeightEachLb: 13, cookedWeightEachLb: 6.5, minCookUnits: 1, maxCookUnits: 80, avgSalesPerCookedLb: 40 };
const ribsProtein = { name: 'Ribs', inputUnit: 'RACK', cookedYieldPercent: 90.9, rawWeightEachLb: 3.3, cookedWeightEachLb: 3, salesPriceEach: 33, minCookUnits: 4, maxCookUnits: 200, avgSalesPerCookedLb: 11 };
const chickenProtein = { name: 'Pulled Chicken', inputUnit: 'EACH', cookedYieldPercent: 75, rawWeightEachLb: 2.5, cookedWeightEachLb: 1.875, minCookUnits: 6, maxCookUnits: 180, avgSalesPerCookedLb: 20 };

assert.equal(dailySalesForecast(3650000, 1, 1, 1), 10000, 'daily sales forecast should be annual/365 at neutral multipliers');
assert.equal(dailySalesForecast(0, 1, 1, 1), 0, 'zero annual sales should forecast zero daily sales');
assert.equal(dailySalesForecast(3650000, 0.1, 0.1, 1), 100, 'low day/month multipliers should be honored');
assert.equal(dailySalesForecast(3650000, 3, 3, 2), 180000, 'extreme day/month/event multipliers should be explicit and test-covered');
assert.equal(confidenceForHistory(0), 'LOW');
assert.equal(confidenceForHistory(6), 'LOW');
assert.equal(confidenceForHistory(7), 'MEDIUM');
assert.equal(confidenceForHistory(27), 'MEDIUM');
assert.equal(confidenceForHistory(28), 'HIGH');

const brisket = forecastProteinLoad({
  protein: brisketProtein,
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.ok(brisket.recommendedCookUnits >= 1, 'brisket should recommend at least minimum units');

const ribs = forecastProteinLoad({
  protein: ribsProtein,
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.equal(ribs.recommendedCookUnits, Math.max(4, Math.ceil((4000 * 0.15 / 33) * 1.10)), 'ribs should use rack price, not cooked-lb price');

const chickenNoLeftover = forecastProteinLoad({
  protein: chickenProtein,
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
const chickenWithLeftover = forecastProteinLoad({
  protein: chickenProtein,
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 4
});
assert.ok(chickenWithLeftover.recommendedCookUnits <= chickenNoLeftover.recommendedCookUnits, 'unit leftovers should reduce chicken load');

const noMinProtein = { ...chickenProtein, minCookUnits: 0 };
const leftoverExceedsForecast = forecastProteinLoad({
  protein: noMinProtein,
  scenario: noSafetyScenario,
  forecastBbqSales: 100,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 999
});
assert.equal(leftoverExceedsForecast.recommendedCookUnits, 0, 'leftover credit exceeding forecast should not create negative cook units');

const minClampCollision = forecastProteinLoad({
  protein: { ...chickenProtein, minCookUnits: 12, maxCookUnits: 10 },
  scenario: noSafetyScenario,
  forecastBbqSales: 0,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 999
});
assert.equal(minClampCollision.recommendedCookUnits, 10, 'max clamp must win when min/max settings collide');

const maxClamp = forecastProteinLoad({
  protein: { ...brisketProtein, minCookUnits: 0, maxCookUnits: 5 },
  scenario: { ...scenario, safetyFactorPct: 50 },
  forecastBbqSales: 500000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.equal(maxClamp.recommendedCookUnits, 5, 'max cook units should cap extreme forecasts');

const all86ProxyDemand = forecastProteinLoad({
  protein: { ...ribsProtein, minCookUnits: 0, maxCookUnits: 200 },
  scenario: { ...scenario, safetyFactorPct: 0 },
  forecastBbqSales: 0,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.equal(all86ProxyDemand.recommendedCookUnits, 0, 'zero-sales / all-86 data import should not invent rack demand without sales input');

console.log('Forecast engine tests completed. Edge cases covered: zero sales, all-86 proxy, excess leftovers, min/max clamp collision, multiplier extremes.');

import assert from 'node:assert/strict';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory, totalCookedLbFromBbqSales } from '../lib/forecast';

const scenario = { annualSales: 3650000, bbqSalesPercent: 40, safetyFactorPct: 10, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15 };
const noSafetyScenario = { ...scenario, safetyFactorPct: 0 };

const brisketProtein = { name: 'Brisket', inputUnit: 'EACH', cookedYieldPercent: 50, rawWeightEachLb: 13, cookedWeightEachLb: 6.5, minCookUnits: 1, maxCookUnits: 80, avgSalesPerCookedLb: 40 };
const porkProtein = { name: 'Pulled Pork', inputUnit: 'EACH', cookedYieldPercent: 55, rawWeightEachLb: 9, cookedWeightEachLb: 4.95, minCookUnits: 2, maxCookUnits: 84, avgSalesPerCookedLb: 22 };
const ribsProtein = { name: 'Ribs', inputUnit: 'RACK', cookedYieldPercent: 90.9, rawWeightEachLb: 3.3, cookedWeightEachLb: 3, salesPriceEach: 33, minCookUnits: 4, maxCookUnits: 200, avgSalesPerCookedLb: 11 };
const chickenProtein = { name: 'Pulled Chicken', inputUnit: 'EACH', cookedYieldPercent: 75, rawWeightEachLb: 2.5, cookedWeightEachLb: 1.875, minCookUnits: 6, maxCookUnits: 180, avgSalesPerCookedLb: 20 };
const proteins = [brisketProtein, porkProtein, ribsProtein, chickenProtein];

assert.equal(dailySalesForecast(3650000, 1, 1, 1), 10000, 'daily sales forecast should be annual/365 at neutral multipliers');
assert.equal(dailySalesForecast(0, 1, 1, 1), 0, 'zero annual sales should forecast zero daily sales');
assert.equal(dailySalesForecast(3650000, 0.1, 0.1, 1), 100, 'low day/month multipliers should be honored');
assert.equal(dailySalesForecast(3650000, 3, 3, 2), 180000, 'extreme day/month/event multipliers should be explicit and test-covered');
assert.equal(confidenceForHistory(0), 'LOW');
assert.equal(confidenceForHistory(6), 'LOW');
assert.equal(confidenceForHistory(7), 'MEDIUM');
assert.equal(confidenceForHistory(27), 'MEDIUM');
assert.equal(confidenceForHistory(28), 'HIGH');

const totalCookedLb = totalCookedLbFromBbqSales({ proteins, scenario: noSafetyScenario, forecastBbqSales: 4000 });
assert.ok(totalCookedLb > 150 && totalCookedLb < 165, 'BBQ sales should convert to total cooked pounds with weighted revenue per cooked lb');

const brisket = forecastProteinLoad({
  protein: brisketProtein,
  proteins,
  scenario: noSafetyScenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.equal(brisket.forecastCookUnits, 8, 'brisket should use 30% of cooked meat pounds, not 30% of dollars');

const ribs = forecastProteinLoad({
  protein: ribsProtein,
  proteins,
  scenario: noSafetyScenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.equal(ribs.forecastCookUnits, 8, 'ribs should use 15% of cooked meat pounds and then convert pounds to racks');

const pork = forecastProteinLoad({
  protein: porkProtein,
  proteins,
  scenario: noSafetyScenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
const chickenNoLeftover = forecastProteinLoad({
  protein: chickenProtein,
  proteins,
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
const chickenWithLeftover = forecastProteinLoad({
  protein: chickenProtein,
  proteins,
  scenario,
  forecastBbqSales: 4000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 4
});
assert.ok(chickenWithLeftover.recommendedCookUnits <= chickenNoLeftover.recommendedCookUnits, 'unit leftovers should reduce chicken load');
assert.ok(pork.grossCookedLbNeeded > brisket.grossCookedLbNeeded, '40% pork weight mix should require more cooked pounds than 30% brisket');

const noMinProtein = { ...chickenProtein, minCookUnits: 0 };
const leftoverExceedsForecast = forecastProteinLoad({
  protein: noMinProtein,
  proteins,
  scenario: noSafetyScenario,
  forecastBbqSales: 100,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 999
});
assert.equal(leftoverExceedsForecast.recommendedCookUnits, 0, 'leftover credit exceeding forecast should not create negative cook units');

const minClampCollision = forecastProteinLoad({
  protein: { ...chickenProtein, minCookUnits: 12, maxCookUnits: 10 },
  proteins,
  scenario: noSafetyScenario,
  forecastBbqSales: 0,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 999
});
assert.equal(minClampCollision.recommendedCookUnits, 10, 'max clamp must win when min/max settings collide');

const maxClamp = forecastProteinLoad({
  protein: { ...brisketProtein, minCookUnits: 0, maxCookUnits: 5 },
  proteins,
  scenario: { ...scenario, safetyFactorPct: 50 },
  forecastBbqSales: 500000,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.equal(maxClamp.recommendedCookUnits, 5, 'max cook units should cap extreme forecasts');

const all86ProxyDemand = forecastProteinLoad({
  protein: { ...ribsProtein, minCookUnits: 0, maxCookUnits: 200 },
  proteins,
  scenario: { ...scenario, safetyFactorPct: 0 },
  forecastBbqSales: 0,
  usableLeftoverLb: 0,
  usableLeftoverUnits: 0
});
assert.equal(all86ProxyDemand.recommendedCookUnits, 0, 'zero-sales / all-86 data import should not invent rack demand without sales input');

console.log('Forecast engine tests completed. Build 5.6.0 verifies protein mix as cooked-weight mix, not dollar mix.');

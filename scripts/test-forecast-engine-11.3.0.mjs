#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  calculateForecast,
  createForecastApprovalRecord,
  ForecastValidationError,
} from "../lib/forecasting/build-11.3.0/forecast-engine.mjs";

const root = process.cwd();
const fixturePath = path.join(root, "config", "forecast-fixtures-11.3.0.json");
const fixtureSet = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const failures = [];

function near(actual, expected, tolerance = 0.001) {
  return Math.abs(Number(actual) - Number(expected)) <= tolerance;
}
function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL — ${message}`);
  }
}
function line(calculation, productCode) {
  return calculation.demand.lines.find((row) => row.productCode === productCode);
}

for (const fixture of fixtureSet.fixtures) {
  const result = calculateForecast(fixture.input);
  const expected = fixture.expected;
  const prefix = `${fixture.id} ${fixture.name}`;

  if (expected.dayName !== undefined) pass(result.dayOfWeek.name === expected.dayName, `${prefix}: day name`);
  if (expected.dayShare !== undefined) pass(result.dayOfWeek.share === expected.dayShare, `${prefix}: day share`);
  if (expected.dayFactor !== undefined) pass(near(result.dayOfWeek.factor, expected.dayFactor, 0.005), `${prefix}: day factor`);
  if (expected.automaticFactor !== undefined) pass(near(result.factors.automaticFactor, expected.automaticFactor), `${prefix}: automatic factor`);
  if (expected.finalFactor !== undefined) pass(near(result.factors.finalFactor, expected.finalFactor), `${prefix}: final factor`);
  for (const productCode of ["BRISKET", "PORK", "RIBS", "CHICKEN"]) {
    if (expected[productCode] !== undefined) {
      pass(near(line(result, productCode)?.finalDemand, expected[productCode], 0.01), `${prefix}: ${productCode}`);
    }
  }
  if (expected.barSalesDollars !== undefined) pass(near(result.salesDisplay.barSalesDollars, expected.barSalesDollars), `${prefix}: bar sales`);
  if (expected.foodSalesDollars !== undefined) pass(near(result.salesDisplay.foodSalesDollars, expected.foodSalesDollars), `${prefix}: food sales`);
  if (expected.smokedFoodSalesDollars !== undefined) pass(near(result.salesDisplay.smokedFoodSalesDollars, expected.smokedFoodSalesDollars), `${prefix}: smoked-food sales`);
  if (expected.confidenceBadge !== undefined) pass(result.confidence.badge === expected.confidenceBadge, `${prefix}: confidence badge`);
  if (expected.approvalRequired !== undefined) pass(result.review.approvalRequired === expected.approvalRequired, `${prefix}: approval requirement`);
  if (expected.highImpactManualAdjustment !== undefined) pass(result.review.highImpactManualAdjustment === expected.highImpactManualAdjustment, `${prefix}: high-impact manual adjustment`);
}

const approvalCalculation = calculateForecast({
  ...fixtureSet.fixtures[3].input,
});
const approval = createForecastApprovalRecord(approvalCalculation, {
  actor: "KM Test",
  approvedAt: "2026-07-29T12:00:00.000Z",
  reason: "Approved after event and weather review",
});
pass(approval.approvalId.startsWith("fa-"), "approval record has deterministic ID");
pass(approval.calculationId === approvalCalculation.calculationId, "approval record references calculation");
pass(approval.demandLines.length === 4, "approval record retains all product lines");

const invalidCases = [
  {
    name: "negative baseline",
    input: {
      ...fixtureSet.fixtures[0].input,
      baselineDemand: { ...fixtureSet.fixtures[0].input.baselineDemand, BRISKET: -1 },
    },
    field: "baselineDemand.BRISKET",
  },
  {
    name: "manual adjustment without reason",
    input: {
      ...fixtureSet.fixtures[0].input,
      manualAdjustmentPercent: 10,
      reason: "",
    },
    field: "reason",
  },
  {
    name: "monthly factor above maximum",
    input: {
      ...fixtureSet.fixtures[0].input,
      monthlyFactor: 2.1,
    },
    field: "monthlyFactor",
  },
  {
    name: "invalid date",
    input: {
      ...fixtureSet.fixtures[0].input,
      operatingDate: "2026-02-30",
    },
    field: "operatingDate",
  },
];

for (const invalid of invalidCases) {
  let caught = null;
  try {
    calculateForecast(invalid.input);
  } catch (error) {
    caught = error;
  }
  pass(caught instanceof ForecastValidationError, `${invalid.name}: throws ForecastValidationError`);
  pass(caught?.field === invalid.field, `${invalid.name}: identifies ${invalid.field}`);
}

if (failures.length) {
  console.error(`\nBuild 11.3.0 forecast fixture test failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log("\nBuild 11.3.0 forecast fixture test passed.");

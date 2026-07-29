#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  calculateProductionPlan,
  createProductionApprovalRecord,
  ProductionValidationError,
} from "../lib/production-planning/build-11.4.0/production-planning-engine.mjs";

const root = process.cwd();
const fixtureSet = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "production-planning-fixtures-11.4.0.json"),
    "utf8",
  ),
);
const failures = [];

function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL — ${message}`);
  }
}
function near(actual, expected, tolerance = 0.01) {
  return Math.abs(Number(actual) - Number(expected)) <= tolerance;
}
function requirement(plan, code) {
  return plan.requirements.find((row) => row.productCode === code);
}

for (const fixture of fixtureSet.fixtures) {
  const plan = calculateProductionPlan(fixture.input);
  const expected = fixture.expected;
  const prefix = `${fixture.id} ${fixture.name}`;

  if (expected.status !== undefined) {
    pass(plan.review.status === expected.status, `${prefix}: status`);
  }
  for (const code of ["BRISKET", "PORK", "RIBS", "CHICKEN"]) {
    const plannedKey = `${code}_plannedUnits`;
    if (expected[plannedKey] !== undefined) {
      pass(
        requirement(plan, code)?.plannedUnits === expected[plannedKey],
        `${prefix}: ${plannedKey}`,
      );
    }
    const exactRawKey = `${code}_exactRawLb`;
    if (expected[exactRawKey] !== undefined) {
      pass(
        near(requirement(plan, code)?.exactRawLb, expected[exactRawKey]),
        `${prefix}: ${exactRawKey}`,
      );
    }
  }
  if (expected.batchCount !== undefined) {
    pass(plan.schedule.batchCount === expected.batchCount, `${prefix}: batch count`);
  }
  if (expected.unscheduledUnits !== undefined) {
    pass(
      plan.schedule.unscheduledUnits === expected.unscheduledUnits,
      `${prefix}: unscheduled units`,
    );
  }
  if (expected.lastBatchQuantity !== undefined) {
    pass(
      plan.schedule.bookings.at(-1)?.quantity === expected.lastBatchQuantity,
      `${prefix}: last batch quantity`,
    );
  }
  if (expected.backupUsed !== undefined) {
    pass(
      plan.schedule.bookings.some((booking) => booking.backupUsed) === expected.backupUsed,
      `${prefix}: backup use`,
    );
  }
  if (expected.staleCarryoverWarning) {
    pass(
      plan.review.warnings.some((warning) => warning.includes("only 2026-08-02 is eligible")),
      `${prefix}: stale carryover warning`,
    );
  }
  if (expected.sealedBrisketWarning) {
    pass(
      plan.review.warnings.some((warning) => warning.includes("Brisket sealed units are not carryover eligible")),
      `${prefix}: sealed brisket warning`,
    );
  }
  if (expected.missingRawUnitWeight) {
    pass(
      plan.review.blockers.some((blocker) => blocker.includes("Pork raw unit weight")),
      `${prefix}: missing raw unit weight blocker`,
    );
  }
  if (expected.serviceDayName !== undefined) {
    pass(plan.serviceDayName === expected.serviceDayName, `${prefix}: service day`);
  }
  if (expected.firstBatchStartDate !== undefined) {
    pass(
      plan.schedule.bookings[0]?.start.date === expected.firstBatchStartDate,
      `${prefix}: first batch start date`,
    );
  }
}

const reviewPlan = calculateProductionPlan(fixtureSet.fixtures[0].input);
const approval = createProductionApprovalRecord(reviewPlan, {
  actor: "KM Test",
  approvedAt: "2026-07-29T14:00:00.000Z",
  reason: "Validation-only capacities reviewed for fixture execution",
});
pass(approval.approvalId.startsWith("pa-"), "approval record has deterministic ID");
pass(approval.planId === reviewPlan.planId, "approval record references production plan");
pass(approval.requirements.length === 4, "approval retains four requirements");
pass(approval.bookings.length === reviewPlan.schedule.batchCount, "approval retains schedule");

const blockedPlan = calculateProductionPlan(fixtureSet.fixtures[4].input);
let blockedApprovalError = null;
try {
  createProductionApprovalRecord(blockedPlan, { actor: "KM Test" });
} catch (error) {
  blockedApprovalError = error;
}
pass(
  blockedApprovalError instanceof ProductionValidationError,
  "blocked plan approval throws ProductionValidationError",
);
pass(blockedApprovalError?.field === "plan", "blocked plan approval identifies plan");

const invalidCases = [
  {
    name: "negative demand",
    mutate: (input) => ({ ...input, demand: { ...input.demand, PORK: -1 } }),
    field: "demand.PORK",
  },
  {
    name: "fractional sealed units",
    mutate: (input) => ({
      ...input,
      products: input.products.map((product) =>
        product.code === "RIBS"
          ? { ...product, carryover: { ...product.carryover, sealedUnits: 1.5 } }
          : product,
      ),
    }),
    field: "products.RIBS.carryover.sealedUnits",
  },
  {
    name: "buffer without reason",
    mutate: (input) => ({
      ...input,
      products: input.products.map((product) =>
        product.code === "PORK"
          ? { ...product, bufferPercent: 15, bufferReason: "" }
          : product,
      ),
    }),
    field: "products.PORK.bufferReason",
  },
  {
    name: "invalid smoker cook window",
    mutate: (input) => ({
      ...input,
      smokers: input.smokers.map((smoker, index) =>
        index === 0 ? { ...smoker, cookWindow: "Always" } : smoker,
      ),
    }),
    field: "smokers.ole.cookWindow",
  },
];

for (const invalid of invalidCases) {
  let caught = null;
  try {
    calculateProductionPlan(invalid.mutate(fixtureSet.fixtures[0].input));
  } catch (error) {
    caught = error;
  }
  pass(caught instanceof ProductionValidationError, `${invalid.name}: validation error`);
  pass(caught?.field === invalid.field, `${invalid.name}: identifies ${invalid.field}`);
}

if (failures.length) {
  console.error(`\nBuild 11.4.0 production-planning test failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log("\nBuild 11.4.0 production-planning fixture test passed.");

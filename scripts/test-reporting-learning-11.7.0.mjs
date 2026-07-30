#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  ReportingLearningValidationError,
  approveForecastLearningRecommendation,
  createReportExport,
  generateDailyOperationsReport,
  generateForecastLearningRecommendation,
  generateWeeklyOperationsReport,
} from "../lib/reporting-learning/build-11.7.0/reporting-learning-engine.mjs";

const root = process.cwd();
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "reporting-learning-fixtures-11.7.0.json"),
    "utf8",
  ),
);
const failures = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
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
function product(report, code) {
  return report.products.find((row) => row.productCode === code);
}

// RL-001 — source reconciliation.
const daily = generateDailyOperationsReport(
  clone(fixtures.baseDailySource),
);
pass(
  daily.reconciliation.status === "COMPLETE",
  "RL-001: complete daily source produces a complete report",
);
pass(
  near(daily.reconciliation.unexplainedDifferenceCookedLb, 0),
  "RL-001: daily unexplained difference is zero",
);
pass(
  daily.products.every((row) => row.reconciled),
  "RL-001: every product reconciles",
);
pass(
  daily.lineage.sourceHash.length === 8,
  "RL-001: source lineage includes deterministic source hash",
);

// RL-002 — forecast variance and accuracy.
pass(
  near(product(daily, "BRISKET").forecastVarianceCookedLb, -4),
  "RL-002: brisket forecast variance is -4 cooked lb",
);
pass(
  near(product(daily, "BRISKET").forecastAccuracyPercent, 96),
  "RL-002: brisket daily forecast accuracy is 96%",
);

// RL-003 — zero denominator is explicit N/A.
const zeroForecastSource = clone(fixtures.baseDailySource);
zeroForecastSource.products.BRISKET.forecastCookedLb = 0;
const zeroForecast = generateDailyOperationsReport(zeroForecastSource);
pass(
  product(zeroForecast, "BRISKET").forecastVariancePercent === null,
  "RL-003: zero forecast returns null variance percent",
);
pass(
  product(zeroForecast, "BRISKET").forecastAccuracyPercent === null,
  "RL-003: zero forecast returns null accuracy percent",
);

// RL-004 — actual yield.
pass(
  near(product(daily, "PORK").actualYieldPercent, 55),
  "RL-004: pork actual yield is 55%",
);

// RL-005 — waste rate.
pass(
  near(product(daily, "PORK").wasteRatePercent, 2.5),
  "RL-005: pork waste rate is 2.5%",
);

// RL-006 — plan adherence.
pass(
  near(daily.planAdherence.adherencePercent, 100),
  "RL-006: all four loads meet plan-adherence tolerances",
);
const lateSource = clone(fixtures.baseDailySource);
lateSource.loads[0].actualStartOffsetMinutes += 30;
const lateReport = generateDailyOperationsReport(lateSource);
pass(
  near(lateReport.planAdherence.adherencePercent, 75),
  "RL-006: one late load lowers adherence to 75%",
);

// RL-007 — smoker utilization.
pass(
  near(daily.smokerUtilization.utilizationPercent, 70),
  "RL-007: combined smoker utilization is 70%",
);

// RL-008 — missing required source blocks completion.
const missingSource = clone(fixtures.baseDailySource);
missingSource.complete = false;
missingSource.sources.physicalCountRecordId = null;
const blocked = generateDailyOperationsReport(missingSource);
pass(
  blocked.reconciliation.status === "BLOCKED",
  "RL-008: missing physical count blocks report completion",
);
pass(
  blocked.reconciliation.missingSources.includes(
    "physicalCountRecordId",
  ),
  "RL-008: missing physical-count source is named",
);

// Supplemental source mismatch reconciliation.
const mismatchSource = clone(fixtures.baseDailySource);
mismatchSource.products.PORK.closingOnHandCookedLb += 2;
const mismatch = generateDailyOperationsReport(mismatchSource);
pass(
  mismatch.reconciliation.status === "BLOCKED",
  "source mismatch blocks report completion",
);
pass(
  near(
    product(mismatch, "PORK").unexplainedDifferenceCookedLb,
    2,
  ),
  "source mismatch remains visible as a 2 lb unexplained difference",
);

// RL-009 — weekly aggregation.
const weekly = generateWeeklyOperationsReport(
  clone(fixtures.weeklySources),
);
pass(
  weekly.observationCount === 7,
  "RL-009: weekly report includes seven observations",
);
pass(
  weekly.reconciliation.status === "COMPLETE",
  "RL-009: weekly report reconciles",
);
pass(
  weekly.dailyReportIds.length === 7 &&
    weekly.sourceHashes.length === 7,
  "RL-009: weekly report preserves daily lineage",
);
pass(
  product(weekly, "BRISKET").forecastAccuracyPercent !== null,
  "RL-009: weekly forecast accuracy uses WAPE",
);

// RL-010 — recommendation bounding.
const highDemand = clone(fixtures.weeklySources);
for (const observation of highDemand) {
  observation.products.BRISKET.serviceUsageCookedLb =
    observation.products.BRISKET.forecastCookedLb * 1.5;
  observation.products.BRISKET.adjustmentCookedLb =
    observation.products.BRISKET.closingOnHandCookedLb -
    observation.products.BRISKET.openingCookedLb -
    observation.products.BRISKET.productionReceiptCookedLb +
    observation.products.BRISKET.serviceUsageCookedLb +
    observation.products.BRISKET.wasteCookedLb;
}
const boundedHigh = generateForecastLearningRecommendation(
  highDemand,
  {
    productCode: "BRISKET",
    dayType: "NORMAL_WEEKDAY",
  },
);
pass(
  boundedHigh.status === "READY_FOR_REVIEW",
  "RL-010: sufficient observations produce a reviewable recommendation",
);
pass(
  near(boundedHigh.recommendedFactor, 1.15, 0.0001),
  "RL-010: upward recommendation is capped at 1.15",
);
pass(
  boundedHigh.bounded === true &&
    boundedHigh.autoApplyAllowed === false,
  "RL-010: bounded recommendation cannot auto-apply",
);

const lowDemand = clone(fixtures.weeklySources);
for (const observation of lowDemand) {
  observation.products.PORK.serviceUsageCookedLb =
    observation.products.PORK.forecastCookedLb * 0.5;
  observation.products.PORK.adjustmentCookedLb =
    observation.products.PORK.closingOnHandCookedLb -
    observation.products.PORK.openingCookedLb -
    observation.products.PORK.productionReceiptCookedLb +
    observation.products.PORK.serviceUsageCookedLb +
    observation.products.PORK.wasteCookedLb;
}
const boundedLow = generateForecastLearningRecommendation(
  lowDemand,
  {
    productCode: "PORK",
    dayType: "NORMAL_WEEKDAY",
  },
);
pass(
  near(boundedLow.recommendedFactor, 0.85, 0.0001),
  "RL-010: downward recommendation is capped at 0.85",
);

// RL-011 — insufficient observations.
const insufficient = generateForecastLearningRecommendation(
  clone(fixtures.weeklySources.slice(0, 3)),
  {
    productCode: "RIBS",
    dayType: "NORMAL_WEEKDAY",
  },
);
pass(
  insufficient.status === "INSUFFICIENT_DATA",
  "RL-011: three observations are insufficient",
);
pass(
  insufficient.recommendationId === null,
  "RL-011: insufficient data creates no recommendation ID",
);

// RL-012 — immutable approval evidence.
const normalRecommendation =
  generateForecastLearningRecommendation(
    clone(fixtures.weeklySources),
    {
      productCode: "CHICKEN",
      dayType: "NORMAL_WEEKDAY",
    },
  );
const approval =
  approveForecastLearningRecommendation(
    normalRecommendation,
    {
      actor: {
        id: "km-1170",
        name: "Kitchen Manager",
        role: "KM",
      },
      approvedAt: "2026-08-03T23:00:00.000Z",
      reason: "Seven complete observations reviewed",
      effectiveDate: "2026-08-10",
    },
  );
pass(
  approval.recordVersion ===
    "PTT_FORECAST_RECOMMENDATION_APPROVAL_11_7_0",
  "RL-012: approval uses controlled record version",
);
pass(
  approval.recommendationSnapshot.recommendationId ===
    normalRecommendation.recommendationId,
  "RL-012: approval preserves the full recommendation snapshot",
);
pass(
  approval.evidence.length === 7 &&
    approval.appliedAutomatically === false,
  "RL-012: approval preserves seven evidence rows and remains human-applied",
);

let unauthorizedApproval = null;
try {
  approveForecastLearningRecommendation(
    normalRecommendation,
    {
      actor: {
        id: "viewer-1170",
        name: "Read Only",
        role: "VIEWER",
      },
      reason: "Not authorized",
    },
  );
} catch (error) {
  unauthorizedApproval = error;
}
pass(
  unauthorizedApproval instanceof
    ReportingLearningValidationError,
  "recommendation approval enforces role control",
);
pass(
  unauthorizedApproval?.field === "actor.role",
  "unauthorized approval identifies actor.role",
);

// RL-013 — exports.
const jsonExport = createReportExport(daily, "JSON");
const csvExport = createReportExport(weekly, "CSV");
pass(
  jsonExport.formulaGlossaryIncluded &&
    jsonExport.sourceLineageIncluded,
  "RL-013: JSON export includes formulas and lineage",
);
pass(
  csvExport.content.includes(
    "formula_key,formula",
  ) &&
    csvExport.content.includes("sourceHash"),
  "RL-013: CSV export contains formula glossary and source lineage",
);
pass(
  jsonExport.filename.endsWith(".json") &&
    csvExport.filename.endsWith(".csv"),
  "RL-013: export filenames match requested formats",
);

// RL-014 — cross-tenant source rejection.
const crossTenant = clone(fixtures.weeklySources);
crossTenant[6].tenantId = "tenant-other";
let tenantError = null;
try {
  generateWeeklyOperationsReport(crossTenant);
} catch (error) {
  tenantError = error;
}
pass(
  tenantError instanceof ReportingLearningValidationError,
  "RL-014: cross-tenant weekly report is rejected",
);
pass(
  tenantError?.field === "tenantId",
  "RL-014: cross-tenant report identifies tenantId",
);

let learningTenantError = null;
try {
  generateForecastLearningRecommendation(
    crossTenant,
    {
      productCode: "PORK",
      dayType: "NORMAL_WEEKDAY",
    },
  );
} catch (error) {
  learningTenantError = error;
}
pass(
  learningTenantError instanceof
    ReportingLearningValidationError,
  "RL-014: cross-tenant learning observations are rejected",
);

// Deterministic repeatability.
const dailyAgain = generateDailyOperationsReport(
  clone(fixtures.baseDailySource),
);
pass(
  dailyAgain.reportId === daily.reportId,
  "same source generates the same daily report ID",
);
pass(
  createReportExport(dailyAgain, "JSON").content ===
    jsonExport.content,
  "same report generates deterministic JSON export content",
);

if (failures.length) {
  console.error(
    `\nBuild 11.7.0 Reporting and Learning test failed: ${failures.length} control(s).`,
  );
  process.exit(1);
}

console.log(
  "\nBuild 11.7.0 Reporting and Forecast Learning fixture test passed.",
);

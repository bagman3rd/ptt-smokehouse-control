#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  FORMULA_GLOSSARY,
  REPORTING_LEARNING_VERSION,
  REPORT_PRODUCTS,
  generateDailyOperationsReport,
  generateForecastLearningRecommendation,
  generateWeeklyOperationsReport,
} from "../lib/reporting-learning/build-11.7.0/reporting-learning-engine.mjs";

const BUILD = "11.7.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.7.0");
const failures = [];

function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL — ${message}`);
  }
}
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function exact(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}
function near(actual, expected, tolerance = 0.01) {
  return Math.abs(Number(actual) - Number(expected)) <= tolerance;
}

const contractPath = path.join(
  root,
  "config",
  "reporting-learning-contract-11.7.0.json",
);
const fixturePath = path.join(
  root,
  "config",
  "reporting-learning-fixtures-11.7.0.json",
);

pass(fs.existsSync(contractPath), "reporting contract exists");
pass(fs.existsSync(fixturePath), "reporting fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturePath)) {
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

pass(contract.buildVersion === BUILD, "contract build version is 11.7.0");
pass(
  contract.engineVersion === REPORTING_LEARNING_VERSION,
  "reporting engine version is controlled",
);
pass(
  exact(contract.coreProducts, REPORT_PRODUCTS),
  "contract products match the reporting engine",
);
pass(
  contract.reportPeriods.includes("DAILY") &&
    contract.reportPeriods.includes("WEEKLY"),
  "daily and weekly reports are required",
);
pass(
  contract.reconciliation.reportCompleteRequiresZeroUnexplainedDifference ===
    true,
  "report completion requires zero unexplained difference",
);
pass(
  contract.reconciliation.missingRequiredSourceBlocksCompletion === true,
  "missing source blocks completion",
);
pass(
  contract.learning.minimumCompleteObservations === 4,
  "learning requires at least four complete observations",
);
pass(
  contract.learning.minimumRecommendedFactor === 0.85 &&
    contract.learning.maximumRecommendedFactor === 1.15,
  "learning factor is bounded from 0.85 through 1.15",
);
pass(
  contract.learning.humanApprovalRequired === true &&
    contract.learning.autoApplyAllowed === false,
  "learning requires human approval and cannot auto-apply",
);
pass(
  contract.exports.formats.includes("CSV") &&
    contract.exports.formats.includes("JSON"),
  "CSV and JSON exports are required",
);
pass(
  Object.keys(FORMULA_GLOSSARY).length >= 10,
  "formula glossary contains the core metrics",
);
pass(
  fixtures.scenarios.length >= 14,
  "at least fourteen deterministic scenarios exist",
);

let daily = null;
let weekly = null;
try {
  daily = generateDailyOperationsReport(fixtures.baseDailySource);
  weekly = generateWeeklyOperationsReport(fixtures.weeklySources);
} catch (error) {
  pass(
    false,
    `controlled fixture reports generate: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}
if (daily) {
  pass(
    daily.reconciliation.status === "COMPLETE",
    "controlled daily report is complete",
  );
  pass(
    near(daily.reconciliation.unexplainedDifferenceCookedLb, 0),
    "controlled daily report has zero unexplained difference",
  );
  pass(daily.products.length === 4, "daily report has four product rows");
  pass(
    daily.products.every((row) => row.reconciled),
    "every daily product row reconciles",
  );
  pass(
    daily.lineage.sourceHash.length === 8,
    "daily report retains deterministic source lineage",
  );
}
if (weekly) {
  pass(
    weekly.reconciliation.status === "COMPLETE",
    "controlled weekly report is complete",
  );
  pass(
    near(weekly.reconciliation.unexplainedDifferenceCookedLb, 0),
    "controlled weekly report has zero unexplained difference",
  );
  pass(
    weekly.observationCount === 7,
    "controlled weekly report has seven observations",
  );
  pass(
    weekly.dailyReportIds.length === 7 &&
      weekly.sourceHashes.length === 7,
    "weekly report retains every daily source",
  );
}

const recommendation = generateForecastLearningRecommendation(
  fixtures.weeklySources,
  {
    productCode: "BRISKET",
    dayType: "NORMAL_WEEKDAY",
  },
);
pass(
  recommendation.status === "READY_FOR_REVIEW",
  "controlled recommendation is ready for review",
);
pass(
  recommendation.recommendedFactor >= 0.85 &&
    recommendation.recommendedFactor <= 1.15,
  "controlled recommendation remains inside approved bounds",
);
pass(
  recommendation.humanApprovalRequired === true &&
    recommendation.autoApplyAllowed === false,
  "controlled recommendation cannot auto-apply",
);

const requiredOutputs = [
  "reporting-workbench-route.json",
  "reporting-capability-map.csv",
  "reporting-source-evidence.csv",
  "reporting-known-scenarios.csv",
  "daily-report-metrics.csv",
  "weekly-report-metrics.csv",
  "report-source-lineage.csv",
  "forecast-learning-recommendations.csv",
  "report-formula-glossary.csv",
  "reporting-uat-workbook.csv",
  "reporting-findings.csv",
  "daily-report.json",
  "weekly-report.json",
  "recommendation-approvals.json",
  "reporting-contract-snapshot.json",
  "reporting-fixture-snapshot.json",
  "reporting-readiness.json",
  "reporting-readiness-summary.md",
  "reporting-hash-manifest.json",
];
for (const name of requiredOutputs) {
  pass(
    fs.existsSync(path.join(outDir, name)),
    `required output exists: ${name}`,
  );
}

const routeRecordPath = path.join(
  outDir,
  "reporting-workbench-route.json",
);
if (fs.existsSync(routeRecordPath)) {
  const route = JSON.parse(fs.readFileSync(routeRecordPath, "utf8"));
  pass(
    route.buildVersion === BUILD,
    "reporting route record uses Build 11.7.0",
  );
  pass(
    route.route.startsWith("/reports-lab-1170"),
    "reporting workbench uses an isolated route",
  );
  const pageSource = path.join(root, route.pageSource);
  const componentSource = path.join(root, route.componentSource);
  pass(fs.existsSync(pageSource), "reporting workbench page exists");
  pass(
    fs.existsSync(componentSource),
    "reporting workbench component exists",
  );
  if (fs.existsSync(pageSource)) {
    pass(
      fs
        .readFileSync(pageSource, "utf8")
        .includes("BUILD_11_7_0_GENERATED"),
      "reporting page contains generated marker",
    );
  }
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(componentSource, "utf8");
    pass(
      source.includes("Reporting and Forecast Learning"),
      "reporting workbench has the correct title",
    );
    pass(
      source.includes("does not persist production records"),
      "reporting workbench does not falsely claim persistence",
    );
    pass(
      source.includes("Every source quantity reconciles"),
      "reporting workbench presents reconciliation status",
    );
    pass(
      source.includes("Copy approval record"),
      "reporting workbench includes human approval evidence",
    );
    pass(
      source.includes("Calculation glossary"),
      "reporting workbench exposes formulas",
    );
  }
}

const readinessPath = path.join(outDir, "reporting-readiness.json");
if (fs.existsSync(readinessPath)) {
  const report = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
  pass(
    report.buildVersion === BUILD,
    "reporting readiness report uses Build 11.7.0",
  );
  pass(
    report.counts.deterministicScenarios === fixtures.scenarios.length,
    "readiness scenario count matches fixtures",
  );
  pass(
    report.counts.dailyProductRows === 4 &&
      report.counts.weeklyProductRows === 4,
    "readiness evidence contains four daily and four weekly product rows",
  );
  pass(
    report.counts.recommendations === 4,
    "readiness evidence contains four product recommendations",
  );
  pass(
    report.counts.uatRows === 30,
    "readiness evidence contains thirty deployed UAT rows",
  );
  pass(
    report.results.dailyStatus === "COMPLETE" &&
      report.results.weeklyStatus === "COMPLETE",
    "daily and weekly readiness reports are complete",
  );
  pass(
    near(report.results.dailyUnexplainedDifferenceCookedLb, 0) &&
      near(report.results.weeklyUnexplainedDifferenceCookedLb, 0),
    "daily and weekly readiness evidence reconcile",
  );
  pass(
    report.results.autoAppliedRecommendations === 0,
    "no readiness recommendation auto-applies",
  );
  pass(
    report.findings.every((finding) =>
      ["P0", "P1", "P2", "P3"].includes(finding.severity),
    ),
    "all findings use approved severities",
  );
}

const dailyPath = path.join(outDir, "daily-report.json");
const weeklyPath = path.join(outDir, "weekly-report.json");
if (fs.existsSync(dailyPath)) {
  const report = JSON.parse(fs.readFileSync(dailyPath, "utf8"));
  pass(
    report.reportVersion === REPORTING_LEARNING_VERSION,
    "daily report artifact uses the controlled engine version",
  );
  pass(
    report.reconciliation.status === "COMPLETE",
    "daily report artifact is complete",
  );
  pass(
    report.products.every(
      (row) => Math.abs(row.unexplainedDifferenceCookedLb) <= 0.01,
    ),
    "daily report artifact has no unexplained product difference",
  );
}
if (fs.existsSync(weeklyPath)) {
  const report = JSON.parse(fs.readFileSync(weeklyPath, "utf8"));
  pass(
    report.reportVersion === REPORTING_LEARNING_VERSION,
    "weekly report artifact uses the controlled engine version",
  );
  pass(
    report.reconciliation.status === "COMPLETE",
    "weekly report artifact is complete",
  );
  pass(
    report.products.every((row) => row.observationCount === 7),
    "weekly report artifact has seven observations per product",
  );
}

const approvalPath = path.join(
  outDir,
  "recommendation-approvals.json",
);
if (fs.existsSync(approvalPath)) {
  const approvals = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  pass(approvals.length === 4, "four approval records are generated");
  pass(
    approvals.every(
      (row) =>
        row.recordVersion ===
          "PTT_FORECAST_RECOMMENDATION_APPROVAL_11_7_0" &&
        row.appliedAutomatically === false &&
        Array.isArray(row.evidence) &&
        row.evidence.length === 7,
    ),
    "approval records preserve controlled version, evidence, and human application",
  );
}

const manifestPath = path.join(
  outDir,
  "reporting-hash-manifest.json",
);
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  pass(
    manifest.buildVersion === BUILD,
    "reporting hash manifest uses Build 11.7.0",
  );
  for (const [name, expected] of Object.entries(
    manifest.files || {},
  )) {
    const file = path.join(outDir, name);
    pass(fs.existsSync(file), `hash target exists: ${name}`);
    if (fs.existsSync(file)) {
      pass(
        hash(fs.readFileSync(file)) === expected,
        `hash matches: ${name}`,
      );
    }
  }
}

const renderPath = path.join(root, "render.yaml");
pass(fs.existsSync(renderPath), "render.yaml exists");
if (fs.existsSync(renderPath)) {
  const render = fs.readFileSync(renderPath, "utf8");
  pass(
    /key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"(?:11\.(?:7|8|9)|12\.0)\.0"/m.test(
      render,
    ),
    "Render APP_BUILD_VERSION is compatible with the Build 11.7.0 reporting baseline",
  );
  pass(
    /databases:\s*[\s\S]*?name:\s*ptt-smokehouse-control-db[\s\S]*?plan:\s*basic-256mb/m.test(
      render,
    ),
    "database plan remains basic-256mb",
  );
  pass(
    (render.match(/^\s*runtime:\s*node\s*$/gm) || []).length === 1,
    "the single Render web service uses runtime: node",
  );
}

if (failures.length) {
  console.error(
    `\nBuild ${BUILD} verification failed: ${failures.length} control(s).`,
  );
  process.exit(1);
}

console.log(
  `\nBuild ${BUILD} Reporting and Forecast Learning verification passed.`,
);

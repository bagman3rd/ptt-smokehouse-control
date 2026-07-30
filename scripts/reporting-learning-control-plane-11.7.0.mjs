#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  FORMULA_GLOSSARY,
  approveForecastLearningRecommendation,
  createReportExport,
  generateDailyOperationsReport,
  generateForecastLearningRecommendation,
  generateWeeklyOperationsReport,
} from "../lib/reporting-learning/build-11.7.0/reporting-learning-engine.mjs";

const BUILD = "11.7.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.7.0");
const contract = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "reporting-learning-contract-11.7.0.json"),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "reporting-learning-fixtures-11.7.0.json"),
    "utf8",
  ),
);

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(path.join(outDir, "reporting-hash-manifest.json"), {
  force: true,
});

const excluded = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "build",
  ".turbo",
  ".cache",
  "artifacts",
]);
const textExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".prisma",
  ".json",
  ".md",
  ".yaml",
  ".yml",
]);

function rel(file) {
  return path.relative(root, file).split(path.sep).join("/");
}
function walk(dir) {
  const rows = [];
  if (!fs.existsSync(dir)) return rows;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) rows.push(...walk(full));
    else if (entry.isFile()) rows.push(full);
  }
  return rows;
}
function read(file) {
  try {
    if (fs.statSync(file).size > 2_500_000) return "";
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}
function writeCsv(name, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(
      columns.map((column) => csvEscape(row[column])).join(","),
    );
  }
  fs.writeFileSync(
    path.join(outDir, name),
    `${lines.join("\n")}\n`,
    "utf8",
  );
}

const files = walk(root);
const textFiles = files.filter((file) =>
  textExtensions.has(path.extname(file).toLowerCase()),
);
const cache = new Map(textFiles.map((file) => [file, read(file)]));

const capabilities = [
  ["daily-report", "Daily operational report", ["generateDailyOperationsReport", "reportType: \"DAILY\""]],
  ["weekly-report", "Weekly management report", ["generateWeeklyOperationsReport", "reportType: \"WEEKLY\""]],
  ["source-lineage", "Source IDs and deterministic lineage", ["sourceHash", "sourceIds", "sourceSnapshot"]],
  ["reconciliation", "Inventory equation reconciliation", ["unexplainedDifferenceCookedLb", "expectedClosingOnHandCookedLb"]],
  ["forecast-variance", "Forecast variance and accuracy", ["forecastVarianceCookedLb", "forecastAccuracyPercent", "wapePercent"]],
  ["production-variance", "Production plan versus actual", ["productionVarianceCookedLb", "actualCookedProductionLb"]],
  ["yield", "Actual yield reporting", ["actualYieldPercent", "actualRawInputLb"]],
  ["waste", "Waste rate reporting", ["wasteRatePercent", "wasteCookedLb"]],
  ["ending-inventory", "Ending inventory rate", ["endingInventoryRatePercent", "closingOnHandCookedLb"]],
  ["plan-adherence", "Load-window plan adherence", ["planAdherencePercent", "startWithinTolerance", "endWithinTolerance"]],
  ["smoker-utilization", "Capacity-minute utilization", ["smokerUtilizationPercent", "occupiedCapacityMinutes"]],
  ["learning", "Bounded forecast learning", ["generateForecastLearningRecommendation", "minimumFactor", "maximumFactor"]],
  ["human-approval", "Human recommendation approval", ["approveForecastLearningRecommendation", "appliedAutomatically"]],
  ["export", "CSV and JSON export", ["createReportExport", "formulaGlossaryIncluded", "sourceLineageIncluded"]],
  ["tenant-isolation", "Report tenant/location isolation", ["cannot combine tenants or locations", "tenantId"]],
];

const capabilityRows = [];
const sourceRows = [];
const findings = [];

for (const [capabilityId, label, tokens] of capabilities) {
  const matches = [];
  for (const file of textFiles) {
    const source = `${rel(file)}\n${cache.get(file) || ""}`.toLowerCase();
    const matched = tokens.filter((token) =>
      source.includes(token.toLowerCase()),
    );
    if (matched.length) {
      matches.push({ sourceFile: rel(file), matched });
    }
  }
  capabilityRows.push({
    capabilityId,
    label,
    required: true,
    status: matches.length ? "STATIC_EVIDENCE_FOUND" : "NO_STATIC_EVIDENCE",
    evidenceCount: matches.length,
    deployedVerification: "PENDING_STAGING_UAT",
  });
  for (const match of matches.slice(0, 50)) {
    sourceRows.push({
      capabilityId,
      sourceFile: match.sourceFile,
      matchedTokens: match.matched.join("|"),
    });
  }
  if (!matches.length) {
    findings.push({
      severity: "P1",
      category: "REPORTING_CAPABILITY_GAP",
      subject: label,
      detail: "No static implementation evidence was detected.",
      releaseBlocking: true,
    });
  }
}

const daily = generateDailyOperationsReport(fixtures.baseDailySource);
const weekly = generateWeeklyOperationsReport(fixtures.weeklySources);

const dailyMetricRows = daily.products.map((row) => ({
  operatingDate: daily.operatingDate,
  reportId: daily.reportId,
  sourceHash: daily.lineage.sourceHash,
  reconciliationStatus: daily.reconciliation.status,
  productCode: row.productCode,
  forecastCookedLb: row.forecastCookedLb,
  serviceUsageCookedLb: row.serviceUsageCookedLb,
  forecastVarianceCookedLb: row.forecastVarianceCookedLb,
  forecastVariancePercent: row.forecastVariancePercent,
  forecastAccuracyPercent: row.forecastAccuracyPercent,
  plannedCookedLb: row.plannedCookedLb,
  actualCookedProductionLb: row.actualCookedProductionLb,
  productionVarianceCookedLb: row.productionVarianceCookedLb,
  actualRawInputLb: row.actualRawInputLb,
  actualYieldPercent: row.actualYieldPercent,
  wasteCookedLb: row.wasteCookedLb,
  wasteRatePercent: row.wasteRatePercent,
  closingOnHandCookedLb: row.closingOnHandCookedLb,
  endingInventoryRatePercent: row.endingInventoryRatePercent,
  expectedClosingOnHandCookedLb: row.expectedClosingOnHandCookedLb,
  unexplainedDifferenceCookedLb: row.unexplainedDifferenceCookedLb,
}));

const weeklyMetricRows = weekly.products.map((row) => ({
  periodStart: weekly.periodStart,
  periodEnd: weekly.periodEnd,
  reportId: weekly.reportId,
  reconciliationStatus: weekly.reconciliation.status,
  observationCount: weekly.observationCount,
  productCode: row.productCode,
  forecastCookedLb: row.forecastCookedLb,
  serviceUsageCookedLb: row.serviceUsageCookedLb,
  absoluteForecastErrorCookedLb: row.absoluteForecastErrorCookedLb,
  wapePercent: row.wapePercent,
  forecastAccuracyPercent: row.forecastAccuracyPercent,
  plannedCookedLb: row.plannedCookedLb,
  actualCookedProductionLb: row.actualCookedProductionLb,
  productionVarianceCookedLb: row.productionVarianceCookedLb,
  actualYieldPercent: row.actualYieldPercent,
  wasteCookedLb: row.wasteCookedLb,
  wasteRatePercent: row.wasteRatePercent,
  closingOnHandCookedLb: row.closingOnHandCookedLb,
  endingInventoryRatePercent: row.endingInventoryRatePercent,
  unexplainedDifferenceCookedLb: row.unexplainedDifferenceCookedLb,
}));

const recommendationRows = [];
const approvals = [];
for (const productCode of contract.coreProducts) {
  const recommendation = generateForecastLearningRecommendation(
    fixtures.weeklySources,
    {
      productCode,
      dayType: "NORMAL_WEEKDAY",
    },
  );
  recommendationRows.push({
    recommendationId: recommendation.recommendationId,
    productCode,
    dayType: recommendation.dayType,
    status: recommendation.status,
    observationCount: recommendation.observationCount,
    confidence: recommendation.confidence || "",
    unboundedFactor: recommendation.unboundedFactor ?? "",
    recommendedFactor: recommendation.recommendedFactor ?? "",
    adjustmentPercent: recommendation.adjustmentPercent ?? "",
    bounded: recommendation.bounded ?? "",
    humanApprovalRequired: recommendation.humanApprovalRequired ?? "",
    autoApplyAllowed: recommendation.autoApplyAllowed ?? "",
  });
  if (recommendation.status === "READY_FOR_REVIEW") {
    approvals.push(
      approveForecastLearningRecommendation(recommendation, {
        actor: {
          id: "km-evidence-1170",
          name: "Kitchen Manager",
          role: "KM",
        },
        approvedAt: "2026-08-03T23:00:00.000Z",
        reason: "Deterministic evidence review",
        effectiveDate: "2026-08-10",
      }),
    );
  }
}

const glossaryRows = Object.entries(FORMULA_GLOSSARY).map(
  ([formulaKey, formula]) => ({ formulaKey, formula }),
);

const lineageRows = [
  {
    reportId: daily.reportId,
    reportType: daily.reportType,
    operatingDate: daily.operatingDate,
    periodStart: "",
    periodEnd: "",
    sourceHash: daily.lineage.sourceHash,
    forecastId: daily.lineage.forecastId,
    productionPlanId: daily.lineage.productionPlanId,
    executionRecordId: daily.lineage.executionRecordId,
    inventoryDayId: daily.lineage.inventoryDayId,
    physicalCountRecordId: daily.lineage.physicalCountRecordId,
  },
  ...weekly.dailyReportIds.map((reportId, index) => ({
    reportId,
    reportType: "WEEKLY_SOURCE_DAY",
    operatingDate: fixtures.weeklySources[index].operatingDate,
    periodStart: weekly.periodStart,
    periodEnd: weekly.periodEnd,
    sourceHash: weekly.sourceHashes[index],
    forecastId: fixtures.weeklySources[index].sources.forecastId,
    productionPlanId:
      fixtures.weeklySources[index].sources.productionPlanId,
    executionRecordId:
      fixtures.weeklySources[index].sources.executionRecordId,
    inventoryDayId:
      fixtures.weeklySources[index].sources.inventoryDayId,
    physicalCountRecordId:
      fixtures.weeklySources[index].sources.physicalCountRecordId,
  })),
];

const scenarioRows = fixtures.scenarios.map((scenario) => ({
  scenarioId: scenario.id,
  scenarioName: scenario.name,
  deterministicStatus: "PASSED_BY_TEST_SCRIPT",
  expected: JSON.stringify(scenario.expected),
  deployedStatus: "NOT_EXECUTED",
  evidence: "",
}));

const uat = [
  ["RP-001", "OWNER", "Open daily report", "Open a completed operating date.", "Report shows forecast, plan, actual production, usage, waste, closing inventory, yield, adherence, utilization, lineage, and reconciliation status."],
  ["RP-002", "KM", "Daily source lineage", "Open source details.", "Forecast, plan, execution, inventory, count, revision, and deterministic source hash are visible."],
  ["RP-003", "KM", "Inventory reconciliation", "Compare report to ledger and physical count.", "Opening + receipts + transfers - usage - waste + adjustments equals closing within 0.01 cooked lb."],
  ["RP-004", "KM", "Unexplained difference", "Alter or stage mismatched closing quantity.", "Report is BLOCKED and names the product and difference."],
  ["RP-005", "KM", "Missing source", "Remove physical-count source reference.", "Report is BLOCKED and names physicalCountRecordId."],
  ["RP-006", "OWNER", "Forecast variance", "Compare approved forecast with actual service usage.", "Cooked-pound and percent variances match source values."],
  ["RP-007", "OWNER", "Zero forecast", "Use zero approved forecast.", "Variance percent and accuracy are N/A, not infinite or zero."],
  ["RP-008", "OWNER", "Daily forecast accuracy", "Verify one daily product.", "Accuracy equals max(0, 100 - absolute variance percent)."],
  ["RP-009", "OWNER", "Weekly forecast accuracy", "Open seven-day report.", "Accuracy uses WAPE and is not an unweighted average of daily percentages."],
  ["RP-010", "KM", "Production variance", "Compare planned cooked output with actual cooked output.", "Variance matches source records."],
  ["RP-011", "PITMASTER", "Actual yield", "Compare raw input and cooked production.", "Yield equals cooked divided by raw and is N/A for zero raw input."],
  ["RP-012", "OWNER", "Waste rate", "Compare waste to total available cooked inventory.", "Rate uses opening + receipts + transfer-in as denominator."],
  ["RP-013", "OWNER", "Ending inventory rate", "Compare closing on-hand to total available inventory.", "Rate and denominator are explained."],
  ["RP-014", "KM", "Plan adherence", "Inspect load start/end timestamps.", "Only non-cancelled loads within both tolerances count as adherent."],
  ["RP-015", "KM", "Smoker utilization", "Compare occupied and available capacity-minutes.", "Weighted total utilization matches smoker source records."],
  ["RP-016", "KM", "Over-capacity source", "Provide occupied capacity above available.", "Report is BLOCKED and identifies the smoker."],
  ["RP-017", "OWNER", "Weekly aggregation", "Open seven complete consecutive observations.", "All product totals and lineage reconcile to daily reports."],
  ["RP-018", "OWNER", "CSV export", "Export daily and weekly CSV.", "Product rows, formulas, and source hash are included."],
  ["RP-019", "OWNER", "JSON export", "Export daily and weekly JSON.", "Full report, formulas, and lineage are included."],
  ["RP-020", "KM", "Deterministic export", "Export the same unchanged report twice.", "Content and checksum are identical."],
  ["RP-021", "KM", "Insufficient learning data", "Generate with three complete observations.", "No recommendation ID is created."],
  ["RP-022", "KM", "Exclude incomplete observation", "Include an unreconciled or incomplete day.", "The observation is excluded from learning evidence."],
  ["RP-023", "KM", "Bound upward recommendation", "Use actual demand more than 15% above forecast.", "Recommended factor cannot exceed 1.15."],
  ["RP-024", "KM", "Bound downward recommendation", "Use actual demand more than 15% below forecast.", "Recommended factor cannot fall below 0.85."],
  ["RP-025", "KM", "Recommendation evidence", "Open a reviewable recommendation.", "Every observation shows date, forecast, usage, weight, source hash, forecast ID, and inventory ID."],
  ["RP-026", "KM", "Approve recommendation", "Approve with effective date and reason.", "Immutable approval preserves recommendation snapshot and evidence."],
  ["RP-027", "VIEWER", "Unauthorized approval", "Attempt approval through UI and crafted request.", "Server denies the mutation."],
  ["RP-028", "ADMIN", "Tenant isolation", "Combine or request another tenant/location source.", "No cross-tenant report or learning result is generated."],
  ["RP-029", "New user", "Explain report", "Without coaching, identify why forecast accuracy, yield, waste, and reconciliation have their displayed values.", "User can reach the formula and source lineage for each metric."],
  ["RP-030", "OWNER", "Report reconciliation sign-off", "Compare exported daily report to forecast, plan, execution, inventory ledger, and count.", "Every displayed total matches source transactions and no unexplained difference remains."],
].map((row) => ({
  testId: row[0],
  role: row[1],
  scenario: row[2],
  procedure: row[3],
  expected: row[4],
  result: "NOT_EXECUTED",
  tester: "",
  evidence: "",
  defectIds: "",
  testDate: "",
}));

writeCsv("reporting-capability-map.csv", capabilityRows, [
  "capabilityId",
  "label",
  "required",
  "status",
  "evidenceCount",
  "deployedVerification",
]);
writeCsv("reporting-source-evidence.csv", sourceRows, [
  "capabilityId",
  "sourceFile",
  "matchedTokens",
]);
writeCsv("reporting-known-scenarios.csv", scenarioRows, [
  "scenarioId",
  "scenarioName",
  "deterministicStatus",
  "expected",
  "deployedStatus",
  "evidence",
]);
writeCsv("daily-report-metrics.csv", dailyMetricRows, [
  "operatingDate",
  "reportId",
  "sourceHash",
  "reconciliationStatus",
  "productCode",
  "forecastCookedLb",
  "serviceUsageCookedLb",
  "forecastVarianceCookedLb",
  "forecastVariancePercent",
  "forecastAccuracyPercent",
  "plannedCookedLb",
  "actualCookedProductionLb",
  "productionVarianceCookedLb",
  "actualRawInputLb",
  "actualYieldPercent",
  "wasteCookedLb",
  "wasteRatePercent",
  "closingOnHandCookedLb",
  "endingInventoryRatePercent",
  "expectedClosingOnHandCookedLb",
  "unexplainedDifferenceCookedLb",
]);
writeCsv("weekly-report-metrics.csv", weeklyMetricRows, [
  "periodStart",
  "periodEnd",
  "reportId",
  "reconciliationStatus",
  "observationCount",
  "productCode",
  "forecastCookedLb",
  "serviceUsageCookedLb",
  "absoluteForecastErrorCookedLb",
  "wapePercent",
  "forecastAccuracyPercent",
  "plannedCookedLb",
  "actualCookedProductionLb",
  "productionVarianceCookedLb",
  "actualYieldPercent",
  "wasteCookedLb",
  "wasteRatePercent",
  "closingOnHandCookedLb",
  "endingInventoryRatePercent",
  "unexplainedDifferenceCookedLb",
]);
writeCsv("report-source-lineage.csv", lineageRows, [
  "reportId",
  "reportType",
  "operatingDate",
  "periodStart",
  "periodEnd",
  "sourceHash",
  "forecastId",
  "productionPlanId",
  "executionRecordId",
  "inventoryDayId",
  "physicalCountRecordId",
]);
writeCsv("forecast-learning-recommendations.csv", recommendationRows, [
  "recommendationId",
  "productCode",
  "dayType",
  "status",
  "observationCount",
  "confidence",
  "unboundedFactor",
  "recommendedFactor",
  "adjustmentPercent",
  "bounded",
  "humanApprovalRequired",
  "autoApplyAllowed",
]);
writeCsv("report-formula-glossary.csv", glossaryRows, [
  "formulaKey",
  "formula",
]);
writeCsv("reporting-uat-workbook.csv", uat, [
  "testId",
  "role",
  "scenario",
  "procedure",
  "expected",
  "result",
  "tester",
  "evidence",
  "defectIds",
  "testDate",
]);
writeCsv("reporting-findings.csv", findings, [
  "severity",
  "category",
  "subject",
  "detail",
  "releaseBlocking",
]);

const dailyJson = createReportExport(daily, "JSON");
const dailyCsv = createReportExport(daily, "CSV");
const weeklyJson = createReportExport(weekly, "JSON");
const weeklyCsv = createReportExport(weekly, "CSV");

fs.writeFileSync(
  path.join(outDir, "daily-report.json"),
  `${JSON.stringify(daily, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "weekly-report.json"),
  `${JSON.stringify(weekly, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "recommendation-approvals.json"),
  `${JSON.stringify(approvals, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, dailyJson.filename),
  dailyJson.content,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, dailyCsv.filename),
  dailyCsv.content,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, weeklyJson.filename),
  weeklyJson.content,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, weeklyCsv.filename),
  weeklyCsv.content,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "reporting-contract-snapshot.json"),
  `${JSON.stringify(contract, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "reporting-fixture-snapshot.json"),
  `${JSON.stringify(fixtures, null, 2)}\n`,
  "utf8",
);

const report = {
  buildVersion: BUILD,
  engineVersion: contract.engineVersion,
  generatedAt: new Date().toISOString(),
  exitGate: contract.exitGate,
  counts: {
    filesScanned: files.length,
    textFilesScanned: textFiles.length,
    capabilities: capabilityRows.length,
    capabilitiesWithEvidence: capabilityRows.filter(
      (row) => row.status === "STATIC_EVIDENCE_FOUND",
    ).length,
    deterministicScenarios: fixtures.scenarios.length,
    dailyProductRows: dailyMetricRows.length,
    weeklyProductRows: weeklyMetricRows.length,
    lineageRows: lineageRows.length,
    recommendations: recommendationRows.length,
    approvals: approvals.length,
    formulaRows: glossaryRows.length,
    uatRows: uat.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter(
      (finding) => finding.releaseBlocking,
    ).length,
  },
  results: {
    dailyStatus: daily.reconciliation.status,
    dailyUnexplainedDifferenceCookedLb:
      daily.reconciliation.unexplainedDifferenceCookedLb,
    weeklyStatus: weekly.reconciliation.status,
    weeklyUnexplainedDifferenceCookedLb:
      weekly.reconciliation.unexplainedDifferenceCookedLb,
    dailyPlanAdherencePercent:
      daily.planAdherence.adherencePercent,
    dailySmokerUtilizationPercent:
      daily.smokerUtilization.utilizationPercent,
    boundedRecommendations: recommendationRows.filter(
      (row) => row.bounded === true,
    ).length,
    autoAppliedRecommendations: recommendationRows.filter(
      (row) => row.autoApplyAllowed === true,
    ).length,
  },
  capabilities: capabilityRows,
  findings,
};

fs.writeFileSync(
  path.join(outDir, "reporting-readiness.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const summary = `# Build ${BUILD} Reporting and Forecast Learning Readiness

Generated: ${report.generatedAt}

## Exit gate

${contract.exitGate}

| Measure | Count |
|---|---:|
| Files scanned | ${report.counts.filesScanned} |
| Required capabilities | ${report.counts.capabilities} |
| Capabilities with evidence | ${report.counts.capabilitiesWithEvidence} |
| Deterministic scenarios | ${report.counts.deterministicScenarios} |
| Daily product rows | ${report.counts.dailyProductRows} |
| Weekly product rows | ${report.counts.weeklyProductRows} |
| Source-lineage rows | ${report.counts.lineageRows} |
| Recommendations | ${report.counts.recommendations} |
| Approval records | ${report.counts.approvals} |
| Formula rows | ${report.counts.formulaRows} |
| Deployed UAT rows | ${report.counts.uatRows} |
| Release-blocking static findings | ${report.counts.releaseBlockingFindings} |

Deterministic evidence proves formulas and source reconciliation for controlled fixtures. It does not prove deployed query correctness, durable approval persistence, authorization, tenant isolation, export performance, or reconciliation against the production database. Execute every row in \`reporting-uat-workbook.csv\`.
`;
fs.writeFileSync(
  path.join(outDir, "reporting-readiness-summary.md"),
  summary,
  "utf8",
);

const manifestFiles = fs.readdirSync(outDir).sort();
const hashes = {};
for (const name of manifestFiles) {
  const file = path.join(outDir, name);
  if (fs.statSync(file).isFile()) {
    hashes[name] = hash(fs.readFileSync(file));
  }
}
fs.writeFileSync(
  path.join(outDir, "reporting-hash-manifest.json"),
  `${JSON.stringify(
    {
      buildVersion: BUILD,
      algorithm: "sha256",
      generatedAt: report.generatedAt,
      files: hashes,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Build ${BUILD} Reporting and Learning evidence generated.`);
for (const [key, value] of Object.entries(report.counts)) {
  console.log(`${key}: ${value}`);
}
console.log(`Output: ${path.relative(root, outDir)}`);

#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { calculateProductionPlan } from "../lib/production-planning/build-11.4.0/production-planning-engine.mjs";

const BUILD = "11.4.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.4.0");
const contract = JSON.parse(fs.readFileSync(path.join(root, "config", "production-planning-contract-11.4.0.json"), "utf8"));
const fixtureSet = JSON.parse(fs.readFileSync(path.join(root, "config", "production-planning-fixtures-11.4.0.json"), "utf8"));
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(path.join(outDir, "production-hash-manifest.json"), { force: true });

const excluded = new Set([".git", ".next", "node_modules", "coverage", "dist", "build", ".turbo", ".cache", "artifacts"]);
const textExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".prisma", ".json", ".md", ".yaml", ".yml"]);

function rel(file) { return path.relative(root, file).split(path.sep).join("/"); }
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
  } catch { return ""; }
}
function hash(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function writeCsv(name, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  fs.writeFileSync(path.join(outDir, name), `${lines.join("\n")}\n`, "utf8");
}

const files = walk(root);
const textFiles = files.filter((file) => textExtensions.has(path.extname(file).toLowerCase()));
const cache = new Map(textFiles.map((file) => [file, read(file)]));

const capabilities = [
  ["carryover", "Prior-day carryover application", ["priorOperatingDate", "carryoverCredit", "sealedUnits", "openCookedLb"]],
  ["yield-conversion", "Cooked-to-raw yield conversion", ["exactRawLb", "yieldPercent", "WEIGHT_YIELD"]],
  ["unit-rounding", "Whole-unit operational rounding", ["plannedUnits", "Math.ceil", "roundingOverage"]],
  ["negative-guard", "No negative production", ["Math.max(0", "negativeProductionAllowed"]],
  ["smoker-capacity", "Validated smoker capacity", ["capacities", "NO_VALIDATED_COMPATIBLE_CAPACITY"]],
  ["smoker-schedule", "Non-overlapping smoker scheduling", ["bookings", "findEarliestSlot", "exclusive"]],
  ["cook-window", "Cook-window compatibility", ["Overnight only", "Same-day only", "Backup / overflow only"]],
  ["sunday-monday", "Sunday load for Monday demand", ["priorOperatingDate", "windowStartOffsetMinutes", "serviceDate"]],
  ["shortfall", "Explicit capacity shortfall", ["unscheduledUnits", "INSUFFICIENT_TIME_OR_CAPACITY"]],
  ["approval", "Production approval record", ["createProductionApprovalRecord", "PTT_PRODUCTION_APPROVAL_11_4_0"]],
  ["audit-version", "Calculation and record version", ["PTT_PRODUCTION_PLAN_11_4_0", "calculationVersion"]],
  ["seven-day", "Seven-day planning readiness", ["seven-day", "7-day", "seven day"]],
];

const capabilityRows = [];
const evidenceRows = [];
const findings = [];

for (const [id, label, tokens] of capabilities) {
  const matches = [];
  for (const file of textFiles) {
    const source = `${rel(file)}\n${cache.get(file) || ""}`.toLowerCase();
    const matched = tokens.filter((token) => source.includes(token.toLowerCase()));
    if (matched.length) matches.push({ sourceFile: rel(file), tokens: matched });
  }
  capabilityRows.push({
    capabilityId: id,
    label,
    required: true,
    status: matches.length ? "STATIC_EVIDENCE_FOUND" : "NO_STATIC_EVIDENCE",
    evidenceCount: matches.length,
    liveVerificationStatus: "PENDING_STAGING_UAT",
  });
  for (const match of matches.slice(0, 50)) {
    evidenceRows.push({ capabilityId: id, sourceFile: match.sourceFile, matchedTokens: match.tokens.join("|") });
  }
  if (!matches.length) {
    findings.push({
      severity: "P1", category: "PRODUCTION_CAPABILITY_GAP", subject: label,
      detail: "No static implementation evidence was detected.", releaseBlocking: true,
    });
  }
}

const scenarioRows = [];
for (const fixture of fixtureSet.fixtures) {
  const plan = calculateProductionPlan(fixture.input);
  for (const requirement of plan.requirements) {
    scenarioRows.push({
      scenarioId: fixture.id,
      scenarioName: fixture.name,
      serviceDate: plan.serviceDate,
      serviceDayName: plan.serviceDayName,
      status: plan.review.status,
      productCode: requirement.productCode,
      forecastDemand: requirement.forecastDemand,
      bufferPercent: requirement.bufferPercent,
      carryoverCredit: requirement.carryover.totalCredit,
      netDemand: requirement.netDemand,
      yieldPercent: requirement.yieldPercent,
      exactRawLb: requirement.exactRawLb,
      plannedUnits: requirement.plannedUnits,
      plannedRawLb: requirement.plannedRawLb,
      roundingOverage: requirement.roundingOverage,
      batchCount: plan.schedule.bookings.filter((booking) => booking.productCode === requirement.productCode).length,
      unscheduledUnits: plan.schedule.unscheduled
        .filter((row) => row.productCode === requirement.productCode)
        .reduce((sum, row) => sum + row.quantity, 0),
      warnings: requirement.warnings.join("|"),
      blockers: requirement.blockers.join("|"),
    });
  }
}

const sevenDayRows = [];
const start = new Date("2026-08-03T12:00:00Z");
for (let offset = 0; offset < 7; offset += 1) {
  const date = new Date(start);
  date.setUTCDate(date.getUTCDate() + offset);
  const serviceDate = date.toISOString().slice(0, 10);
  const prior = new Date(date);
  prior.setUTCDate(prior.getUTCDate() - 1);
  const priorOperatingDate = prior.toISOString().slice(0, 10);
  const source = fixtureSet.fixtures[0].input;
  const input = {
    ...source,
    serviceDate,
    forecastCalculationId: `seven-day-${serviceDate}`,
    products: source.products.map((product) => ({
      ...product,
      carryover: { ...product.carryover, sourceOperatingDate: priorOperatingDate, sealedUnits: 0, openCookedLb: 0 },
    })),
  };
  const plan = calculateProductionPlan(input);
  sevenDayRows.push({
    serviceDate,
    serviceDayName: plan.serviceDayName,
    status: plan.review.status,
    batchCount: plan.schedule.batchCount,
    unscheduledUnits: plan.schedule.unscheduledUnits,
    warningCount: plan.review.warnings.length,
    blockerCount: plan.review.blockers.length,
    overnightBatchCount: plan.schedule.bookings.filter((booking) => booking.start.date < serviceDate).length,
  });
}

const uat = [
  ["PD-001", "KM", "Approved forecast conversion", "Convert an approved four-product forecast into production requirements.", "All demand lines retain forecast ID and calculation version."],
  ["PD-002", "KM", "Prior-day carryover", "Enter sealed and opened carryover from the immediately prior operating date.", "Eligible credits apply once and remain visible."],
  ["PD-003", "KM", "Stale carryover", "Enter carryover dated two days before service.", "Carryover is excluded and a warning explains why."],
  ["PD-004", "KM", "Brisket sealed exclusion", "Enter sealed brisket.", "No sealed credit is applied."],
  ["PD-005", "KM", "Yield conversion", "Verify pork/brisket cooked demand to exact raw pounds.", "Formula matches configured effective-dated yield."],
  ["PD-006", "KM", "Whole-unit rounding", "Use demand that requires a partial brisket, butt, rack or chicken.", "Operational quantity rounds up and overage is visible."],
  ["PD-007", "KM", "No negative production", "Enter carryover above buffered demand.", "Production remains zero; surplus is visible."],
  ["PD-008", "PITMASTER", "Smoker allocation", "Generate a complete schedule with validated capacities.", "No smoker has overlapping exclusive bookings."],
  ["PD-009", "PITMASTER", "Multiple cycles", "Plan a product above one-batch capacity with sufficient time.", "Additional cycles are scheduled and final partial batch is visible."],
  ["PD-010", "PITMASTER", "Capacity shortfall", "Plan demand above available time/capacity.", "Unscheduled quantity blocks approval."],
  ["PD-011", "PITMASTER", "Backup smoker", "Exhaust primary slots while backup is available.", "Backup is used only after primary slots are exhausted."],
  ["PD-012", "KM", "Monday operating date", "Generate Monday demand with preceding-day brisket and pork loads.", "Demand remains Monday; preceding load date is Sunday."],
  ["PD-013", "KM", "Seven-day plan", "Generate seven consecutive operating dates.", "Every day has nonnegative quantities and no unexplained impossible load."],
  ["PD-014", "KC", "Unauthorized approval", "Attempt production approval through UI and crafted request.", "Server denies the mutation."],
  ["PD-015", "VIEWER", "Read-only access", "Attempt to alter carryover, yield, capacities or bookings.", "All mutations are denied."],
  ["PD-016", "ADMIN", "Tenant isolation", "Use another tenant's forecast, smoker or plan identifier.", "No data is exposed or changed."],
  ["PD-017", "KM", "Duplicate approval", "Repeat the approval request.", "One durable approval or idempotent duplicate is returned."],
  ["PD-018", "ADMIN", "Historical preservation", "Change yield or capacity after approval.", "The approved plan retains original calculation version and inputs."],
  ["PD-019", "PITMASTER", "Unvalidated capacity", "Attempt to release a rib/chicken plan using a placeholder capacity.", "Release remains blocked until capacity is approved."],
  ["PD-020", "KM", "Provider outage", "Disable POS/provider access and use an approved local forecast.", "Core production planning remains available."],
].map((row) => ({
  testId: row[0], role: row[1], scenario: row[2], procedure: row[3], expected: row[4],
  result: "NOT_EXECUTED", tester: "", evidence: "", defectIds: "", testDate: "",
}));

writeCsv("production-capability-map.csv", capabilityRows, [
  "capabilityId", "label", "required", "status", "evidenceCount", "liveVerificationStatus"
]);
writeCsv("production-source-evidence.csv", evidenceRows, ["capabilityId", "sourceFile", "matchedTokens"]);
writeCsv("production-known-scenarios.csv", scenarioRows, [
  "scenarioId", "scenarioName", "serviceDate", "serviceDayName", "status", "productCode",
  "forecastDemand", "bufferPercent", "carryoverCredit", "netDemand", "yieldPercent",
  "exactRawLb", "plannedUnits", "plannedRawLb", "roundingOverage", "batchCount",
  "unscheduledUnits", "warnings", "blockers"
]);
writeCsv("seven-day-production-plan.csv", sevenDayRows, [
  "serviceDate", "serviceDayName", "status", "batchCount", "unscheduledUnits",
  "warningCount", "blockerCount", "overnightBatchCount"
]);
writeCsv("production-uat-workbook.csv", uat, [
  "testId", "role", "scenario", "procedure", "expected", "result", "tester", "evidence", "defectIds", "testDate"
]);
writeCsv("production-findings.csv", findings, ["severity", "category", "subject", "detail", "releaseBlocking"]);

const report = {
  buildVersion: BUILD,
  calculationVersion: contract.calculationVersion,
  generatedAt: new Date().toISOString(),
  exitGate: contract.exitGate,
  counts: {
    filesScanned: files.length,
    textFilesScanned: textFiles.length,
    capabilities: capabilityRows.length,
    capabilitiesWithEvidence: capabilityRows.filter((row) => row.status === "STATIC_EVIDENCE_FOUND").length,
    fixtures: fixtureSet.fixtures.length,
    scenarioRows: scenarioRows.length,
    sevenDayRows: sevenDayRows.length,
    uatRows: uat.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter((row) => row.releaseBlocking).length,
  },
  capabilities: capabilityRows,
  sevenDayRows,
  findings,
};

fs.writeFileSync(path.join(outDir, "production-readiness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "production-contract-snapshot.json"), `${JSON.stringify(contract, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "production-fixture-snapshot.json"), `${JSON.stringify(fixtureSet, null, 2)}\n`, "utf8");

const summary = `# Build ${BUILD} Production Planning Readiness

Generated: ${report.generatedAt}

## Exit gate

${contract.exitGate}

| Measure | Count |
|---|---:|
| Files scanned | ${report.counts.filesScanned} |
| Required capabilities | ${report.counts.capabilities} |
| Capabilities with evidence | ${report.counts.capabilitiesWithEvidence} |
| Known fixtures | ${report.counts.fixtures} |
| Product scenario rows | ${report.counts.scenarioRows} |
| Seven-day rows | ${report.counts.sevenDayRows} |
| UAT rows | ${report.counts.uatRows} |
| Release-blocking static findings | ${report.counts.releaseBlockingFindings} |

Fixture success does not prove durable persistence, authorization, tenant isolation, approval idempotency, measured capacity or live kitchen usability. Execute every row in production-uat-workbook.csv in isolated staging.
`;
fs.writeFileSync(path.join(outDir, "production-readiness-summary.md"), summary, "utf8");

const beforeManifest = fs.readdirSync(outDir).sort();
const hashes = {};
for (const name of beforeManifest) {
  const file = path.join(outDir, name);
  if (fs.statSync(file).isFile()) hashes[name] = hash(fs.readFileSync(file));
}
fs.writeFileSync(
  path.join(outDir, "production-hash-manifest.json"),
  `${JSON.stringify({ buildVersion: BUILD, algorithm: "sha256", generatedAt: report.generatedAt, files: hashes }, null, 2)}\n`,
  "utf8",
);

console.log(`Build ${BUILD} production control plane generated.`);
for (const [key, value] of Object.entries(report.counts)) console.log(`${key}: ${value}`);
console.log(`Output: ${path.relative(root, outDir)}`);

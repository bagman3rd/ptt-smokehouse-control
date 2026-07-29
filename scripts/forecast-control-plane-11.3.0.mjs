#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { calculateForecast } from "../lib/forecasting/build-11.3.0/forecast-engine.mjs";

const BUILD = "11.3.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.3.0");
const contract = JSON.parse(
  fs.readFileSync(path.join(root, "config", "forecast-contract-11.3.0.json"), "utf8"),
);
const fixtureSet = JSON.parse(
  fs.readFileSync(path.join(root, "config", "forecast-fixtures-11.3.0.json"), "utf8"),
);

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(path.join(outDir, "forecast-hash-manifest.json"), { force: true });

const excluded = new Set([
  ".git", ".next", "node_modules", "coverage", "dist", "build",
  ".turbo", ".cache", "artifacts"
]);
const textExtensions = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".prisma", ".json", ".md", ".yaml", ".yml"
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
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function writeCsv(name, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }
  fs.writeFileSync(path.join(outDir, name), `${lines.join("\n")}\n`, "utf8");
}

const files = walk(root);
const textFiles = files.filter((file) => textExtensions.has(path.extname(file).toLowerCase()));
const cache = new Map(textFiles.map((file) => [file, read(file)]));

const capabilities = [
  {
    id: "baseline-demand",
    label: "Average-day product baseline",
    tokens: ["baselineDemand", "baseline demand", "forecast baseline"],
    required: true,
  },
  {
    id: "dow-adjustment",
    label: "Day-of-week adjustment",
    tokens: ["dayOfWeek", "day of week", "DOW", "DAY_OF_WEEK_SHARES"],
    required: true,
  },
  {
    id: "monthly-adjustment",
    label: "Monthly seasonality",
    tokens: ["monthlyFactor", "monthly factor", "month adjustment", "seasonality"],
    required: true,
  },
  {
    id: "event-adjustment",
    label: "Event adjustment",
    tokens: ["eventAdjustment", "event uplift", "event factor", "local event"],
    required: true,
  },
  {
    id: "manual-override",
    label: "Manual adjustment with reason",
    tokens: ["manualAdjustment", "override reason", "manual adjustment"],
    required: true,
  },
  {
    id: "confidence",
    label: "Confidence badge and explanation",
    tokens: ["confidenceBadge", "confidence score", "confidence"],
    required: true,
  },
  {
    id: "approval",
    label: "Approval record",
    tokens: ["approvalId", "approvedBy", "forecast approval", "createForecastApprovalRecord"],
    required: true,
  },
  {
    id: "audit-version",
    label: "Calculation version and audit evidence",
    tokens: ["calculationVersion", "FORECAST_CALCULATION_VERSION", "prior value", "new value"],
    required: true,
  },
  {
    id: "sales-display",
    label: "Bar and food sales display",
    tokens: ["barAllocationPercent", "bar sales", "foodSalesDollars"],
    required: true,
  },
  {
    id: "pos-import-path",
    label: "Future POS import/API path",
    tokens: ["PosConnection", "pos import", "sales import", "Square"],
    required: false,
  },
];

const capabilityRows = [];
const evidenceRows = [];
const findings = [];

for (const capability of capabilities) {
  const matches = [];
  for (const file of textFiles) {
    const source = `${rel(file)}\n${cache.get(file) || ""}`.toLowerCase();
    const tokens = capability.tokens.filter((token) => source.includes(token.toLowerCase()));
    if (tokens.length) matches.push({ sourceFile: rel(file), tokens });
  }
  const status = matches.length ? "STATIC_EVIDENCE_FOUND" : "NO_STATIC_EVIDENCE";
  capabilityRows.push({
    capabilityId: capability.id,
    label: capability.label,
    required: capability.required,
    status,
    evidenceCount: matches.length,
    liveVerificationStatus: "PENDING_STAGING_UAT",
  });
  for (const match of matches.slice(0, 50)) {
    evidenceRows.push({
      capabilityId: capability.id,
      sourceFile: match.sourceFile,
      matchedTokens: match.tokens.join("|"),
    });
  }
  if (capability.required && !matches.length) {
    findings.push({
      severity: "P1",
      category: "FORECAST_CAPABILITY_GAP",
      subject: capability.label,
      detail: "No static implementation evidence was detected.",
      releaseBlocking: true,
    });
  }
}

const scenarioRows = [];
for (const fixture of fixtureSet.fixtures) {
  const result = calculateForecast(fixture.input);
  for (const line of result.demand.lines) {
    scenarioRows.push({
      scenarioId: fixture.id,
      scenarioName: fixture.name,
      operatingDate: result.operatingDate,
      dayName: result.dayOfWeek.name,
      productCode: line.productCode,
      baselineDemand: line.baselineDemand,
      dayFactor: result.dayOfWeek.factor,
      monthlyFactor: result.factors.monthlyFactor,
      eventFactor: result.factors.eventFactor,
      manualFactor: result.factors.manualFactor,
      finalFactor: result.factors.finalFactor,
      finalDemand: line.finalDemand,
      unit: line.unit,
      confidenceBadge: result.confidence.badge,
      confidenceScore: result.confidence.score,
      approvalRequired: result.review.approvalRequired,
      warnings: result.review.warnings.join("|"),
    });
  }
}

const uat = [
  ["FD-001", "KM", "Normal weekday", "Calculate a normal weekday with no event or manual adjustment.", "Displayed result matches fixture F-001 and formula explanation."],
  ["FD-002", "KM", "Saturday demand", "Calculate Saturday demand using the approved DOW shares.", "Results match fixture F-002."],
  ["FD-003", "KM", "High-volume event", "Apply monthly factor 1.10 and event uplift 20%.", "Results match fixture F-003; review is required."],
  ["FD-004", "KM", "Manual override", "Apply -10% manual adjustment with a reason.", "Original automatic value, final value, actor and reason remain visible."],
  ["FD-005", "OWNER", "Sales display", "Enter $60,000 modeled sales.", "Bar displays $12,000; food displays $48,000; smoked food displays $24,000 at 50%."],
  ["FD-006", "KM", "Sunday-to-Monday boundary", "Forecast Monday service demand while loads may occur Sunday.", "Monday DOW share is used for the Monday operating date."],
  ["FD-007", "KM", "Low confidence", "Use stale, sparse and high-error evidence with a low-certainty event.", "Confidence is LOW and warning detail is understandable."],
  ["FD-008", "KM", "High confidence", "Use fresh, sufficient and accurate evidence.", "Confidence is HIGH."],
  ["FD-009", "KC", "Unauthorized approval", "Attempt to approve or change an approved forecast through UI and crafted request.", "Server rejects the mutation and records no approval."],
  ["FD-010", "VIEWER", "Read-only forecast", "Open forecast pages and attempt mutation.", "Approved read access only; mutation is denied."],
  ["FD-011", "KM", "Invalid baseline", "Enter negative product demand.", "Validation blocks calculation and identifies the product field."],
  ["FD-012", "KM", "Missing reason", "Enter a non-zero manual adjustment without a reason.", "Validation blocks the adjustment."],
  ["FD-013", "KM", "Extreme automatic factor", "Create automatic factor outside 0.50–2.00.", "Explicit review reason is required; warning remains in approval record."],
  ["FD-014", "ADMIN", "Calculation version", "Approve a forecast, deploy a later build, then reopen the record.", "The record retains PTT_FORECAST_11_3_0 and original inputs/outputs."],
  ["FD-015", "ADMIN", "Tenant isolation", "Craft a request using another tenant's forecast identifier.", "No forecast data is read, inferred or changed."],
  ["FD-016", "KM", "Duplicate approval", "Repeat approval click/network request.", "Only one durable approval is created or idempotent duplicate is returned."],
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

writeCsv("forecast-capability-map.csv", capabilityRows, [
  "capabilityId", "label", "required", "status", "evidenceCount", "liveVerificationStatus"
]);
writeCsv("forecast-source-evidence.csv", evidenceRows, [
  "capabilityId", "sourceFile", "matchedTokens"
]);
writeCsv("forecast-known-scenarios.csv", scenarioRows, [
  "scenarioId", "scenarioName", "operatingDate", "dayName", "productCode",
  "baselineDemand", "dayFactor", "monthlyFactor", "eventFactor", "manualFactor",
  "finalFactor", "finalDemand", "unit", "confidenceBadge", "confidenceScore",
  "approvalRequired", "warnings"
]);
writeCsv("forecast-uat-workbook.csv", uat, [
  "testId", "role", "scenario", "procedure", "expected", "result",
  "tester", "evidence", "defectIds", "testDate"
]);
writeCsv("forecast-findings.csv", findings, [
  "severity", "category", "subject", "detail", "releaseBlocking"
]);

const report = {
  buildVersion: BUILD,
  generatedAt: new Date().toISOString(),
  calculationVersion: contract.calculationVersion,
  exitGate: contract.exitGate,
  counts: {
    filesScanned: files.length,
    textFilesScanned: textFiles.length,
    capabilities: capabilityRows.length,
    capabilitiesWithEvidence: capabilityRows.filter((row) => row.status === "STATIC_EVIDENCE_FOUND").length,
    fixtures: fixtureSet.fixtures.length,
    scenarioRows: scenarioRows.length,
    uatRows: uat.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter((row) => row.releaseBlocking).length,
  },
  capabilities: capabilityRows,
  findings,
};
fs.writeFileSync(path.join(outDir, "forecast-readiness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "forecast-contract-snapshot.json"), `${JSON.stringify(contract, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "forecast-fixture-snapshot.json"), `${JSON.stringify(fixtureSet, null, 2)}\n`, "utf8");

const summary = `# Build ${BUILD} Forecast and Demand Readiness

Generated: ${report.generatedAt}

## Exit gate

${contract.exitGate}

## Static and deterministic evidence

| Measure | Count |
|---|---:|
| Files scanned | ${report.counts.filesScanned} |
| Forecast capabilities | ${report.counts.capabilities} |
| Capabilities with evidence | ${report.counts.capabilitiesWithEvidence} |
| Known fixtures | ${report.counts.fixtures} |
| Product scenario rows | ${report.counts.scenarioRows} |
| UAT rows | ${report.counts.uatRows} |
| Release-blocking findings | ${report.counts.releaseBlockingFindings} |

The fixture suite proves deterministic formula behavior. It does not prove database persistence, server-side authorization, tenant isolation, approval idempotency or deployed usability. Execute every row in \`forecast-uat-workbook.csv\` against isolated staging.
`;
fs.writeFileSync(path.join(outDir, "forecast-readiness-summary.md"), summary, "utf8");

const filesBeforeManifest = fs.readdirSync(outDir).sort();
const hashes = {};
for (const name of filesBeforeManifest) {
  const file = path.join(outDir, name);
  if (fs.statSync(file).isFile()) hashes[name] = hash(fs.readFileSync(file));
}
fs.writeFileSync(
  path.join(outDir, "forecast-hash-manifest.json"),
  `${JSON.stringify({
    buildVersion: BUILD,
    algorithm: "sha256",
    generatedAt: report.generatedAt,
    files: hashes,
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Build ${BUILD} forecast control plane generated.`);
for (const [key, value] of Object.entries(report.counts)) console.log(`${key}: ${value}`);
console.log(`Output: ${path.relative(root, outDir)}`);

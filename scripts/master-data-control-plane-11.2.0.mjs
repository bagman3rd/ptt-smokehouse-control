#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.2.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.2.0");
const contractPath = path.join(root, "config", "ptt-master-data-contract-11.2.0.json");
const scenarioPath = path.join(root, "config", "fresh-tenant-scenario-11.2.0.json");

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(path.join(outDir, "master-data-hash-manifest.json"), { force: true });

const excluded = new Set([".git", ".next", "node_modules", "coverage", "dist", "build", ".turbo", ".cache", "artifacts"]);
const codeExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const textExtensions = new Set([...codeExtensions, ".prisma", ".json", ".md", ".yaml", ".yml"]);

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
function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const allFiles = walk(root);
const textFiles = allFiles.filter((file) => textExtensions.has(path.extname(file).toLowerCase()));
const codeFiles = allFiles.filter((file) => codeExtensions.has(path.extname(file).toLowerCase()));
const cache = new Map(textFiles.map((file) => [file, read(file)]));

const prismaPath = path.join(root, "prisma", "schema.prisma");
const prisma = fs.existsSync(prismaPath) ? read(prismaPath) : "";
const prismaModels = [];
const prismaEnums = [];

for (const match of prisma.matchAll(/\bmodel\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\n\}/g)) {
  const fields = match[2]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
  prismaModels.push({ name: match[1], fields });
}
for (const match of prisma.matchAll(/\benum\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\n\}/g)) {
  const values = match[2]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
  prismaEnums.push({ name: match[1], values });
}

function routeFromPage(file) {
  const appRoot = path.join(root, "app");
  const parts = path.relative(appRoot, file).split(path.sep);
  parts.pop();
  const segments = parts
    .filter((part) => !/^\([^)]*\)$/.test(part) && !part.startsWith("@"))
    .map((part) => {
      const optional = part.match(/^\[\[\.\.\.(.+)\]\]$/);
      if (optional) return `*?${optional[1]}`;
      const catchAll = part.match(/^\[\.\.\.(.+)\]$/);
      if (catchAll) return `*${catchAll[1]}`;
      const dynamic = part.match(/^\[(.+)\]$/);
      if (dynamic) return `:${dynamic[1]}`;
      return part;
    });
  return `/${segments.join("/")}`.replace(/\/+/g, "/") || "/";
}

const pageFiles = codeFiles.filter((file) => /(^|[\\/])app[\\/].*[\\/]page\.(?:js|jsx|ts|tsx)$/.test(file));
const routes = pageFiles.map((file) => ({ route: routeFromPage(file), sourceFile: rel(file), content: cache.get(file) || "" }));

const fieldEvidence = [];
const routeEvidence = [];
const capabilityMap = [];
const findings = [];

for (const capability of contract.requiredCapabilities) {
  const aliasMatches = prismaModels.filter((model) =>
    capability.modelAliases.some((alias) =>
      normalize(model.name).includes(normalize(alias)) || normalize(alias).includes(normalize(model.name))
    )
  );

  const matchingRoutes = routes.filter((row) =>
    capability.routeTokens.some((token) =>
      row.route.toLowerCase().includes(token.toLowerCase()) ||
      row.content.toLowerCase().includes(token.toLowerCase())
    )
  );

  const matchingFiles = [];
  for (const file of textFiles) {
    const content = cache.get(file) || "";
    const lower = `${rel(file)}\n${content}`.toLowerCase();
    const matchedTokens = capability.fieldTokens.filter((token) => lower.includes(token.toLowerCase()));
    if (matchedTokens.length) {
      matchingFiles.push({ sourceFile: rel(file), tokens: matchedTokens });
    }
  }

  for (const model of aliasMatches) {
    fieldEvidence.push({
      capabilityId: capability.id,
      evidenceType: "PRISMA_MODEL",
      evidenceName: model.name,
      sourceFile: "prisma/schema.prisma",
      detail: model.fields.join("|")
    });
  }
  for (const row of matchingRoutes) {
    routeEvidence.push({
      capabilityId: capability.id,
      route: row.route,
      sourceFile: row.sourceFile,
      evidence: "ROUTE_OR_PAGE_TOKEN_MATCH"
    });
  }
  for (const row of matchingFiles.slice(0, 50)) {
    fieldEvidence.push({
      capabilityId: capability.id,
      evidenceType: "SOURCE_TOKEN",
      evidenceName: row.tokens.join("|"),
      sourceFile: row.sourceFile,
      detail: ""
    });
  }

  const modelCoverage = aliasMatches.length > 0;
  const routeCoverage = matchingRoutes.length > 0;
  const fieldCoverage = matchingFiles.length > 0;
  const status = modelCoverage && routeCoverage
    ? "STATIC_COVERAGE_FOUND"
    : (modelCoverage || routeCoverage || fieldCoverage ? "PARTIAL_STATIC_COVERAGE" : "NO_STATIC_COVERAGE");

  capabilityMap.push({
    capabilityId: capability.id,
    label: capability.label,
    required: capability.required,
    status,
    modelCoverage,
    routeCoverage,
    fieldCoverage,
    modelEvidence: aliasMatches.map((model) => model.name).join("|"),
    routeEvidence: matchingRoutes.map((row) => row.route).join("|"),
    liveVerificationStatus: "PENDING_FRESH_TENANT_UAT"
  });

  if (capability.required && status !== "STATIC_COVERAGE_FOUND") {
    findings.push({
      severity: "P1",
      category: "MASTER_DATA_CAPABILITY_GAP",
      capabilityId: capability.id,
      subject: capability.label,
      detail: `Static status: ${status}. Confirm or remediate in staging before Build ${BUILD} approval.`,
      releaseBlocking: true
    });
  }
}

const exactValueEvidence = [
  ...contract.smokerLocationValues,
  ...contract.cookWindowValues,
  ...contract.canonicalRoles.map((role) => role.code)
].map((value) => {
  const hits = textFiles.filter((file) => (cache.get(file) || "").includes(value)).map(rel);
  return {
    value,
    evidenceCount: hits.length,
    sourceFiles: hits.slice(0, 25).join("|"),
    status: hits.length ? "FOUND" : "NOT_FOUND"
  };
});

for (const row of exactValueEvidence.filter((row) => row.status === "NOT_FOUND")) {
  findings.push({
    severity: "P1",
    category: "CANONICAL_VALUE_NOT_DETECTED",
    capabilityId: "",
    subject: row.value,
    detail: "Exact canonical dropdown or role value was not detected in repository text. Verify generated or database-backed definitions in staging.",
    releaseBlocking: true
  });
}

const directDbRisk = [];
const riskyPatterns = [
  { id: "PRISMA_STUDIO_IN_SETUP_DOC", pattern: /prisma\s+studio/i },
  { id: "DIRECT_SQL_SETUP_INSTRUCTION", pattern: /\b(?:insert|update|delete)\s+into\b/i },
  { id: "DATABASE_CONSOLE_SETUP_INSTRUCTION", pattern: /database\s+console/i }
];
for (const file of textFiles.filter((file) => [".md", ".txt"].includes(path.extname(file).toLowerCase()))) {
  const sourceFile = rel(file);
  if (/BUILD_11_2_0|DEPLOY_BUILD_11_2_0|MASTER_DATA_|FRESH_TENANT_|RELEASE_EVIDENCE_11_2_0/i.test(sourceFile)) continue;
  const content = cache.get(file) || "";
  const prohibitedContext = /(?:do not|without|prohibit|not an accepted|reserved for an incident)/i.test(content);
  for (const risk of riskyPatterns) {
    if (!prohibitedContext && risk.pattern.test(content) && /setup|onboard|master data/i.test(content)) {
      directDbRisk.push({ riskId: risk.id, sourceFile });
    }
  }
}
for (const risk of directDbRisk) {
  findings.push({
    severity: "P1",
    category: "DIRECT_DATABASE_SETUP_RISK",
    capabilityId: "",
    subject: risk.riskId,
    detail: risk.sourceFile,
    releaseBlocking: true
  });
}

const uatRows = [
  ["FT-001", "ADMIN", "Create tenant/restaurant", "Create the restaurant using approved UI/API.", "Restaurant exists with audit evidence; no direct DB edit.", "NOT_EXECUTED"],
  ["FT-002", "ADMIN", "Create primary location", "Create one active location with America/New_York timezone.", "Location is tenant-scoped and selectable.", "NOT_EXECUTED"],
  ["FT-003", "ADMIN", "Set service hours", "Set daily service hours to 11:00–22:00.", "Operating-day logic uses approved restaurant date.", "NOT_EXECUTED"],
  ["FT-004", "ADMIN", "Configure brisket", "Create/activate brisket with an approved effective-dated yield.", "No unstated hard-coded yield is used.", "NOT_EXECUTED"],
  ["FT-005", "ADMIN", "Configure pork", "Configure pork with 55% baseline yield.", "Effective-dated rule saves and is auditable.", "NOT_EXECUTED"],
  ["FT-006", "ADMIN", "Configure ribs", "Configure ribs in racks with 3.3 lb raw, 3.0 lb cooked and 90% yield.", "Operational display is racks; weights remain available.", "NOT_EXECUTED"],
  ["FT-007", "ADMIN", "Configure chicken", "Configure chicken as 2.5 lb whole-bird-equivalent double breast and one smoker-space unit.", "Display and capacity semantics are correct.", "NOT_EXECUTED"],
  ["FT-008", "ADMIN", "Configure carryover", "Enable sealed next-day credit for pork/chicken/ribs and disable it for brisket.", "Prior-day credit applies once only.", "NOT_EXECUTED"],
  ["FT-009", "ADMIN", "Create Ole Hickory smoker", "Use Smoker Brand; set location and cook window from exact dropdown values.", "EL-ED/X exists with approved baseline capacities.", "NOT_EXECUTED"],
  ["FT-010", "ADMIN", "Create Southern Pride smoker", "Use Smoker Brand; set location and cook window from exact dropdown values.", "SPK-700 exists with approved baseline capacities.", "NOT_EXECUTED"],
  ["FT-011", "ADMIN", "Validate unresolved capacities", "Leave no invented rib/chicken/mixed-load capacity marked as approved.", "Unvalidated capacities are clearly pending.", "NOT_EXECUTED"],
  ["FT-012", "ADMIN", "Create memberships", "Assign ADMIN, OWNER, KM, KC, PITMASTER and VIEWER test memberships.", "Each role can sign in with correct tenant/location scope.", "NOT_EXECUTED"],
  ["FT-013", "KC", "Attempt privileged setup", "Open setup routes directly and attempt a mutation.", "Access is denied server-side; no change occurs.", "NOT_EXECUTED"],
  ["FT-014", "VIEWER", "Verify read-only restriction", "Attempt product, smoker and role mutation.", "All mutations are denied.", "NOT_EXECUTED"],
  ["FT-015", "ADMIN", "Complete onboarding validation", "Run the application’s setup validation.", "No required item is missing; no database edit was needed.", "NOT_EXECUTED"],
  ["FT-016", "OWNER", "Review configuration", "Review products, units, yields, smokers, roles and operating rules.", "Owner approval and configuration version are recorded.", "NOT_EXECUTED"],
  ["FT-017", "ADMIN", "Historical protection", "Change a yield effective tomorrow.", "Prior approved service-date calculations do not change.", "NOT_EXECUTED"],
  ["FT-018", "ADMIN", "Cross-tenant isolation", "Attempt to read and mutate a second tenant by URL/API manipulation.", "No data is exposed or changed.", "NOT_EXECUTED"]
]
const uat = uatRows.map((row) => ({
  testId: row[0],
  role: row[1],
  capability: row[2],
  procedure: row[3],
  expected: row[4],
  result: row[5],
  tester: "",
  evidence: "",
  defectIds: "",
  testDate: ""
}));

const report = {
  buildVersion: BUILD,
  generatedAt: new Date().toISOString(),
  acceptanceStatement: contract.acceptanceStatement,
  counts: {
    filesScanned: allFiles.length,
    textFilesScanned: textFiles.length,
    prismaModels: prismaModels.length,
    prismaEnums: prismaEnums.length,
    applicationRoutes: routes.length,
    capabilities: capabilityMap.length,
    fullyCoveredCapabilities: capabilityMap.filter((row) => row.status === "STATIC_COVERAGE_FOUND").length,
    partialCapabilities: capabilityMap.filter((row) => row.status === "PARTIAL_STATIC_COVERAGE").length,
    missingCapabilities: capabilityMap.filter((row) => row.status === "NO_STATIC_COVERAGE").length,
    canonicalValuesChecked: exactValueEvidence.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter((row) => row.releaseBlocking).length
  },
  capabilityMap,
  exactValueEvidence,
  prisma: { models: prismaModels, enums: prismaEnums },
  routes: routes.map(({ route, sourceFile }) => ({ route, sourceFile })),
  findings
};

fs.writeFileSync(path.join(outDir, "master-data-readiness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "canonical-master-data.json"), `${JSON.stringify(contract, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "fresh-tenant-configuration-template.json"), `${JSON.stringify(scenario, null, 2)}\n`, "utf8");

writeCsv("master-data-capability-map.csv", capabilityMap, [
  "capabilityId", "label", "required", "status", "modelCoverage", "routeCoverage",
  "fieldCoverage", "modelEvidence", "routeEvidence", "liveVerificationStatus"
]);
writeCsv("master-data-field-evidence.csv", fieldEvidence, [
  "capabilityId", "evidenceType", "evidenceName", "sourceFile", "detail"
]);
writeCsv("master-data-route-evidence.csv", routeEvidence, [
  "capabilityId", "route", "sourceFile", "evidence"
]);
writeCsv("canonical-value-evidence.csv", exactValueEvidence, [
  "value", "evidenceCount", "sourceFiles", "status"
]);
writeCsv("fresh-tenant-uat-workbook.csv", uat, [
  "testId", "role", "capability", "procedure", "expected", "result",
  "tester", "evidence", "defectIds", "testDate"
]);
writeCsv("master-data-findings.csv", findings, [
  "severity", "category", "capabilityId", "subject", "detail", "releaseBlocking"
]);

const summary = `# Build ${BUILD} Setup and Master Data Readiness

Generated: ${report.generatedAt}

## Acceptance statement

${contract.acceptanceStatement}

## Static baseline

| Measure | Count |
|---|---:|
| Files scanned | ${report.counts.filesScanned} |
| Prisma models | ${report.counts.prismaModels} |
| Application routes | ${report.counts.applicationRoutes} |
| Required capabilities | ${report.counts.capabilities} |
| Full static coverage | ${report.counts.fullyCoveredCapabilities} |
| Partial static coverage | ${report.counts.partialCapabilities} |
| No static coverage | ${report.counts.missingCapabilities} |
| Canonical values checked | ${report.counts.canonicalValuesChecked} |
| Release-blocking findings pending review | ${report.counts.releaseBlockingFindings} |

## Interpretation

Static evidence establishes where master-data capability appears in source. It does not prove that an authorized user can complete setup in the deployed application. Execute every row in \`fresh-tenant-uat-workbook.csv\` in isolated staging.

## Release rule

Build ${BUILD} is not approved until every required capability passes fresh-tenant UAT, exact canonical values are verified in the deployed UI/API, role restrictions and tenant isolation pass, configuration changes are auditable, and no direct database edit is used.
`;
fs.writeFileSync(path.join(outDir, "master-data-readiness-summary.md"), summary, "utf8");

const filesBeforeManifest = fs.readdirSync(outDir).sort();
const hashes = {};
for (const fileName of filesBeforeManifest) {
  const file = path.join(outDir, fileName);
  if (fs.statSync(file).isFile()) hashes[fileName] = hash(fs.readFileSync(file));
}
fs.writeFileSync(
  path.join(outDir, "master-data-hash-manifest.json"),
  `${JSON.stringify({ buildVersion: BUILD, algorithm: "sha256", generatedAt: report.generatedAt, files: hashes }, null, 2)}\n`,
  "utf8"
);

console.log(`Build ${BUILD} master-data control plane generated.`);
for (const [key, value] of Object.entries(report.counts)) console.log(`${key}: ${value}`);
console.log(`Output: ${path.relative(root, outDir)}`);

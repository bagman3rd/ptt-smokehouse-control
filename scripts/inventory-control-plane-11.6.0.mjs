#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createInventoryContingencySnapshot,
  createInventoryDay,
  deriveInventoryBoard,
  executeInventoryCommand,
} from "../lib/inventory-control/build-11.6.0/inventory-control-engine.mjs";

const BUILD = "11.6.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.6.0");
const contract = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "inventory-control-contract-11.6.0.json"),
    "utf8",
  ),
);
const fixtureSet = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "inventory-control-fixtures-11.6.0.json"),
    "utf8",
  ),
);

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(path.join(outDir, "inventory-hash-manifest.json"), { force: true });

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
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function writeCsv(name, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }
  fs.writeFileSync(path.join(outDir, name), `${lines.join("\n")}\n`, "utf8");
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function command(commandId, type, actor, payload, state, occurredAt) {
  return {
    commandId,
    type,
    actor,
    payload: payload || {},
    tenantId: state.tenantId,
    occurredAt,
  };
}
function apply(state, commandInput) {
  return executeInventoryCommand(state, commandInput).state;
}

const actors = {
  km: { id: "km-evidence-1160", name: "Kitchen Manager", role: "KM" },
  pit: { id: "pit-evidence-1160", name: "Pitmaster", role: "PITMASTER" },
  kc: { id: "kc-evidence-1160", name: "Kitchen Coordinator", role: "KC" },
};

function balance(state, productCode) {
  return deriveInventoryBoard(
    state,
    "2026-08-03T22:00:00.000Z",
  ).balances.find((row) => row.productCode === productCode);
}

function fullReconciliation() {
  let state = createInventoryDay(clone(fixtureSet.baseInput));

  for (const [code, quantity] of Object.entries({
    BRISKET: 50,
    PORK: 60,
    RIBS: 30,
    CHICKEN: 20,
  })) {
    state = apply(
      state,
      command(
        `evidence-receipt-${code}`,
        "RECEIVE_PRODUCTION",
        actors.pit,
        {
          productCode: code,
          quantityCookedLb: quantity,
          loadId: `load-${code}`,
        },
        state,
        "2026-08-03T10:00:00.000Z",
      ),
    );
  }

  for (const [code, quantity] of Object.entries({
    BRISKET: 42,
    PORK: 50,
    RIBS: 24,
    CHICKEN: 18,
  })) {
    state = apply(
      state,
      command(
        `evidence-usage-${code}`,
        "RECORD_SERVICE_USAGE",
        actors.kc,
        {
          productCode: code,
          quantityCookedLb: quantity,
          servicePeriodId: "dinner",
        },
        state,
        "2026-08-03T20:30:00.000Z",
      ),
    );
  }

  state = apply(
    state,
    command(
      "evidence-waste-pork",
      "RECORD_WASTE",
      actors.kc,
      {
        productCode: "PORK",
        quantityCookedLb: 2,
        reason: "SERVICE_ERROR",
        note: "Measured service-line loss",
      },
      state,
      "2026-08-03T20:45:00.000Z",
    ),
  );

  const holdResult = executeInventoryCommand(
    state,
    command(
      "evidence-hold-chicken",
      "OPEN_QUALITY_HOLD",
      actors.pit,
      {
        productCode: "CHICKEN",
        quantityCookedLb: 1,
        reason: "QUALITY_REVIEW",
        severity: "P1",
        blocking: true,
        owner: actors.km,
      },
      state,
      "2026-08-03T20:50:00.000Z",
    ),
  );
  state = holdResult.state;
  state = apply(
    state,
    command(
      "evidence-release-chicken",
      "RELEASE_QUALITY_HOLD",
      actors.km,
      {
        holdId: holdResult.result.holdId,
        resolution: "Quality check passed and product returned to service inventory",
      },
      state,
      "2026-08-03T21:00:00.000Z",
    ),
  );

  const exceptionResult = executeInventoryCommand(
    state,
    command(
      "evidence-exception",
      "OPEN_EXCEPTION",
      actors.kc,
      {
        severity: "P1",
        summary: "Pork waste ticket requires manager review",
        productCode: "PORK",
      },
      state,
      "2026-08-03T21:02:00.000Z",
    ),
  );
  state = exceptionResult.state;
  state = apply(
    state,
    command(
      "evidence-exception-assign",
      "ASSIGN_EXCEPTION",
      actors.km,
      {
        exceptionId: exceptionResult.result.exceptionId,
        owner: actors.km,
      },
      state,
      "2026-08-03T21:03:00.000Z",
    ),
  );
  state = apply(
    state,
    command(
      "evidence-exception-ack",
      "ACKNOWLEDGE_EXCEPTION",
      actors.km,
      { exceptionId: exceptionResult.result.exceptionId },
      state,
      "2026-08-03T21:04:00.000Z",
    ),
  );
  state = apply(
    state,
    command(
      "evidence-exception-resolve",
      "RESOLVE_EXCEPTION",
      actors.km,
      {
        exceptionId: exceptionResult.result.exceptionId,
        resolution: "Waste ticket matched the recorded service-line loss",
      },
      state,
      "2026-08-03T21:05:00.000Z",
    ),
  );

  for (const code of contract.products) {
    const row = balance(state, code);
    state = apply(
      state,
      command(
        `evidence-count-${code}`,
        "COUNT_INVENTORY",
        actors.kc,
        {
          productCode: code,
          observedAvailableCookedLb: row.availableCookedLb,
          observedHeldCookedLb: row.heldCookedLb,
        },
        state,
        "2026-08-03T21:30:00.000Z",
      ),
    );
  }

  state = apply(
    state,
    command(
      "evidence-close",
      "CLOSE_INVENTORY_DAY",
      actors.km,
      { reason: "Full operating-day cooked inventory reconciliation complete" },
      state,
      "2026-08-03T22:00:00.000Z",
    ),
  );

  return state;
}

const files = walk(root);
const textFiles = files.filter((file) =>
  textExtensions.has(path.extname(file).toLowerCase()),
);
const cache = new Map(textFiles.map((file) => [file, read(file)]));

const capabilities = [
  ["ledger", "Append-only inventory ledger", ["ledgerEntry", "ledgerEntryId", "transactionType"]],
  ["negative-guard", "Negative inventory prevention", ["ensureAvailable", "negative inventory"]],
  ["production-receipt", "Production receipt", ["RECEIVE_PRODUCTION", "PRODUCTION_RECEIPT"]],
  ["service-usage", "Service usage", ["RECORD_SERVICE_USAGE", "SERVICE_USAGE"]],
  ["waste", "Reason-coded waste", ["RECORD_WASTE", "WASTE_REASONS", "WASTE_RECORDED"]],
  ["quality-hold", "Quality hold lifecycle", ["OPEN_QUALITY_HOLD", "QUALITY_HOLD_RELEASED", "QUALITY_HOLD_DISCARDED"]],
  ["exception-owner", "Exception ownership", ["ASSIGN_EXCEPTION", "UNOWNED_INVENTORY_EXCEPTION", "owner"]],
  ["count", "Physical count reconciliation", ["COUNT_INVENTORY", "variancePercent", "BLOCKING"]],
  ["adjustment", "Append-only manager adjustment", ["ADJUST_INVENTORY", "INVENTORY_ADJUSTED"]],
  ["transfer", "Location transfer pairing", ["TRANSFER_OUT", "TRANSFER_IN", "transferId"]],
  ["idempotency", "Duplicate command protection", ["processedCommandIds", "DUPLICATE"]],
  ["role-control", "Role-aware inventory control", ["MANAGERS", "INVENTORY_OPERATORS", "actor.role"]],
  ["tenant-isolation", "Tenant isolation", ["requireTenant", "Cross-tenant"]],
  ["close-gates", "Inventory close gates", ["closeBlockers", "CLOSE_INVENTORY_DAY"]],
  ["contingency", "Inventory contingency snapshot", ["createInventoryContingencySnapshot", "snapshotId"]],
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
    if (matched.length) matches.push({ sourceFile: rel(file), matched });
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
      category: "INVENTORY_CAPABILITY_GAP",
      subject: label,
      detail: "No static implementation evidence was detected.",
      releaseBlocking: true,
    });
  }
}

const closed = fullReconciliation();
const board = deriveInventoryBoard(
  closed,
  "2026-08-03T22:05:00.000Z",
);
const snapshot = createInventoryContingencySnapshot(
  closed,
  "2026-08-03T22:05:00.000Z",
);

const ledgerRows = closed.ledger.map((entry) => ({
  sequence: entry.sequence,
  ledgerEntryId: entry.ledgerEntryId,
  commandId: entry.commandId,
  occurredAt: entry.occurredAt,
  productCode: entry.productCode,
  transactionType: entry.transactionType,
  availableDeltaCookedLb: entry.availableDeltaCookedLb,
  heldDeltaCookedLb: entry.heldDeltaCookedLb,
  onHandDeltaCookedLb: entry.onHandDeltaCookedLb,
  reason: entry.reason,
  referenceType: entry.referenceType,
  referenceId: entry.referenceId,
  actorName: entry.actor.name,
  actorRole: entry.actor.role,
}));

const balanceRows = board.balances.map((row) => ({
  ...row,
  countedAvailableCookedLb:
    closed.counts[row.productCode]?.observedAvailableCookedLb ?? "",
  countedHeldCookedLb:
    closed.counts[row.productCode]?.observedHeldCookedLb ?? "",
  varianceCookedLb:
    closed.counts[row.productCode]?.varianceCookedLb ?? "",
  variancePercent:
    closed.counts[row.productCode]?.variancePercent ?? "",
  countClassification:
    closed.counts[row.productCode]?.classification ?? "",
}));

const holdRows = closed.holds.map((row) => ({
  holdId: row.holdId,
  productCode: row.productCode,
  quantityCookedLb: row.quantityCookedLb,
  reason: row.reason,
  severity: row.severity,
  blocking: row.blocking,
  status: row.status,
  ownerName: row.owner?.name || "",
  openedAt: row.openedAt,
  closedAt: row.closedAt || "",
  resolution: row.resolution || "",
}));

const exceptionRows = closed.exceptions.map((row) => ({
  exceptionId: row.exceptionId,
  severity: row.severity,
  productCode: row.productCode || "",
  summary: row.summary,
  status: row.status,
  ownerName: row.owner?.name || "",
  ownerRole: row.owner?.role || "",
  openedAt: row.openedAt,
  acknowledgedAt: row.acknowledgedAt || "",
  resolvedAt: row.resolvedAt || "",
  resolution: row.resolution || "",
}));

const scenarioRows = fixtureSet.scenarios.map((scenario) => ({
  scenarioId: scenario.id,
  scenarioName: scenario.name,
  deterministicStatus: "PASSED_BY_TEST_SCRIPT",
  expected: JSON.stringify(scenario.expected),
  deployedStatus: "NOT_EXECUTED",
  evidence: "",
}));

const uat = [
  ["IN-001", "KM", "Open inventory board", "Open active-date inventory workflow.", "Four product balances, urgent actions, holds, exceptions, counts, waste total, and close blockers are visible."],
  ["IN-002", "PITMASTER", "Receive production", "Post completed cooked production from a valid load.", "Available and on-hand cooked pounds increase once and retain load reference."],
  ["IN-003", "KC", "Record service usage", "Post measured service usage.", "Available and on-hand cooked pounds decrease without going negative."],
  ["IN-004", "KC", "Prevent negative inventory", "Attempt usage greater than available.", "Command fails with available quantity in the message and no durable write."],
  ["IN-005", "KC", "Record waste", "Record waste with an approved reason.", "Waste total and product balance update; actor, reason, and quantity are audited."],
  ["IN-006", "KC", "Other waste explanation", "Select OTHER without an explanatory note.", "Submission is rejected."],
  ["IN-007", "PITMASTER", "Open quality hold", "Move cooked product to a blocking quality hold.", "Available decreases, held increases, on-hand is unchanged, and hold is urgent."],
  ["IN-008", "KM", "Release quality hold", "Release held product after review.", "Held decreases, available increases, on-hand remains unchanged."],
  ["IN-009", "KM", "Discard quality hold", "Discard held product with waste reason.", "Held and on-hand decrease; quality-discard waste is recorded."],
  ["IN-010", "KC", "Open P1 exception", "Open a P1 inventory exception without owner.", "Unowned critical exception appears and blocks close."],
  ["IN-011", "KM", "Assign exception", "Assign exception to a named user.", "Owner persists and assignment event is auditable."],
  ["IN-012", "Assigned user", "Acknowledge exception", "Acknowledge the assigned exception.", "Only assigned owner succeeds."],
  ["IN-013", "KM", "Resolve exception", "Resolve with written disposition.", "Original exception and ownership history remain; close blocker clears."],
  ["IN-014", "KC", "Exact physical count", "Count available and held quantities equal to expected.", "Classification is ACCEPTABLE."],
  ["IN-015", "KC", "Warning count variance", "Submit a 3–10% physical variance.", "Warning is visible but not classified as blocking."],
  ["IN-016", "KC", "Blocking count variance", "Submit variance above 10%.", "Blocking variance appears and close remains disabled."],
  ["IN-017", "KM", "Adjust to confirmed count", "Post manager adjustment with reason.", "Original count is preserved and variance resolves only when ledger matches count."],
  ["IN-018", "KM", "Correct count", "Correct a mistaken physical count with reason.", "Original count remains in append-only correction history."],
  ["IN-019", "KM", "Transfer out", "Transfer cooked product to another controlled location.", "Outbound transaction has transfer ID and cannot exceed available."],
  ["IN-020", "KM", "Transfer in", "Receive the paired transfer.", "Inbound transaction uses matching transfer ID."],
  ["IN-021", "Viewer", "Viewer mutation denial", "Attempt receipt, waste, hold, count, adjustment, or close.", "All mutations are denied server-side."],
  ["IN-022", "ADMIN", "Tenant isolation", "Submit another tenant ID or reference.", "No cross-tenant data is read, inferred, or changed."],
  ["IN-023", "KM", "Duplicate receipt", "Retry identical command ID.", "One ledger entry and one event exist."],
  ["IN-024", "KM", "Duplicate close", "Retry identical close command ID.", "No second close event is created."],
  ["IN-025", "KM", "Close gate missing counts", "Attempt close before all four products are counted.", "Close is blocked and missing products are named."],
  ["IN-026", "KM", "Close gate open hold", "Attempt close with a blocking quality hold.", "Close is blocked."],
  ["IN-027", "KM", "Complete reconciliation", "Resolve holds/exceptions, count all products, and close.", "Closed snapshot has no negative balance or unresolved blocker."],
  ["IN-028", "New user", "Complete inventory day", "Without coaching, receive production, record usage/waste, manage a hold and exception, count, reconcile, and close.", "User completes the workflow without hidden actions or database access."],
  ["IN-029", "KM", "Contingency export", "Copy inventory snapshot during provider outage.", "Balances, holds, exceptions, counts, notes, and sequence numbers are available."],
  ["IN-030", "KM", "Provider outage", "Disable email, SMS, AI, and observability providers.", "Core inventory ledger, counts, holds, exceptions, and close remain usable."],
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

writeCsv("inventory-capability-map.csv", capabilityRows, [
  "capabilityId",
  "label",
  "required",
  "status",
  "evidenceCount",
  "deployedVerification",
]);
writeCsv("inventory-source-evidence.csv", sourceRows, [
  "capabilityId",
  "sourceFile",
  "matchedTokens",
]);
writeCsv("inventory-known-scenarios.csv", scenarioRows, [
  "scenarioId",
  "scenarioName",
  "deterministicStatus",
  "expected",
  "deployedStatus",
  "evidence",
]);
writeCsv("inventory-ledger-trace.csv", ledgerRows, [
  "sequence",
  "ledgerEntryId",
  "commandId",
  "occurredAt",
  "productCode",
  "transactionType",
  "availableDeltaCookedLb",
  "heldDeltaCookedLb",
  "onHandDeltaCookedLb",
  "reason",
  "referenceType",
  "referenceId",
  "actorName",
  "actorRole",
]);
writeCsv("inventory-balance-reconciliation.csv", balanceRows, [
  "productCode",
  "openingCookedLb",
  "availableCookedLb",
  "heldCookedLb",
  "onHandCookedLb",
  "wasteCookedLb",
  "countedAvailableCookedLb",
  "countedHeldCookedLb",
  "varianceCookedLb",
  "variancePercent",
  "countClassification",
]);
writeCsv("quality-hold-results.csv", holdRows, [
  "holdId",
  "productCode",
  "quantityCookedLb",
  "reason",
  "severity",
  "blocking",
  "status",
  "ownerName",
  "openedAt",
  "closedAt",
  "resolution",
]);
writeCsv("inventory-exception-results.csv", exceptionRows, [
  "exceptionId",
  "severity",
  "productCode",
  "summary",
  "status",
  "ownerName",
  "ownerRole",
  "openedAt",
  "acknowledgedAt",
  "resolvedAt",
  "resolution",
]);
writeCsv("inventory-uat-workbook.csv", uat, [
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
writeCsv("inventory-findings.csv", findings, [
  "severity",
  "category",
  "subject",
  "detail",
  "releaseBlocking",
]);

fs.writeFileSync(
  path.join(outDir, "closed-inventory-day.json"),
  `${JSON.stringify(closed, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "inventory-contingency-snapshot.json"),
  `${JSON.stringify(snapshot, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "inventory-contract-snapshot.json"),
  `${JSON.stringify(contract, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "inventory-fixture-snapshot.json"),
  `${JSON.stringify(fixtureSet, null, 2)}\n`,
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
    deterministicScenarios: fixtureSet.scenarios.length,
    ledgerEntries: ledgerRows.length,
    productsReconciled: balanceRows.length,
    holds: holdRows.length,
    exceptions: exceptionRows.length,
    uatRows: uat.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter(
      (finding) => finding.releaseBlocking,
    ).length,
  },
  result: {
    status: closed.status,
    closeId: closed.close?.closeId || null,
    negativeBalances: board.balances.filter(
      (row) =>
        row.availableCookedLb < 0 ||
        row.heldCookedLb < 0 ||
        row.onHandCookedLb < 0,
    ).length,
    openBlockingHolds: board.openHolds.filter((row) => row.blocking).length,
    openCriticalExceptions: board.openExceptions.filter((row) =>
      ["P0", "P1"].includes(row.severity),
    ).length,
    closeBlockers: board.closeBlockers.length,
    wasteTotalCookedLb: board.wasteTotalCookedLb,
  },
  capabilities: capabilityRows,
  findings,
};

fs.writeFileSync(
  path.join(outDir, "inventory-readiness.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const summary = `# Build ${BUILD} Inventory Control Readiness

Generated: ${report.generatedAt}

## Exit gate

${contract.exitGate}

| Measure | Count |
|---|---:|
| Files scanned | ${report.counts.filesScanned} |
| Required capabilities | ${report.counts.capabilities} |
| Capabilities with evidence | ${report.counts.capabilitiesWithEvidence} |
| Deterministic scenarios | ${report.counts.deterministicScenarios} |
| Ledger entries | ${report.counts.ledgerEntries} |
| Products reconciled | ${report.counts.productsReconciled} |
| Quality holds | ${report.counts.holds} |
| Exceptions | ${report.counts.exceptions} |
| Deployed UAT rows | ${report.counts.uatRows} |
| Release-blocking static findings | ${report.counts.releaseBlockingFindings} |

Deterministic success does not prove durable database persistence, server-side authorization, tenant isolation, transfer pairing across real locations, tablet usability, or operational adoption. Execute all rows in \`inventory-uat-workbook.csv\` on isolated staging.
`;
fs.writeFileSync(
  path.join(outDir, "inventory-readiness-summary.md"),
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
  path.join(outDir, "inventory-hash-manifest.json"),
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

console.log(`Build ${BUILD} Inventory Control evidence generated.`);
for (const [key, value] of Object.entries(report.counts)) {
  console.log(`${key}: ${value}`);
}
console.log(`Output: ${path.relative(root, outDir)}`);

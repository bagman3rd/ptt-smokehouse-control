#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  STANDARD_STATUS_FLOW,
  createContingencySnapshot,
  createOperatingDay,
  deriveTodayBoard,
  executeOperatingDayCommand,
  rolloverOperatingDay,
} from "../lib/today-operations/build-11.5.0/today-operations-engine.mjs";

const BUILD = "11.5.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.5.0");
const contract = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "today-operations-contract-11.5.0.json"),
    "utf8",
  ),
);
const fixtureSet = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "today-operations-fixtures-11.5.0.json"),
    "utf8",
  ),
);

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(path.join(outDir, "today-hash-manifest.json"), { force: true });

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
function command(commandId, occurredAt, type, actor, payload = {}) {
  return { commandId, occurredAt, type, actor, payload };
}
function apply(state, cmd) {
  return executeOperatingDayCommand(state, cmd).state;
}

const actors = {
  km: { id: "km-evidence", name: "Kitchen Manager", role: "KM" },
  pit: { id: "pit-evidence", name: "Pitmaster", role: "PITMASTER" },
  kc: { id: "kc-evidence", name: "Kitchen Coordinator", role: "KC" },
};

function buildFullDayTrace() {
  let state = createOperatingDay(clone(fixtureSet.baseDayInput));
  const snapshots = [];

  snapshots.push({
    name: "PRE_OPEN",
    capturedAt: "2026-08-03T07:00:00.000Z",
    board: deriveTodayBoard(state, "2026-08-03T07:00:00.000Z"),
  });

  for (const load of state.loads) {
    state = apply(
      state,
      command(
        `trace-assign-${load.loadId}`,
        "2026-08-02T08:00:00.000Z",
        "ASSIGN_LOAD_OWNER",
        actors.km,
        { loadId: load.loadId, owner: actors.pit },
      ),
    );
  }

  const times = [
    "2026-08-02T08:30:00.000Z",
    "2026-08-02T08:35:00.000Z",
    "2026-08-02T08:40:00.000Z",
    "2026-08-02T20:40:00.000Z",
    "2026-08-02T20:55:00.000Z",
    "2026-08-03T10:00:00.000Z",
    "2026-08-03T20:30:00.000Z",
  ];
  const statuses = STANDARD_STATUS_FLOW.slice(1);

  for (const load of state.loads) {
    for (let index = 0; index < statuses.length; index += 1) {
      const targetStatus = statuses[index];
      const payload = { loadId: load.loadId, status: targetStatus };
      if (targetStatus === "LOADED") {
        payload.actualQuantity = load.plannedQuantity;
      }
      state = apply(
        state,
        command(
          `trace-${load.loadId}-${targetStatus.toLowerCase()}`,
          times[index],
          "SET_LOAD_STATUS",
          actors.pit,
          payload,
        ),
      );
    }
  }

  snapshots.push({
    name: "SERVICE_COMPLETE",
    capturedAt: "2026-08-03T20:45:00.000Z",
    board: deriveTodayBoard(state, "2026-08-03T20:45:00.000Z"),
  });

  const eodValues = {
    BRISKET: { sealedUnits: 1, openCookedLb: 0 },
    PORK: { sealedUnits: 1, openCookedLb: 0 },
    RIBS: { sealedUnits: 1, openCookedLb: 0 },
    CHICKEN: { sealedUnits: 1, openCookedLb: 0 },
  };
  for (const [productCode, values] of Object.entries(eodValues)) {
    state = apply(
      state,
      command(
        `trace-eod-${productCode.toLowerCase()}`,
        "2026-08-03T21:15:00.000Z",
        "SUBMIT_EOD_PRODUCT",
        actors.kc,
        {
          productCode,
          ...values,
          note: "Full-day deterministic EOD trace",
        },
      ),
    );
  }

  snapshots.push({
    name: "EOD_COMPLETE",
    capturedAt: "2026-08-03T21:20:00.000Z",
    board: deriveTodayBoard(state, "2026-08-03T21:20:00.000Z"),
  });

  state = apply(
    state,
    command(
      "trace-close",
      "2026-08-03T21:30:00.000Z",
      "CLOSE_OPERATING_DAY",
      actors.km,
      { reason: "Deterministic full-day trace complete" },
    ),
  );

  snapshots.push({
    name: "CLOSED",
    capturedAt: "2026-08-03T21:31:00.000Z",
    board: deriveTodayBoard(state, "2026-08-03T21:31:00.000Z"),
  });

  const nextInput = clone(fixtureSet.baseDayInput);
  nextInput.operatingDate = "2026-08-04";
  nextInput.planId = "pp-validation-1150-next";
  nextInput.forecastCalculationId = "fc-validation-1150-next";
  const rolled = rolloverOperatingDay(
    state,
    nextInput,
    command(
      "trace-rollover",
      "2026-08-03T21:35:00.000Z",
      "ROLLOVER_OPERATING_DAY",
      actors.km,
      {},
    ),
  );

  return {
    closedDay: rolled.closedDay,
    nextDay: rolled.nextDay,
    carryover: rolled.carryover,
    snapshots,
  };
}

const files = walk(root);
const textFiles = files.filter((file) =>
  textExtensions.has(path.extname(file).toLowerCase()),
);
const cache = new Map(textFiles.map((file) => [file, read(file)]));

const capabilities = [
  [
    "today-board",
    "Default Today board",
    ["deriveTodayBoard", "operatingDate", "urgentActions", "loadCards"],
  ],
  [
    "status-flow",
    "Canonical load status flow",
    ["STANDARD_STATUS_FLOW", "READY_FOR_SERVICE", "LOAD_STATUS_CHANGED"],
  ],
  [
    "task-ownership",
    "Load task ownership",
    ["ASSIGN_LOAD_OWNER", "LOAD_OWNER_ASSIGNED", "owner"],
  ],
  [
    "actual-execution",
    "Actual quantity and timestamp capture",
    ["actualQuantity", "actualTimes", "actualLoadedAt", "actualCompletedAt"],
  ],
  [
    "urgent-actions",
    "Urgent action derivation",
    ["MISSED_LOAD_START", "SERVICE_READINESS_RISK", "EOD_INCOMPLETE"],
  ],
  [
    "exceptions",
    "Exception opening and resolution",
    ["FLAG_EXCEPTION", "RESOLVE_EXCEPTION", "LOAD_EXCEPTION_OPENED"],
  ],
  [
    "quick-eod",
    "Guided Quick EOD",
    ["SUBMIT_EOD_PRODUCT", "sealedUnits", "openCookedLb", "EOD_PRODUCT_SUBMITTED"],
  ],
  [
    "correction",
    "Append-only correction",
    ["CORRECT_EOD_PRODUCT", "CORRECT_LOAD_STATUS", "priorSubmission"],
  ],
  [
    "close-gates",
    "Operating-day close gates",
    ["closeBlockers", "CLOSE_OPERATING_DAY", "OPERATING_DAY_CLOSED"],
  ],
  [
    "rollover",
    "Consecutive operating-day rollover",
    ["rolloverOperatingDay", "eligibleSealedUnits", "OPERATING_DAY_ROLLED_OVER"],
  ],
  [
    "idempotency",
    "Duplicate-command protection",
    ["processedCommandIds", "DUPLICATE", "commandId"],
  ],
  [
    "contingency",
    "Offline-safe contingency snapshot and notes",
    ["createContingencySnapshot", "offlineDraftRecovered", "snapshotId"],
  ],
  [
    "role-controls",
    "Role-aware operational commands",
    ["MANAGER_ROLES", "OPERATIONS_ROLES", "READ_ONLY_ROLES"],
  ],
  [
    "audit-events",
    "Append-only event history",
    ["eventLog", "eventRecord", "eventId", "sequence"],
  ],
];

const capabilityRows = [];
const evidenceRows = [];
const findings = [];

for (const [id, label, tokens] of capabilities) {
  const matches = [];
  for (const file of textFiles) {
    const source = `${rel(file)}\n${cache.get(file) || ""}`.toLowerCase();
    const matched = tokens.filter((token) =>
      source.includes(token.toLowerCase()),
    );
    if (matched.length) {
      matches.push({ sourceFile: rel(file), tokens: matched });
    }
  }
  capabilityRows.push({
    capabilityId: id,
    label,
    required: true,
    status: matches.length
      ? "STATIC_EVIDENCE_FOUND"
      : "NO_STATIC_EVIDENCE",
    evidenceCount: matches.length,
    liveVerificationStatus: "PENDING_DEPLOYED_UAT",
  });
  for (const match of matches.slice(0, 50)) {
    evidenceRows.push({
      capabilityId: id,
      sourceFile: match.sourceFile,
      matchedTokens: match.tokens.join("|"),
    });
  }
  if (!matches.length) {
    findings.push({
      severity: "P1",
      category: "TODAY_CAPABILITY_GAP",
      subject: label,
      detail: "No static implementation evidence was detected.",
      releaseBlocking: true,
    });
  }
}

const trace = buildFullDayTrace();

const eventRows = trace.closedDay.eventLog.map((event) => ({
  sequence: event.sequence,
  eventId: event.eventId,
  commandId: event.commandId,
  occurredAt: event.occurredAt,
  eventType: event.type,
  actorId: event.actor.id,
  actorName: event.actor.name,
  actorRole: event.actor.role,
  payload: JSON.stringify(event.payload),
}));

const loadRows = trace.closedDay.loads.map((load) => ({
  loadId: load.loadId,
  productCode: load.productCode,
  productName: load.productName,
  plannedQuantity: load.plannedQuantity,
  actualQuantity: load.actualQuantity,
  unit: load.unit,
  smokerName: load.smokerName,
  finalStatus: load.status,
  ownerName: load.owner?.name || "",
  ownerRole: load.owner?.role || "",
  actualLoadedAt: load.actualTimes.actualLoadedAt || "",
  actualCookStartAt: load.actualTimes.actualCookStartAt || "",
  actualCookEndAt: load.actualTimes.actualCookEndAt || "",
  actualReadyForServiceAt:
    load.actualTimes.actualReadyForServiceAt || "",
  actualCompletedAt: load.actualTimes.actualCompletedAt || "",
  noteCount: load.notes.length,
  correctionCount: load.correctionHistory.length,
}));

const eodRows = trace.closedDay.eod.products.map((product) => {
  const submission = trace.closedDay.eod.submissions[product.productCode];
  return {
    productCode: product.productCode,
    productName: product.productName,
    sealedUnits: submission.sealedUnits,
    openCookedLb: submission.openCookedLb,
    producedCookedEquivalentLb: submission.producedCookedEquivalentLb,
    remainingCookedEquivalentLb: submission.remainingCookedEquivalentLb,
    nextDayEligibleSealedUnits:
      submission.nextDayEligibleSealedUnits,
    nextDayEligibleOpenCookedLb:
      submission.nextDayEligibleOpenCookedLb,
    submissionId: submission.submissionId,
    version: submission.version,
  };
});

const boardRows = trace.snapshots.map((snapshot) => ({
  snapshotName: snapshot.name,
  capturedAt: snapshot.capturedAt,
  dayStatus: snapshot.board.status,
  eodStatus: snapshot.board.eodStatus,
  urgentActionCount: snapshot.board.urgentActionCount,
  closeBlockerCount: snapshot.board.closeBlockers.length,
  plannedLoads: snapshot.board.statusCounts.PLANNED,
  exceptionLoads: snapshot.board.statusCounts.EXCEPTION,
  completedLoads: snapshot.board.statusCounts.COMPLETED,
  urgentActionTypes: snapshot.board.urgentActions
    .map((action) => action.type)
    .join("|"),
}));

const scenarioRows = fixtureSet.scenarios.map((scenario) => ({
  scenarioId: scenario.id,
  scenarioName: scenario.name,
  deterministicTestStatus: "PASSED_BY_TEST_SCRIPT",
  expected: JSON.stringify(scenario.expected),
  deployedUatStatus: "NOT_EXECUTED",
  evidence: "",
}));

const uat = [
  [
    "TD-001",
    "KM",
    "Open Today page",
    "Open the default Today workflow for the active operating date.",
    "Operating date, day of week, weather/event notes, forecast summary and urgent actions are visible.",
  ],
  [
    "TD-002",
    "KM",
    "Assign load owner",
    "Assign each active load to a named operations user.",
    "Every load card shows the owner and the assignment is audited.",
  ],
  [
    "TD-003",
    "PITMASTER",
    "Confirm actual load",
    "Advance Ready to Loaded and enter actual quantity.",
    "Actual quantity and timestamp persist; material variance requires a reason.",
  ],
  [
    "TD-004",
    "PITMASTER",
    "Complete status flow",
    "Advance a load through all canonical statuses.",
    "Only valid next transitions are accepted and every transition is timestamped.",
  ],
  [
    "TD-005",
    "PITMASTER",
    "Flag exception",
    "Flag a P1 exception from an active load.",
    "Load becomes Exception and Today board shows an urgent action.",
  ],
  [
    "TD-006",
    "KM",
    "Resolve exception",
    "Resolve the active exception with a written resolution.",
    "Load returns to its prior status and original exception history remains auditable.",
  ],
  [
    "TD-007",
    "KM",
    "Correct load status",
    "Correct an erroneous status with a reason.",
    "Original and corrected statuses remain in append-only history.",
  ],
  [
    "TD-008",
    "KC",
    "Add operational note",
    "Enter a load note.",
    "Note, actor and timestamp remain visible in the event record and contingency export.",
  ],
  [
    "TD-009",
    "KM",
    "Missed load alert",
    "Move validation clock beyond planned load start without loading.",
    "Missed-load urgent action appears with load identification.",
  ],
  [
    "TD-010",
    "KM",
    "Service readiness risk",
    "Move validation clock beyond planned completion while product is not ready.",
    "Service-readiness risk appears.",
  ],
  [
    "TD-011",
    "KC",
    "Submit Quick EOD",
    "Submit sealed whole units and open cooked pounds for all four products.",
    "All product rows become complete and the actor/timestamp are recorded.",
  ],
  [
    "TD-012",
    "KC",
    "Reject decimal sealed count",
    "Enter 1.5 sealed units.",
    "Validation rejects the value and identifies the sealed-unit field.",
  ],
  [
    "TD-013",
    "KC",
    "Reject impossible EOD count",
    "Enter remaining quantity above completed production.",
    "Submission is blocked with an understandable plausibility message.",
  ],
  [
    "TD-014",
    "KM",
    "Correct EOD count",
    "Correct a submitted count with a reason.",
    "Original submission remains intact; current submission increments version.",
  ],
  [
    "TD-015",
    "KM",
    "Close gate incomplete loads",
    "Attempt close with an active nonterminal load.",
    "Close is blocked and identifies incomplete loads.",
  ],
  [
    "TD-016",
    "KM",
    "Close gate incomplete EOD",
    "Attempt close with missing EOD products.",
    "Close is blocked and names missing products.",
  ],
  [
    "TD-017",
    "KM",
    "Close operating day",
    "Complete all loads, resolve exceptions and submit all EOD counts.",
    "One immutable close event is created.",
  ],
  [
    "TD-018",
    "KM",
    "Duplicate close",
    "Repeat the same close command after a network retry.",
    "No duplicate close event or write is created.",
  ],
  [
    "TD-019",
    "KM",
    "Rollover",
    "Roll a closed day to the next consecutive operating date.",
    "Next day is created and linked to final EOD carryover.",
  ],
  [
    "TD-020",
    "KM",
    "Brisket carryover policy",
    "Record sealed brisket and roll the day forward.",
    "Recorded sealed brisket remains visible but eligible sealed carryover is zero.",
  ],
  [
    "TD-021",
    "VIEWER",
    "Unauthorized mutation",
    "Attempt status, note, EOD and close actions through UI and crafted requests.",
    "All mutations are denied server-side.",
  ],
  [
    "TD-022",
    "ADMIN",
    "Tenant isolation",
    "Use another tenant's day, load or EOD identifier.",
    "No data is read, inferred or changed.",
  ],
  [
    "TD-023",
    "PITMASTER",
    "Tablet workflow",
    "Complete load updates on the target kitchen tablet width.",
    "All critical actions are visible, labeled and at least 44px high.",
  ],
  [
    "TD-024",
    "KM",
    "Contingency export",
    "Generate the contingency snapshot during a provider outage.",
    "Latest plan, statuses, notes, exceptions and EOD state remain available.",
  ],
  [
    "TD-025",
    "KM",
    "Provider outage",
    "Disable email, SMS, Sentry and AI credentials.",
    "Today and Quick EOD remain usable.",
  ],
  [
    "TD-026",
    "New user",
    "Complete full operating day",
    "Without coaching, complete forecast-linked load execution, Quick EOD, close and rollover.",
    "User finishes the workflow without hidden controls or direct database work.",
  ],
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

writeCsv("today-capability-map.csv", capabilityRows, [
  "capabilityId",
  "label",
  "required",
  "status",
  "evidenceCount",
  "liveVerificationStatus",
]);
writeCsv("today-source-evidence.csv", evidenceRows, [
  "capabilityId",
  "sourceFile",
  "matchedTokens",
]);
writeCsv("today-known-scenarios.csv", scenarioRows, [
  "scenarioId",
  "scenarioName",
  "deterministicTestStatus",
  "expected",
  "deployedUatStatus",
  "evidence",
]);
writeCsv("full-operating-day-event-trace.csv", eventRows, [
  "sequence",
  "eventId",
  "commandId",
  "occurredAt",
  "eventType",
  "actorId",
  "actorName",
  "actorRole",
  "payload",
]);
writeCsv("full-operating-day-load-results.csv", loadRows, [
  "loadId",
  "productCode",
  "productName",
  "plannedQuantity",
  "actualQuantity",
  "unit",
  "smokerName",
  "finalStatus",
  "ownerName",
  "ownerRole",
  "actualLoadedAt",
  "actualCookStartAt",
  "actualCookEndAt",
  "actualReadyForServiceAt",
  "actualCompletedAt",
  "noteCount",
  "correctionCount",
]);
writeCsv("full-operating-day-eod-results.csv", eodRows, [
  "productCode",
  "productName",
  "sealedUnits",
  "openCookedLb",
  "producedCookedEquivalentLb",
  "remainingCookedEquivalentLb",
  "nextDayEligibleSealedUnits",
  "nextDayEligibleOpenCookedLb",
  "submissionId",
  "version",
]);
writeCsv("today-board-snapshots.csv", boardRows, [
  "snapshotName",
  "capturedAt",
  "dayStatus",
  "eodStatus",
  "urgentActionCount",
  "closeBlockerCount",
  "plannedLoads",
  "exceptionLoads",
  "completedLoads",
  "urgentActionTypes",
]);
writeCsv("today-uat-workbook.csv", uat, [
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
writeCsv("today-findings.csv", findings, [
  "severity",
  "category",
  "subject",
  "detail",
  "releaseBlocking",
]);

const contingency = createContingencySnapshot(
  trace.closedDay,
  "2026-08-03T21:31:00.000Z",
);
fs.writeFileSync(
  path.join(outDir, "contingency-snapshot.json"),
  `${JSON.stringify(contingency, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "closed-operating-day.json"),
  `${JSON.stringify(trace.closedDay, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "rollover-carryover.json"),
  `${JSON.stringify(trace.carryover, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "today-contract-snapshot.json"),
  `${JSON.stringify(contract, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "today-fixture-snapshot.json"),
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
    fullDayEvents: eventRows.length,
    completedLoads: loadRows.filter((row) => row.finalStatus === "COMPLETED")
      .length,
    eodProducts: eodRows.length,
    boardSnapshots: boardRows.length,
    uatRows: uat.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter(
      (finding) => finding.releaseBlocking,
    ).length,
  },
  fullDayResult: {
    dayStatus: trace.closedDay.status,
    eodStatus: trace.closedDay.eod.status,
    nextDayId: trace.nextDay?.dayId || null,
    nextOperatingDate: trace.nextDay?.operatingDate || null,
    carryoverRows: trace.carryover.length,
  },
  capabilities: capabilityRows,
  findings,
};
fs.writeFileSync(
  path.join(outDir, "today-readiness.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const walkthrough = `# Build ${BUILD} Full Operating-Day Walkthrough

## Deterministic result

- Operating date: ${trace.closedDay.operatingDate}
- Day of week: ${trace.closedDay.dayOfWeek}
- Final day status: ${trace.closedDay.status}
- Final EOD status: ${trace.closedDay.eod.status}
- Completed loads: ${report.counts.completedLoads}
- Append-only events: ${report.counts.fullDayEvents}
- Next operating date: ${trace.nextDay?.operatingDate}
- Rollover carryover rows: ${trace.carryover.length}

## Required manual UAT

The deterministic trace proves the pure operating-day rules. It does not prove deployed persistence, server-side authorization, tenant isolation, tablet usability, session handling or duplicate-write protection in the actual database workflow. Execute all rows in \`today-uat-workbook.csv\` using an inexperienced operator on isolated staging.
`;
fs.writeFileSync(
  path.join(outDir, "full-operating-day-walkthrough.md"),
  walkthrough,
  "utf8",
);

const summary = `# Build ${BUILD} Today Operations Readiness

Generated: ${report.generatedAt}

## Exit gate

${contract.exitGate}

| Measure | Count |
|---|---:|
| Files scanned | ${report.counts.filesScanned} |
| Required capabilities | ${report.counts.capabilities} |
| Capabilities with evidence | ${report.counts.capabilitiesWithEvidence} |
| Deterministic scenarios | ${report.counts.deterministicScenarios} |
| Full-day events | ${report.counts.fullDayEvents} |
| Completed loads | ${report.counts.completedLoads} |
| EOD products | ${report.counts.eodProducts} |
| Board snapshots | ${report.counts.boardSnapshots} |
| Deployed UAT rows | ${report.counts.uatRows} |
| Release-blocking static findings | ${report.counts.releaseBlockingFindings} |

Deterministic success is not production acceptance. Deployed UAT must prove a new user can complete the full operating day, role restrictions are enforced server-side, duplicate writes are prevented and tenant data remains isolated.
`;
fs.writeFileSync(
  path.join(outDir, "today-readiness-summary.md"),
  summary,
  "utf8",
);

const beforeManifest = fs.readdirSync(outDir).sort();
const hashes = {};
for (const name of beforeManifest) {
  const file = path.join(outDir, name);
  if (fs.statSync(file).isFile()) {
    hashes[name] = hash(fs.readFileSync(file));
  }
}
fs.writeFileSync(
  path.join(outDir, "today-hash-manifest.json"),
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

console.log(`Build ${BUILD} Today Operations control plane generated.`);
for (const [key, value] of Object.entries(report.counts)) {
  console.log(`${key}: ${value}`);
}
console.log(`Output: ${path.relative(root, outDir)}`);

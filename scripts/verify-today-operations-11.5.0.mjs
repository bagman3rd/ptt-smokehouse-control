#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  LOAD_STATUSES,
  STANDARD_STATUS_FLOW,
  createOperatingDay,
  deriveTodayBoard,
} from "../lib/today-operations/build-11.5.0/today-operations-engine.mjs";

const BUILD = "11.5.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.5.0");
const failures = [];

function pass(condition, message) {
  if (condition) {
    console.log(`PASS — ${message}`);
  } else {
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

const contractPath = path.join(
  root,
  "config",
  "today-operations-contract-11.5.0.json",
);
const fixturePath = path.join(
  root,
  "config",
  "today-operations-fixtures-11.5.0.json",
);

pass(fs.existsSync(contractPath), "Today Operations contract exists");
pass(fs.existsSync(fixturePath), "Today Operations fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturePath)) {
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixtureSet = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

pass(contract.buildVersion === BUILD, "contract build version is 11.5.0");
pass(
  contract.engineVersion === "PTT_TODAY_OPERATIONS_11_5_0",
  "Today Operations engine version is controlled",
);
pass(
  contract.exitGate.includes("inexperienced user"),
  "exit gate requires inexperienced-user completion",
);
pass(
  exact(contract.loadStatuses, LOAD_STATUSES),
  "contract load statuses match the engine",
);
pass(
  exact(contract.standardStatusFlow, STANDARD_STATUS_FLOW),
  "contract standard flow matches the engine",
);
pass(
  contract.eodRules.sealedQuantityType === "NON_NEGATIVE_INTEGER",
  "sealed EOD quantities are whole nonnegative units",
);
pass(
  contract.eodRules.openQuantityType === "NON_NEGATIVE_COOKED_POUNDS",
  "open EOD quantities are cooked pounds",
);
pass(
  contract.eodRules.sealedBrisketNextDayEligible === false,
  "sealed brisket is not next-day eligible",
);
pass(
  contract.idempotency.duplicateCommandResult ===
    "NO_ADDITIONAL_EVENT_OR_MUTATION",
  "duplicate commands cannot create additional mutation",
);
pass(
  contract.operatingDayRollover.nextDateMustBeConsecutive === true,
  "rollover requires the next consecutive operating date",
);
pass(
  fixtureSet.scenarios.length >= 10,
  "at least ten deterministic Today Operations scenarios exist",
);

let baseDay = null;
try {
  baseDay = createOperatingDay(fixtureSet.baseDayInput);
} catch (error) {
  pass(
    false,
    `base operating day creates successfully: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}
if (baseDay) {
  pass(baseDay.loads.length === 4, "base operating day contains four loads");
  pass(baseDay.eod.products.length === 4, "base operating day requires four EOD products");
  const board = deriveTodayBoard(
    baseDay,
    "2026-08-03T22:30:00.000Z",
  );
  pass(board.loadCards.length === 4, "Today board returns four load cards");
  pass(
    board.urgentActions.some(
      (action) => action.type === "OPERATING_DAY_CLOSE_DUE",
    ),
    "Today board identifies overdue operating-day close",
  );
}

const requiredOutputs = [
  "today-workbench-route.json",
  "today-capability-map.csv",
  "today-source-evidence.csv",
  "today-known-scenarios.csv",
  "full-operating-day-event-trace.csv",
  "full-operating-day-load-results.csv",
  "full-operating-day-eod-results.csv",
  "today-board-snapshots.csv",
  "today-uat-workbook.csv",
  "today-findings.csv",
  "contingency-snapshot.json",
  "closed-operating-day.json",
  "rollover-carryover.json",
  "today-contract-snapshot.json",
  "today-fixture-snapshot.json",
  "today-readiness.json",
  "full-operating-day-walkthrough.md",
  "today-readiness-summary.md",
  "today-hash-manifest.json",
];

for (const name of requiredOutputs) {
  pass(
    fs.existsSync(path.join(outDir, name)),
    `required output exists: ${name}`,
  );
}

const routeRecordPath = path.join(
  outDir,
  "today-workbench-route.json",
);
if (fs.existsSync(routeRecordPath)) {
  const routeRecord = JSON.parse(
    fs.readFileSync(routeRecordPath, "utf8"),
  );
  pass(
    routeRecord.buildVersion === BUILD,
    "Today Operations route record uses Build 11.5.0",
  );
  pass(
    routeRecord.route.startsWith("/today-lab-1150"),
    "Today Operations workbench uses an isolated operational route",
  );
  const pageSource = path.join(root, routeRecord.pageSource);
  const componentSource = path.join(root, routeRecord.componentSource);
  pass(fs.existsSync(pageSource), "Today Operations page exists");
  pass(
    fs.existsSync(componentSource),
    "Today Operations workbench component exists",
  );
  if (fs.existsSync(pageSource)) {
    pass(
      fs
        .readFileSync(pageSource, "utf8")
        .includes("BUILD_11_5_0_GENERATED"),
      "Today Operations page contains the generated marker",
    );
  }
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(componentSource, "utf8");
    pass(
      source.includes("Today Operations and Quick EOD"),
      "workbench has the correct operational title",
    );
    pass(
      source.includes("does not persist production records"),
      "workbench does not falsely claim durable persistence",
    );
    pass(
      source.includes("Advance all eligible loads one step"),
      "workbench includes a simple inexperienced-user action",
    );
    pass(
      source.includes("Copy contingency snapshot"),
      "workbench includes a contingency export action",
    );
  }
}

const readinessPath = path.join(outDir, "today-readiness.json");
if (fs.existsSync(readinessPath)) {
  const report = JSON.parse(
    fs.readFileSync(readinessPath, "utf8"),
  );
  pass(
    report.buildVersion === BUILD,
    "Today Operations readiness report uses Build 11.5.0",
  );
  pass(
    report.counts.deterministicScenarios === fixtureSet.scenarios.length,
    "readiness scenario count matches the fixture set",
  );
  pass(
    report.counts.completedLoads === 4,
    "full-day evidence completes four loads",
  );
  pass(
    report.counts.eodProducts === 4,
    "full-day evidence completes four EOD products",
  );
  pass(
    report.fullDayResult.dayStatus === "CLOSED",
    "full-day deterministic evidence closes the operating day",
  );
  pass(
    report.fullDayResult.nextOperatingDate === "2026-08-04",
    "full-day deterministic evidence rolls to the next date",
  );
  pass(
    report.findings.every((finding) =>
      ["P0", "P1", "P2", "P3"].includes(finding.severity),
    ),
    "all findings use approved severities",
  );
}

const closedDayPath = path.join(outDir, "closed-operating-day.json");
if (fs.existsSync(closedDayPath)) {
  const closedDay = JSON.parse(
    fs.readFileSync(closedDayPath, "utf8"),
  );
  pass(closedDay.status === "CLOSED", "closed-day evidence is closed");
  pass(
    closedDay.eod.status === "COMPLETE",
    "closed-day evidence has complete EOD",
  );
  pass(
    closedDay.loads.every((load) => load.status === "COMPLETED"),
    "closed-day evidence has all loads completed",
  );
  pass(
    closedDay.eventLog.every(
      (event, index) => event.sequence === index + 1,
    ),
    "event history is strictly sequenced",
  );
  pass(
    new Set(closedDay.eventLog.map((event) => event.commandId)).size ===
      closedDay.eventLog.length,
    "event evidence contains no duplicate command ID",
  );
}

const carryoverPath = path.join(outDir, "rollover-carryover.json");
if (fs.existsSync(carryoverPath)) {
  const carryover = JSON.parse(
    fs.readFileSync(carryoverPath, "utf8"),
  );
  pass(carryover.length === 4, "rollover contains four product rows");
  pass(
    carryover.find((row) => row.productCode === "BRISKET")
      ?.eligibleSealedUnits === 0,
    "rollover excludes sealed brisket",
  );
  pass(
    carryover.find((row) => row.productCode === "PORK")
      ?.eligibleSealedUnits === 1,
    "rollover retains eligible sealed pork",
  );
}

const manifestPath = path.join(
  outDir,
  "today-hash-manifest.json",
);
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  );
  pass(
    manifest.buildVersion === BUILD,
    "Today Operations hash manifest uses Build 11.5.0",
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
    /key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"11\.(?:5|6|7|8)\.0"/m.test(
      render,
    ),
    "Render APP_BUILD_VERSION is compatible with the Build 11.5.0 Today Operations baseline",
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
  `\nBuild ${BUILD} Today Operations and Quick EOD verification passed.`,
);

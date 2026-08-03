#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  INVENTORY_CONTROL_VERSION,
  INVENTORY_PRODUCTS,
  WASTE_REASONS,
  createInventoryDay,
  deriveInventoryBoard,
} from "../lib/inventory-control/build-11.6.0/inventory-control-engine.mjs";

const BUILD = "11.6.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.6.0");
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

const contractPath = path.join(
  root,
  "config",
  "inventory-control-contract-11.6.0.json",
);
const fixturePath = path.join(
  root,
  "config",
  "inventory-control-fixtures-11.6.0.json",
);

pass(fs.existsSync(contractPath), "inventory-control contract exists");
pass(fs.existsSync(fixturePath), "inventory-control fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturePath)) {
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

pass(contract.buildVersion === BUILD, "contract build version is 11.6.0");
pass(
  contract.engineVersion === INVENTORY_CONTROL_VERSION,
  "inventory engine version is controlled",
);
pass(
  exact(contract.products, INVENTORY_PRODUCTS),
  "contract products match the inventory engine",
);
pass(
  contract.quantityRules.inventoryUnit === "COOKED_POUNDS",
  "inventory is controlled in cooked pounds",
);
pass(
  contract.quantityRules.negativeAvailableAllowed === false,
  "negative available inventory is prohibited",
);
pass(
  contract.quantityRules.countVarianceWarningPercent === 3,
  "count warning threshold is 3%",
);
pass(
  contract.quantityRules.countVarianceBlockingPercent === 10,
  "count blocking threshold is 10%",
);
pass(
  exact(contract.wasteReasons, WASTE_REASONS),
  "waste reasons match the engine",
);
pass(
  contract.auditRules.appendOnlyLedger === true,
  "ledger is append-only",
);
pass(
  contract.auditRules.duplicateCommandCreatesNoAdditionalMutation === true,
  "duplicate commands cannot create additional mutation",
);
pass(
  contract.closeRules.allProductsCounted === true,
  "all products require a final count",
);
pass(
  contract.closeRules.noOpenP0OrP1Exception === true,
  "open P0/P1 exceptions block close",
);
pass(
  fixtures.scenarios.length >= 12,
  "at least twelve deterministic inventory scenarios exist",
);

let day = null;
try {
  day = createInventoryDay(fixtures.baseInput);
} catch (error) {
  pass(
    false,
    `base inventory day creates successfully: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}
if (day) {
  const board = deriveInventoryBoard(
    day,
    "2026-08-03T20:00:00.000Z",
  );
  pass(day.products.length === 4, "base inventory day has four products");
  pass(board.balances.length === 4, "inventory board has four balances");
  pass(
    board.balances.every(
      (row) =>
        row.availableCookedLb >= 0 &&
        row.heldCookedLb >= 0 &&
        row.onHandCookedLb >= 0,
    ),
    "base board has no negative balance",
  );
}

const requiredOutputs = [
  "inventory-workbench-route.json",
  "inventory-capability-map.csv",
  "inventory-source-evidence.csv",
  "inventory-known-scenarios.csv",
  "inventory-ledger-trace.csv",
  "inventory-balance-reconciliation.csv",
  "quality-hold-results.csv",
  "inventory-exception-results.csv",
  "inventory-uat-workbook.csv",
  "inventory-findings.csv",
  "closed-inventory-day.json",
  "inventory-contingency-snapshot.json",
  "inventory-contract-snapshot.json",
  "inventory-fixture-snapshot.json",
  "inventory-readiness.json",
  "inventory-readiness-summary.md",
  "inventory-hash-manifest.json",
];
for (const name of requiredOutputs) {
  pass(
    fs.existsSync(path.join(outDir, name)),
    `required output exists: ${name}`,
  );
}

const routePath = path.join(outDir, "inventory-workbench-route.json");
if (fs.existsSync(routePath)) {
  const route = JSON.parse(fs.readFileSync(routePath, "utf8"));
  pass(route.buildVersion === BUILD, "inventory route record uses Build 11.6.0");
  pass(
    route.route.startsWith("/inventory-lab-1160"),
    "inventory workbench uses an isolated route",
  );
  const pageSource = path.join(root, route.pageSource);
  const componentSource = path.join(root, route.componentSource);
  pass(fs.existsSync(pageSource), "inventory workbench page exists");
  pass(fs.existsSync(componentSource), "inventory workbench component exists");
  if (fs.existsSync(pageSource)) {
    pass(
      fs
        .readFileSync(pageSource, "utf8")
        .includes("BUILD_11_6_0_GENERATED"),
      "inventory page contains generated marker",
    );
  }
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(componentSource, "utf8");
    pass(
      source.includes("Inventory, Waste, Holds, and Exceptions"),
      "inventory workbench has the correct title",
    );
    pass(
      source.includes("does not persist production records"),
      "inventory workbench does not falsely claim persistence",
    );
    pass(
      source.includes("Manager adjust to count"),
      "inventory workbench includes manager reconciliation control",
    );
    pass(
      source.includes("Copy inventory snapshot"),
      "inventory workbench includes contingency export",
    );
  }
}

const readinessPath = path.join(outDir, "inventory-readiness.json");
if (fs.existsSync(readinessPath)) {
  const report = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
  pass(
    report.buildVersion === BUILD,
    "inventory readiness report uses Build 11.6.0",
  );
  pass(
    report.counts.deterministicScenarios === fixtures.scenarios.length,
    "readiness scenario count matches fixture set",
  );
  pass(
    report.counts.productsReconciled === 4,
    "full-day evidence reconciles four products",
  );
  pass(
    report.result.status === "CLOSED",
    "deterministic inventory day closes",
  );
  pass(
    report.result.negativeBalances === 0,
    "deterministic close has no negative balance",
  );
  pass(
    report.result.openBlockingHolds === 0,
    "deterministic close has no open blocking hold",
  );
  pass(
    report.result.openCriticalExceptions === 0,
    "deterministic close has no open P0/P1 exception",
  );
  pass(
    report.result.closeBlockers === 0,
    "deterministic close has no unresolved blocker",
  );
  pass(
    report.findings.every((finding) =>
      ["P0", "P1", "P2", "P3"].includes(finding.severity),
    ),
    "all findings use approved severities",
  );
}

const closedPath = path.join(outDir, "closed-inventory-day.json");
if (fs.existsSync(closedPath)) {
  const closed = JSON.parse(fs.readFileSync(closedPath, "utf8"));
  pass(closed.status === "CLOSED", "closed inventory evidence is closed");
  pass(
    Object.keys(closed.counts).length === 4,
    "closed inventory evidence contains four counts",
  );
  pass(
    closed.holds.every((row) => row.status !== "OPEN"),
    "closed inventory evidence has no open hold",
  );
  pass(
    closed.exceptions.every((row) => row.status === "RESOLVED"),
    "closed inventory evidence has no open exception",
  );
  pass(
    closed.ledger.every(
      (entry, index) => entry.sequence === index + 1,
    ),
    "ledger sequence is strictly ordered",
  );
  pass(
    closed.events.every(
      (event, index) => event.sequence === index + 1,
    ),
    "event sequence is strictly ordered",
  );
  pass(
    new Set(closed.events.map((event) => event.commandId)).size ===
      closed.events.length,
    "event evidence has no duplicate command ID",
  );
}

const manifestPath = path.join(outDir, "inventory-hash-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  pass(
    manifest.buildVersion === BUILD,
    "inventory hash manifest uses Build 11.6.0",
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
    /key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"(?:11\.(?:6|7|8|9)|12\.0)\.0"/m.test(
      render,
    ),
    "Render APP_BUILD_VERSION is compatible with the Build 11.6.0 inventory baseline",
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
  `\nBuild ${BUILD} Inventory, Waste, Holds, and Exceptions verification passed.`,
);

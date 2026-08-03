#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  MULTI_LOCATION_ROLES,
  MULTI_LOCATION_VERSION,
  REQUIRED_LOCATION_PRODUCTS,
  evaluateLocationReadiness,
  evaluateSingleLocationMigration,
  generateConsolidatedLocationReport,
  resolveLocationContext,
} from "../lib/multi-location/build-12.1.0/multi-location-engine.mjs";

const BUILD = "12.1.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-12.1.0");
const failures = [];

function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL — ${message}`);
  }
}
function hash(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}
function exact(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

const contractPath = path.join(
  root,
  "config",
  "multi-location-contract-12.1.0.json",
);
const fixturePath = path.join(
  root,
  "config",
  "multi-location-fixtures-12.1.0.json",
);

pass(fs.existsSync(contractPath), "multi-location contract exists");
pass(fs.existsSync(fixturePath), "multi-location fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturePath)) {
  process.exit(1);
}

const contract = JSON.parse(
  fs.readFileSync(contractPath, "utf8"),
);
const fixtures = JSON.parse(
  fs.readFileSync(fixturePath, "utf8"),
);

pass(contract.buildVersion === BUILD, "contract build version is 12.1.0");
pass(
  contract.engineVersion === MULTI_LOCATION_VERSION,
  "multi-location engine version is controlled",
);
pass(
  exact(contract.roles, MULTI_LOCATION_ROLES),
  "contract roles match the engine",
);
pass(
  exact(
    contract.requiredProducts,
    REQUIRED_LOCATION_PRODUCTS,
  ),
  "required location products match the engine",
);
pass(
  contract.locationContext.explicitLocationRequired === true &&
    contract.locationContext
      .implicitFirstLocationSelectionForbidden === true,
  "explicit location selection is required",
);
pass(
  contract.masterData.crossLocationFallbackForbidden === true,
  "cross-location configuration fallback is forbidden",
);
pass(
  contract.transfer.commandIdIdempotencyRequired === true &&
    contract.transfer.overReceiptForbidden === true,
  "transfer idempotency and over-receipt controls are required",
);
pass(
  contract.reporting.sameTenantRequired === true &&
    contract.reporting.transferDoubleCountingForbidden === true,
  "consolidated reporting requires tenant isolation and transfer neutrality",
);
pass(
  contract.migration.unscopedRecordCountMustBeZero === true &&
    contract.migration.noAutomaticDatabaseMigrationInOverlay === true,
  "migration requires zero unscoped records and no automatic overlay migration",
);
pass(
  contract.renderTopology.webServices === 1 &&
    contract.renderTopology.cronServices === 0 &&
    contract.renderTopology.databases === 1,
  "contract preserves one web, zero cron, one database",
);
pass(
  fixtures.scenarios.length >= 32,
  "at least thirty-two deterministic scenarios exist",
);

const ownerContext = resolveLocationContext(
  fixtures.registry,
  {
    userId: "user-owner",
    tenantId: "tenant-ptt",
  },
);
pass(
  ownerContext.accessibleLocations.length === 2,
  "owner resolves two active locations",
);
pass(
  ownerContext.selectionRequired === true,
  "owner context requires explicit selection",
);

const activeReadiness = fixtures.registry.locations
  .filter((location) => location.status === "ACTIVE")
  .map((location) =>
    evaluateLocationReadiness(
      fixtures.registry,
      location.locationId,
    ),
  );
pass(
  activeReadiness.every((row) => row.status === "READY"),
  "all controlled active locations are ready",
);

const consolidated = generateConsolidatedLocationReport(
  fixtures.registry,
  contract,
  {
    actor: {
      userId: "user-owner",
      tenantId: "tenant-ptt",
    },
    tenantId: "tenant-ptt",
    metrics: fixtures.locationMetrics,
  },
);
pass(
  consolidated.locationCount === 2,
  "controlled consolidated report has two locations",
);
pass(
  consolidated.totals.sales === 86000,
  "controlled consolidated sales equal 86,000",
);
pass(
  consolidated.totals.netTransferCookedLb === 0,
  "controlled internal transfers net to zero",
);

const migration = evaluateSingleLocationMigration(
  fixtures.migrationSnapshot,
);
pass(
  migration.status === "READY" &&
    migration.unscopedRecords === 0,
  "controlled migration readiness has zero unscoped records",
);

const requiredOutputs = [
  "multi-location-workbench-route.json",
  "multi-location-capability-map.csv",
  "multi-location-source-evidence.csv",
  "multi-location-known-scenarios.csv",
  "location-membership-matrix.csv",
  "location-context-evidence.csv",
  "location-readiness.csv",
  "transfer-event-history.csv",
  "transfer-reconciliation.csv",
  "consolidated-location-report.csv",
  "multi-location-uat-workbook.csv",
  "multi-location-findings.csv",
  "location-switch-record.json",
  "transfer-record.json",
  "consolidated-report.json",
  "onboarding-readiness.json",
  "activation-record.json",
  "deactivation-readiness.json",
  "migration-readiness.json",
  "multi-location-contract-snapshot.json",
  "multi-location-fixture-snapshot.json",
  "multi-location-readiness.json",
  "multi-location-readiness-summary.md",
  "multi-location-hash-manifest.json",
];

for (const name of requiredOutputs) {
  pass(
    fs.existsSync(path.join(outDir, name)),
    `required output exists: ${name}`,
  );
}

const routeRecordPath = path.join(
  outDir,
  "multi-location-workbench-route.json",
);
if (fs.existsSync(routeRecordPath)) {
  const route = JSON.parse(
    fs.readFileSync(routeRecordPath, "utf8"),
  );
  pass(
    route.buildVersion === BUILD,
    "workbench route uses Build 12.1.0",
  );
  pass(
    route.route.startsWith("/multi-location-lab-1210"),
    "workbench uses an isolated route",
  );
  pass(
    route.productionExposure ===
      "ADMIN_ONLY_OR_DISABLED",
    "workbench records its production exposure requirement",
  );
  const pageSource = path.join(root, route.pageSource);
  const componentSource = path.join(
    root,
    route.componentSource,
  );
  pass(fs.existsSync(pageSource), "workbench page exists");
  pass(
    fs.existsSync(componentSource),
    "workbench component exists",
  );
  if (fs.existsSync(pageSource)) {
    pass(
      fs
        .readFileSync(pageSource, "utf8")
        .includes("BUILD_12_1_0_GENERATED"),
      "workbench page contains generated marker",
    );
  }
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(
      componentSource,
      "utf8",
    );
    pass(
      source.includes("Multi-Location Foundation"),
      "workbench has the correct title",
    );
    pass(
      source.includes(
        "multi-location persistence",
      ),
      "workbench states the migration and persistence boundary",
    );
    pass(
      source.includes("Inter-location transfer"),
      "workbench includes transfer lifecycle",
    );
    pass(
      source.includes("Cron services: 0"),
      "workbench preserves no-cron topology",
    );
  }
}

const readinessPath = path.join(
  outDir,
  "multi-location-readiness.json",
);
if (fs.existsSync(readinessPath)) {
  const readiness = JSON.parse(
    fs.readFileSync(readinessPath, "utf8"),
  );
  pass(
    readiness.buildVersion === BUILD,
    "readiness uses Build 12.1.0",
  );
  pass(
    readiness.counts.deterministicScenarios ===
      fixtures.scenarios.length,
    "readiness scenario count matches fixtures",
  );
  pass(
    readiness.counts.activeLocations === 2,
    "readiness contains two active locations",
  );
  pass(
    readiness.counts.uatRows === 42,
    "readiness contains forty-two deployed UAT rows",
  );
  pass(
    readiness.results.ownerAccessibleLocations === 2,
    "owner access evidence contains two locations",
  );
  pass(
    readiness.results.activeLocationReadinessPassed === 2,
    "both active locations pass controlled readiness",
  );
  pass(
    readiness.results.transferStatus === "RECEIVED",
    "controlled transfer reaches RECEIVED",
  );
  pass(
    readiness.results.transferSourceDeltaCookedLb === -20 &&
      readiness.results
        .transferDestinationDeltaCookedLb === 20,
    "controlled transfer inventory effects reconcile",
  );
  pass(
    readiness.results.consolidatedSales === 86000 &&
      readiness.results
        .consolidatedNetTransferCookedLb === 0,
    "controlled consolidated report totals reconcile",
  );
  pass(
    readiness.results.onboardingStatus ===
      "READY_FOR_ACTIVATION" &&
      readiness.results.deactivationStatus ===
        "READY_FOR_DEACTIVATION" &&
      readiness.results.migrationStatus === "READY",
    "onboarding, deactivation, and migration controls pass",
  );
  pass(
    readiness.results.unscopedRecords === 0,
    "migration evidence has zero unscoped records",
  );
  pass(
    readiness.results.renderWebServices === 1 &&
      readiness.results.renderCronServices === 0 &&
      readiness.results.renderDatabases === 1,
    "readiness records corrected Render topology",
  );
  pass(
    readiness.results.durablePersistenceStatus ===
      "PENDING_DEPLOYED_SCHEMA_AND_UAT",
    "readiness does not claim durable persistence",
  );
}

const transferPath = path.join(
  outDir,
  "transfer-record.json",
);
if (fs.existsSync(transferPath)) {
  const transfer = JSON.parse(
    fs.readFileSync(transferPath, "utf8"),
  );
  pass(
    transfer.status === "RECEIVED",
    "transfer evidence is received",
  );
  pass(
    transfer.commandHistory.length === 4,
    "transfer evidence contains four lifecycle events",
  );
  pass(
    transfer.dispatch.sourceInventoryEffects.reduce(
      (sum, row) =>
        sum + row.availableDeltaCookedLb,
      0,
    ) === -20,
    "transfer source effects total negative twenty",
  );
  pass(
    transfer.receipt.destinationInventoryEffects.reduce(
      (sum, row) =>
        sum + row.availableDeltaCookedLb,
      0,
    ) === 20,
    "transfer destination effects total positive twenty",
  );
}

const manifestPath = path.join(
  outDir,
  "multi-location-hash-manifest.json",
);
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  );
  pass(
    manifest.buildVersion === BUILD,
    "hash manifest uses Build 12.1.0",
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
    /key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"12\.1\.0"/m.test(
      render,
    ),
    "Render APP_BUILD_VERSION is 12.1.0",
  );
  pass(
    (render.match(/^\s*-\s*type:\s*web\s*$/gm) || [])
      .length === 1,
    "render.yaml contains one web service",
  );
  pass(
    (render.match(/^\s*-\s*type:\s*cron\s*$/gm) || [])
      .length === 0,
    "render.yaml contains zero cron services",
  );
  pass(
    (render.match(/^\s*runtime:\s*node\s*$/gm) || [])
      .length === 1,
    "the single Render service uses runtime: node",
  );
  pass(
    /databases:\s*[\s\S]*?name:\s*ptt-smokehouse-control-db[\s\S]*?plan:\s*basic-256mb/m.test(
      render,
    ),
    "database plan remains basic-256mb",
  );
}

if (failures.length) {
  console.error(
    `\nBuild ${BUILD} verification failed: ${failures.length} control(s).`,
  );
  process.exit(1);
}

console.log(
  `\nBuild ${BUILD} Multi-Location Foundation verification passed.`,
);

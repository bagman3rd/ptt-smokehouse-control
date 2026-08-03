#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_ROLES,
  POS_DATA_INTEGRATIONS_VERSION,
  buildDailySalesSummary,
  compareActualSalesToForecast,
  consolidateLocationSalesSummaries,
  createForecastLearningInput,
  createImportState,
  createSupplierCostSnapshot,
  ingestSalesBatch,
  mapSalesBatch,
  reconcileSalesBatch,
} from "../lib/pos-data-integrations/build-12.2.0/pos-data-integrations-engine.mjs";

const BUILD = "12.2.0";
const root = process.cwd();
const outDir = path.join(
  root,
  "artifacts",
  "build-12.2.0",
);
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
  "pos-data-integrations-contract-12.2.0.json",
);
const fixturePath = path.join(
  root,
  "config",
  "pos-data-integrations-fixtures-12.2.0.json",
);

pass(fs.existsSync(contractPath), "integration contract exists");
pass(fs.existsSync(fixturePath), "integration fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturePath)) {
  process.exit(1);
}

const contract = JSON.parse(
  fs.readFileSync(contractPath, "utf8"),
);
const fixtures = JSON.parse(
  fs.readFileSync(fixturePath, "utf8"),
);

pass(
  contract.buildVersion === BUILD,
  "contract build version is 12.2.0",
);
pass(
  contract.engineVersion === POS_DATA_INTEGRATIONS_VERSION,
  "integration engine version is controlled",
);
pass(
  exact(contract.providers, INTEGRATION_PROVIDERS),
  "contract providers match the engine",
);
pass(
  exact(contract.roles, INTEGRATION_ROLES),
  "contract roles match the engine",
);
pass(
  contract.tenantLocationScope.explicitTenantRequired === true &&
    contract.tenantLocationScope.explicitLocationRequired === true &&
    contract.tenantLocationScope.providerLocationMappingRequired === true,
  "tenant, location, and provider-location scope are required",
);
pass(
  contract.salesImport.sourcePayloadHashRequired === true &&
    contract.salesImport.duplicateLineForbidden === true,
  "source hash and duplicate-line controls are required",
);
pass(
  contract.mapping.unmappedLinesQuarantined === true &&
    contract.mapping.unmappedLinesExcludedFromForecastLearning === true,
  "unmapped lines are quarantined and excluded from learning",
);
pass(
  contract.reconciliation.maximumDifferenceCents === 1 &&
    contract.reconciliation.mappedPlusUnmappedMustEqualImported === true,
  "reconciliation tolerance and classification conservation are controlled",
);
pass(
  contract.retryRecovery.sameIdempotencyKeyRequired === true &&
    contract.retryRecovery.successfulLinesCannotBeDuplicated === true,
  "retry idempotency and successful-line protection are required",
);
pass(
  contract.forecastLearning.automaticForecastFactorChangeForbidden === true &&
    contract.forecastLearning.managerApprovalRequired === true,
  "forecast learning cannot auto-apply factors",
);
pass(
  contract.supplierCost.automaticMenuPriceChangeForbidden === true &&
    contract.supplierCost.costChangeAlertPercent === 10,
  "supplier costs cannot auto-change menu prices",
);
pass(
  contract.renderTopology.webServices === 1 &&
    contract.renderTopology.cronServices === 0 &&
    contract.renderTopology.databases === 1,
  "contract preserves one web, zero cron, one database",
);
pass(
  fixtures.scenarios.length >= 36,
  "at least thirty-six deterministic scenarios exist",
);

let state = createImportState();
const summaries = [];
for (let index = 0; index < fixtures.salesBatches.length; index += 1) {
  const imported = ingestSalesBatch(
    state,
    fixtures.salesBatches[index],
    fixtures.locationRegistry,
  );
  state = imported.state;
  const mapped = mapSalesBatch(
    imported.batch,
    fixtures.mappings,
  );
  const reconciled = reconcileSalesBatch(
    mapped,
    contract,
    {
      actor: {
        userId: "user-km-both",
        role: "KM",
      },
      approvedAt: `2026-08-02T07:0${index}:00.000Z`,
      reason: "Verifier reconciliation",
    },
  );
  pass(
    reconciled.status === "RECONCILED",
    `controlled batch ${index + 1} reconciles`,
  );
  const summary = buildDailySalesSummary(reconciled);
  summaries.push(summary);
  const comparison = compareActualSalesToForecast(
    summary,
    fixtures.forecastSnapshots[index],
  );
  pass(
    Number.isInteger(comparison.varianceCents),
    `controlled comparison ${index + 1} has integer-cent variance`,
  );
  const learning = createForecastLearningInput(
    reconciled,
    summary,
    fixtures.forecastSnapshots[index],
  );
  pass(
    learning.automaticFactorChangeApplied === false,
    `controlled learning input ${index + 1} does not auto-apply`,
  );
}

const consolidation = consolidateLocationSalesSummaries(
  summaries,
  "tenant-ptt",
);
pass(
  consolidation.locationCount === 2,
  "controlled consolidation contains two locations",
);
pass(
  consolidation.totalNetSalesCents === 40000,
  "controlled imported sales total 40,000 cents",
);

const supplier = createSupplierCostSnapshot(
  fixtures.supplierRows,
  fixtures.priorSupplierCosts,
  contract,
);
pass(
  supplier.itemCount === 2 && supplier.alertCount === 1,
  "controlled supplier snapshot has two items and one alert",
);
pass(
  supplier.automaticMenuPriceChangeApplied === false,
  "supplier snapshot does not change menu prices",
);

const requiredOutputs = [
  "pos-data-integrations-workbench-route.json",
  "pos-data-integrations-capability-map.csv",
  "pos-data-integrations-source-evidence.csv",
  "pos-data-integrations-known-scenarios.csv",
  "connection-health.csv",
  "sales-import-reconciliation.csv",
  "mapped-sales-lines.csv",
  "daily-sales-summaries.csv",
  "actual-vs-forecast.csv",
  "forecast-learning-inputs.csv",
  "retry-recovery-evidence.csv",
  "supplier-cost-snapshot.csv",
  "supplier-cost-alerts.csv",
  "pos-data-integrations-uat-workbook.csv",
  "pos-data-integrations-findings.csv",
  "import-state.json",
  "reconciled-batches.json",
  "daily-sales-summaries.json",
  "sales-consolidation.json",
  "forecast-learning-inputs.json",
  "retry-recovery.json",
  "manual-fallback-batch.json",
  "supplier-cost-snapshot.json",
  "pos-data-integrations-contract-snapshot.json",
  "pos-data-integrations-fixture-snapshot.json",
  "pos-data-integrations-readiness.json",
  "pos-data-integrations-readiness-summary.md",
  "pos-data-integrations-hash-manifest.json",
];

for (const name of requiredOutputs) {
  pass(
    fs.existsSync(path.join(outDir, name)),
    `required output exists: ${name}`,
  );
}

const routeRecordPath = path.join(
  outDir,
  "pos-data-integrations-workbench-route.json",
);
if (fs.existsSync(routeRecordPath)) {
  const route = JSON.parse(
    fs.readFileSync(routeRecordPath, "utf8"),
  );
  pass(
    route.buildVersion === BUILD,
    "workbench route uses Build 12.2.0",
  );
  pass(
    route.route.startsWith("/integration-lab-1220"),
    "workbench uses an isolated route",
  );
  pass(
    route.productionExposure === "ADMIN_ONLY_OR_DISABLED",
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
        .includes("BUILD_12_2_0_GENERATED"),
      "workbench page contains generated marker",
    );
  }
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(
      componentSource,
      "utf8",
    );
    pass(
      source.includes("POS and Data Integrations"),
      "workbench has the correct title",
    );
    pass(
      source.includes("does not call a live POS"),
      "workbench states the live-provider boundary",
    );
    pass(
      source.includes("Manual fallback"),
      "workbench includes manual fallback",
    );
    pass(
      source.includes("Cron services: 0"),
      "workbench preserves no-cron topology",
    );
  }
}

const readinessPath = path.join(
  outDir,
  "pos-data-integrations-readiness.json",
);
if (fs.existsSync(readinessPath)) {
  const readiness = JSON.parse(
    fs.readFileSync(readinessPath, "utf8"),
  );
  pass(
    readiness.buildVersion === BUILD,
    "readiness uses Build 12.2.0",
  );
  pass(
    readiness.counts.deterministicScenarios ===
      fixtures.scenarios.length,
    "readiness scenario count matches fixtures",
  );
  pass(
    readiness.counts.connections === 2 &&
      readiness.counts.importedBatches === 2 &&
      readiness.counts.reconciledBatches === 2,
    "readiness contains two healthy controlled import paths",
  );
  pass(
    readiness.counts.uatRows === 44,
    "readiness contains forty-four deployed UAT rows",
  );
  pass(
    readiness.results.totalImportedNetSalesCents === 40000 &&
      readiness.results.consolidatedLocationCount === 2,
    "readiness imported totals reconcile across two locations",
  );
  pass(
    readiness.results.sourceDifferenceCents === 0 &&
      readiness.results.unmappedNetSalesCents === 0,
    "controlled imports have zero source and mapping difference",
  );
  pass(
    readiness.results.pigeonForgeVarianceCents === 1000 &&
      readiness.results.knoxvilleVarianceCents === -1000,
    "actual-versus-forecast evidence has the expected variances",
  );
  pass(
    readiness.results.retryStatus === "RETRY_PENDING" &&
      readiness.results.retryProtectedLineCount === 1,
    "retry evidence preserves one successful line",
  );
  pass(
    readiness.results.manualStatus === "MANUAL" &&
      readiness.results.manualLearningEligible === false,
    "manual fallback remains excluded from automatic learning",
  );
  pass(
    readiness.results.supplierAlertCount === 1 &&
      readiness.results.automaticMenuPriceChangeApplied === false,
    "supplier alert exists without automatic pricing",
  );
  pass(
    readiness.results.renderWebServices === 1 &&
      readiness.results.renderCronServices === 0 &&
      readiness.results.renderDatabases === 1,
    "readiness records the corrected Render topology",
  );
  pass(
    readiness.results.durablePersistenceStatus ===
      "PENDING_DEPLOYED_ADAPTERS_SCHEMA_AND_UAT" &&
      readiness.results.liveProviderStatus ===
        "NOT_CONNECTED_BY_OVERLAY",
    "readiness does not claim durable or live integration",
  );
}

const batchesPath = path.join(
  outDir,
  "reconciled-batches.json",
);
if (fs.existsSync(batchesPath)) {
  const batches = JSON.parse(
    fs.readFileSync(batchesPath, "utf8"),
  );
  pass(
    batches.length === 2 &&
      batches.every((batch) => batch.status === "RECONCILED"),
    "batch evidence contains two reconciled batches",
  );
  pass(
    new Set(batches.map((batch) => batch.idempotencyKey))
      .size === 2,
    "batch evidence contains unique idempotency keys",
  );
  pass(
    batches.every(
      (batch) =>
        typeof batch.sourcePayloadHash === "string" &&
        batch.sourcePayloadHash.length === 64,
    ),
    "every batch contains a SHA-256 source hash",
  );
}

const manifestPath = path.join(
  outDir,
  "pos-data-integrations-hash-manifest.json",
);
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  );
  pass(
    manifest.buildVersion === BUILD,
    "hash manifest uses Build 12.2.0",
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
    /key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"12\.2\.0"/m.test(
      render,
    ),
    "Render APP_BUILD_VERSION is 12.2.0",
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
  `\nBuild ${BUILD} POS and Data Integrations verification passed.`,
);

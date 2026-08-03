#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  IntegrationValidationError,
  assertAutomaticImportAllowed,
  buildDailySalesSummary,
  compareActualSalesToForecast,
  consolidateLocationSalesSummaries,
  createForecastLearningInput,
  createImportState,
  createManualSalesBatch,
  createSupplierCostSnapshot,
  evaluateConnectionHealth,
  ingestSalesBatch,
  mapSalesBatch,
  normalizeSalesPayload,
  reconcileSalesBatch,
  scheduleFailedBatchRetry,
} from "../lib/pos-data-integrations/build-12.2.0/pos-data-integrations-engine.mjs";

const root = process.cwd();
const contract = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "pos-data-integrations-contract-12.2.0.json",
    ),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "pos-data-integrations-fixtures-12.2.0.json",
    ),
    "utf8",
  ),
);
const failures = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL — ${message}`);
  }
}
function expectError(run, field, message) {
  let thrown = null;
  try {
    run();
  } catch (error) {
    thrown = error;
  }
  pass(
    thrown instanceof IntegrationValidationError,
    `${message}: structured validation error`,
  );
  pass(thrown?.field === field, `${message}: identifies ${field}`);
  return thrown;
}

const registry = fixtures.locationRegistry;
const mappings = fixtures.mappings;
const pfPayload = fixtures.salesBatches[0];
const kxPayload = fixtures.salesBatches[1];
const reconciliationActor = {
  userId: "user-km-both",
  role: "KM",
};

// DI-001.
const healthy = evaluateConnectionHealth(
  fixtures.connections[0],
  contract,
  "2026-08-02T06:10:00.000Z",
);
pass(
  healthy.status === "HEALTHY",
  "DI-001: current production connection is healthy",
);
pass(
  healthy.automaticImportAllowed === true,
  "DI-001: healthy connection allows automatic import",
);

// DI-002.
const stale = evaluateConnectionHealth(
  fixtures.connections[0],
  contract,
  "2026-08-02T07:00:00.000Z",
);
pass(
  stale.status === "DEGRADED",
  "DI-002: stale connection becomes degraded",
);
pass(
  stale.automaticImportAllowed === false,
  "DI-002: degraded connection blocks automatic import",
);

// DI-003.
const pausedConnection = clone(fixtures.connections[0]);
pausedConnection.status = "PAUSED";
const paused = evaluateConnectionHealth(
  pausedConnection,
  contract,
  "2026-08-02T06:10:00.000Z",
);
expectError(
  () => assertAutomaticImportAllowed(paused),
  "connection.status",
  "DI-003: paused connection blocks automatic import",
);

// DI-004.
const wrongProviderLocation = clone(pfPayload);
wrongProviderLocation.providerLocationId = "square-location-kx";
expectError(
  () =>
    normalizeSalesPayload(wrongProviderLocation, registry),
  "providerLocationId",
  "DI-004: provider location mismatch is rejected",
);

// DI-005.
const crossTenant = clone(pfPayload);
crossTenant.tenantId = "tenant-other";
expectError(
  () => normalizeSalesPayload(crossTenant, registry),
  "tenantId",
  "DI-005: cross-tenant import is rejected",
);

// DI-006.
const normalizedPf = normalizeSalesPayload(
  pfPayload,
  registry,
);
pass(
  normalizedPf.lines.length === 4,
  "DI-006: Pigeon Forge payload normalizes four lines",
);
pass(
  normalizedPf.totals.netSalesCents === 26000 &&
    normalizedPf.sourcePayloadHash.length === 64,
  "DI-006: normalized payload totals and hash are deterministic",
);

// DI-007.
const duplicateLine = clone(pfPayload);
duplicateLine.lines.push(clone(duplicateLine.lines[0]));
expectError(
  () => normalizeSalesPayload(duplicateLine, registry),
  "lines",
  "DI-007: duplicate line identity is rejected",
);

// DI-008.
const negativeSale = clone(pfPayload);
negativeSale.lines[0].netSalesCents = -100;
negativeSale.lines[0].refundCents = 0;
expectError(
  () => normalizeSalesPayload(negativeSale, registry),
  "netSalesCents",
  "DI-008: negative non-refund sale is rejected",
);

// DI-009 and DI-010.
let importState = createImportState();
const firstImport = ingestSalesBatch(
  importState,
  pfPayload,
  registry,
);
importState = firstImport.state;
pass(
  firstImport.batch.status === "VALIDATED",
  "DI-009: new provider batch is VALIDATED",
);
pass(
  firstImport.batch.idempotencyKey ===
    "SQUARE_API:tenant-ptt:loc-pigeon-forge:square-event-pf-2026-08-01-v1",
  "DI-009: batch receives deterministic idempotency key",
);
const duplicateImport = ingestSalesBatch(
  importState,
  pfPayload,
  registry,
);
pass(
  duplicateImport.duplicate === true,
  "DI-010: duplicate provider event is idempotent",
);
pass(
  Object.keys(duplicateImport.state.batchesByIdempotencyKey)
    .length === 1,
  "DI-010: duplicate event creates no second batch",
);

// DI-011.
const mappedPf = mapSalesBatch(
  firstImport.batch,
  mappings,
);
pass(
  mappedPf.mapping.mappedNetSalesCents === 26000,
  "DI-011: all Pigeon Forge sales are mapped",
);
pass(
  mappedPf.mapping.mappedLines.filter(
    (line) => line.targetCategory === "BAR",
  ).length === 1 &&
    mappedPf.mapping.mappedLines.filter(
      (line) => line.targetCategory === "MERCHANDISE",
    ).length === 1,
  "DI-011: food, bar, and merchandise remain classified separately",
);

// DI-012.
const missingMappingSet = mappings.filter(
  (mapping) =>
    mapping.providerItemId !== "sq-pf-merch",
);
const partiallyMapped = mapSalesBatch(
  firstImport.batch,
  missingMappingSet,
);
pass(
  partiallyMapped.status === "PARTIAL",
  "DI-012: unmapped item creates PARTIAL status",
);
pass(
  partiallyMapped.mapping.unmappedLines.length === 1 &&
    partiallyMapped.mapping.unmappedNetSalesCents === 2000,
  "DI-012: unmapped merchandise is quarantined",
);

// DI-013.
const ignoredMappings = clone(mappings);
const ignoredBar = ignoredMappings.find(
  (mapping) => mapping.mappingId === "map-pf-bar",
);
ignoredBar.targetCategory = "IGNORED";
ignoredBar.status = "IGNORED";
const ignoredBatch = mapSalesBatch(
  firstImport.batch,
  ignoredMappings,
);
const ignoredReconciled = reconcileSalesBatch(
  ignoredBatch,
  contract,
  {
    actor: reconciliationActor,
    approvedAt: "2026-08-02T06:30:00.000Z",
    reason: "Controlled ignored-item reconciliation",
  },
);
pass(
  ignoredReconciled.status === "RECONCILED",
  "DI-013: ignored line can still reconcile to source",
);
pass(
  ignoredReconciled.learningEligible === false,
  "DI-013: ignored line is excluded from forecast learning",
);

// DI-014.
const reconciledPf = reconcileSalesBatch(
  mappedPf,
  contract,
  {
    actor: reconciliationActor,
    approvedAt: "2026-08-02T06:30:00.000Z",
    reason: "POS report totals match",
  },
);
pass(
  reconciledPf.status === "RECONCILED",
  "DI-014: exact source reconciliation passes",
);
pass(
  reconciledPf.reconciliation.sourceDifferenceCents === 0,
  "DI-014: source difference is zero",
);

// DI-015.
const sourceMismatch = clone(mappedPf);
sourceMismatch.sourceTotalNetSalesCents = 25900;
const failedReconciliation = reconcileSalesBatch(
  sourceMismatch,
  contract,
  {
    actor: reconciliationActor,
    approvedAt: "2026-08-02T06:31:00.000Z",
    reason: "Intentional mismatch",
  },
);
pass(
  failedReconciliation.status === "FAILED",
  "DI-015: source-total mismatch fails reconciliation",
);
pass(
  failedReconciliation.reconciliation
    .sourceDifferenceCents === 100,
  "DI-015: reconciliation retains the difference",
);

// DI-016.
pass(
  reconciledPf.reconciliation
    .classificationDifferenceCents === 0,
  "DI-016: mapped plus unmapped plus ignored equals imported total",
);

// DI-017.
const pfSummary = buildDailySalesSummary(reconciledPf);
pass(
  pfSummary.netSalesCents === 26000,
  "DI-017: daily summary totals Pigeon Forge net sales",
);
pass(
  pfSummary.tenantId === "tenant-ptt" &&
    pfSummary.locationId === "loc-pigeon-forge" &&
    pfSummary.businessDate === "2026-08-01",
  "DI-017: daily summary remains tenant/location/date scoped",
);

// DI-018.
const pfComparison = compareActualSalesToForecast(
  pfSummary,
  fixtures.forecastSnapshots[0],
);
pass(
  pfComparison.varianceCents === 1000,
  "DI-018: Pigeon Forge actual-to-forecast variance is +1,000 cents",
);

// Prepare Knoxville.
const kxImported = ingestSalesBatch(
  createImportState(),
  kxPayload,
  registry,
).batch;
const kxMapped = mapSalesBatch(kxImported, mappings);
const kxReconciled = reconcileSalesBatch(
  kxMapped,
  contract,
  {
    actor: reconciliationActor,
    approvedAt: "2026-08-02T06:35:00.000Z",
    reason: "Knoxville POS report totals match",
  },
);
const kxSummary = buildDailySalesSummary(kxReconciled);

// DI-019.
const kxComparison = compareActualSalesToForecast(
  kxSummary,
  fixtures.forecastSnapshots[1],
);
pass(
  kxComparison.varianceCents === -1000,
  "DI-019: Knoxville actual-to-forecast variance is -1,000 cents",
);

// DI-020.
const learningInput = createForecastLearningInput(
  reconciledPf,
  pfSummary,
  fixtures.forecastSnapshots[0],
);
pass(
  learningInput.productInputs.length === 2,
  "DI-020: Pigeon Forge learning input has two mapped meat products",
);
pass(
  learningInput.productInputs.find(
    (row) => row.productCode === "BRISKET",
  ).actualCookedLbEquivalent === 8.4,
  "DI-020: brisket quantity converts to 8.4 cooked pounds",
);

// DI-021.
const partialReconciled = reconcileSalesBatch(
  partiallyMapped,
  contract,
  {
    actor: reconciliationActor,
    approvedAt: "2026-08-02T06:40:00.000Z",
    reason: "Partial import with quarantine",
  },
);
expectError(
  () =>
    createForecastLearningInput(
      {
        ...partialReconciled,
        status: "RECONCILED",
      },
      {
        ...pfSummary,
        unmappedNetSalesCents: 2000,
      },
      fixtures.forecastSnapshots[0],
    ),
  "unmappedNetSalesCents",
  "DI-021: unmapped amount blocks forecast learning",
);

// DI-022.
pass(
  learningInput.automaticFactorChangeApplied === false &&
    learningInput.managerApprovalRequired === true,
  "DI-022: forecast learning never changes factors automatically",
);

// DI-023, DI-024, DI-025.
const retryPending = scheduleFailedBatchRetry(
  fixtures.failedBatch,
  contract,
  {
    requestedAt: "2026-08-02T06:25:00.000Z",
    nextRetryAt: "2026-08-02T06:40:00.000Z",
    lastErrorCode: "PROVIDER_TIMEOUT",
    lastErrorMessage: "Second controlled timeout",
  },
);
pass(
  retryPending.status === "RETRY_PENDING",
  "DI-023: failed batch schedules retry",
);
pass(
  retryPending.sameIdempotencyKey === true &&
    retryPending.idempotencyKey ===
      fixtures.failedBatch.idempotencyKey,
  "DI-024: retry preserves the original idempotency key",
);
pass(
  retryPending.protectedLineCount === 1 &&
    retryPending.protectedLineKeys[0] ===
      "pf-order-1:pf-line-1",
  "DI-025: successful line remains protected during retry",
);

// DI-026.
const exhaustedBatch = {
  ...fixtures.failedBatch,
  attemptCount: contract.retryRecovery.maximumAttempts,
};
const exhaustedRetry = scheduleFailedBatchRetry(
  exhaustedBatch,
  contract,
  {
    requestedAt: "2026-08-02T07:00:00.000Z",
    nextRetryAt: "2026-08-02T07:15:00.000Z",
    lastErrorCode: "PROVIDER_TIMEOUT",
    lastErrorMessage: "Maximum retry attempt reached",
  },
);
pass(
  exhaustedRetry.status === "FAILED" &&
    exhaustedRetry.manualEscalationRequired === true,
  "DI-026: maximum attempts require manual escalation",
);

// DI-027.
const missingManualReason = clone(fixtures.manualEntry);
missingManualReason.manualReason = "";
expectError(
  () =>
    createManualSalesBatch(
      missingManualReason,
      registry,
      mappings,
      contract,
      [],
    ),
  "manualReason",
  "DI-027: manual fallback requires a reason",
);

// DI-028.
const manualBatch = createManualSalesBatch(
  fixtures.manualEntry,
  registry,
  mappings,
  contract,
  [],
);
pass(
  manualBatch.status === "MANUAL" &&
    manualBatch.reportingEligible === true,
  "DI-028: manual fallback under threshold is accepted",
);
pass(
  manualBatch.learningEligible === false,
  "DI-028: manual fallback is excluded from automatic learning",
);

// DI-029.
const largeManual = clone(fixtures.manualEntry);
largeManual.providerEventId = "manual-large-pf";
largeManual.sourceTotalNetSalesCents = 60000;
largeManual.lines[0].grossSalesCents = 42000;
largeManual.lines[0].netSalesCents = 42000;
expectError(
  () =>
    createManualSalesBatch(
      largeManual,
      registry,
      mappings,
      contract,
      [],
    ),
  "approvedBy",
  "DI-029: large manual entry requires approval",
);

// DI-030.
const sameDateProviderBatch = {
  ...reconciledPf,
  businessDate: fixtures.manualEntry.businessDate,
};
expectError(
  () =>
    createManualSalesBatch(
      fixtures.manualEntry,
      registry,
      mappings,
      contract,
      [sameDateProviderBatch],
    ),
  "providerEventId",
  "DI-030: manual entry cannot overwrite provider batch",
);

// DI-031.
const supplierSnapshot = createSupplierCostSnapshot(
  fixtures.supplierRows,
  fixtures.priorSupplierCosts,
  contract,
);
pass(
  supplierSnapshot.itemCount === 2,
  "DI-031: supplier snapshot contains two items",
);
const supplierSnapshotAgain =
  createSupplierCostSnapshot(
    fixtures.supplierRows,
    fixtures.priorSupplierCosts,
    contract,
  );
pass(
  supplierSnapshot.snapshotId ===
    supplierSnapshotAgain.snapshotId,
  "DI-031: unchanged supplier rows produce deterministic snapshot identity",
);

// DI-032.
const duplicateSupplierRows = [
  ...fixtures.supplierRows,
  clone(fixtures.supplierRows[0]),
];
const duplicateSupplierSnapshot =
  createSupplierCostSnapshot(
    duplicateSupplierRows,
    fixtures.priorSupplierCosts,
    contract,
  );
pass(
  duplicateSupplierSnapshot.duplicate === true &&
    duplicateSupplierSnapshot.duplicateRows.length === 1,
  "DI-032: duplicate supplier row is idempotent",
);
pass(
  duplicateSupplierSnapshot.itemCount === 2,
  "DI-032: duplicate supplier row creates no third item",
);

// DI-033.
pass(
  supplierSnapshot.alertCount === 1,
  "DI-033: brisket cost increase creates one alert",
);
pass(
  supplierSnapshot.alerts[0].vendorItemId ===
    "vendor-brisket-001",
  "DI-033: alert identifies brisket vendor item",
);

// DI-034.
pass(
  supplierSnapshot.automaticMenuPriceChangeApplied === false,
  "DI-034: supplier costs never change menu prices automatically",
);

// DI-035.
const consolidated = consolidateLocationSalesSummaries(
  [pfSummary, kxSummary],
  "tenant-ptt",
);
pass(
  consolidated.locationCount === 2,
  "DI-035: consolidated sales preserve two locations",
);
pass(
  consolidated.totalNetSalesCents === 40000,
  "DI-035: two-location imported sales total 40,000 cents",
);

// DI-036.
pass(
  contract.renderTopology.webServices === 1 &&
    contract.renderTopology.cronServices === 0 &&
    contract.renderTopology.databases === 1,
  "DI-036: Render topology remains one web, zero cron, one database",
);

if (failures.length) {
  console.error(
    `\nBuild 12.2.0 POS and Data Integrations test failed: ${failures.length} control(s).`,
  );
  process.exit(1);
}

console.log(
  "\nBuild 12.2.0 POS and Data Integrations fixture test passed.",
);

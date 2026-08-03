#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  MultiLocationValidationError,
  approveTransferOrder,
  assertLocationScopedRecord,
  authorizeLocationAction,
  createLocationActivationRecord,
  createLocationScopedRecord,
  createLocationSwitchRecord,
  createTransferOrder,
  dispatchTransferOrder,
  evaluateLocationDeactivation,
  evaluateLocationOnboarding,
  evaluateLocationReadiness,
  evaluateSingleLocationMigration,
  generateConsolidatedLocationReport,
  receiveTransferOrder,
  resolveLocationContext,
  resolveLocationMasterData,
} from "../lib/multi-location/build-12.1.0/multi-location-engine.mjs";

const root = process.cwd();
const contract = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "multi-location-contract-12.1.0.json",
    ),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "multi-location-fixtures-12.1.0.json",
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
    thrown instanceof MultiLocationValidationError,
    `${message}: structured validation error`,
  );
  pass(thrown?.field === field, `${message}: identifies ${field}`);
  return thrown;
}

const registry = fixtures.registry;
const ownerActor = {
  userId: "user-owner",
  tenantId: "tenant-ptt",
};
const pfManagerActor = {
  userId: "user-km-pf",
  tenantId: "tenant-ptt",
};
const regionalManagerActor = {
  userId: "user-km-both",
  tenantId: "tenant-ptt",
};
const pitmasterActor = {
  userId: "user-pit-pf",
  tenantId: "tenant-ptt",
};
const coordinatorActor = {
  userId: "user-kc-kx",
  tenantId: "tenant-ptt",
};
const viewerActor = {
  userId: "user-viewer",
  tenantId: "tenant-ptt",
};

// ML-001.
const ownerContext = resolveLocationContext(
  registry,
  ownerActor,
);
pass(
  ownerContext.accessibleLocations.length === 2,
  "ML-001: owner resolves both active locations",
);
pass(
  ownerContext.selectionRequired === true &&
    ownerContext.activeLocationId === null,
  "ML-001: no implicit first-location selection occurs",
);

// ML-002.
const assignedContext = resolveLocationContext(
  registry,
  pfManagerActor,
);
pass(
  assignedContext.accessibleLocations.length === 1,
  "ML-002: assigned manager resolves only one location",
);
pass(
  assignedContext.accessibleLocations[0].locationId ===
    "loc-pigeon-forge",
  "ML-002: assigned manager resolves Pigeon Forge",
);

// ML-003.
expectError(
  () =>
    resolveLocationContext(registry, {
      userId: "user-inactive",
      tenantId: "tenant-ptt",
    }),
  "membership.status",
  "ML-003: inactive membership is rejected",
);

// ML-004.
expectError(
  () =>
    resolveLocationContext(registry, {
      userId: "user-owner",
      tenantId: "tenant-other",
    }),
  "tenantId",
  "ML-004: cross-tenant context is rejected",
);

// ML-005.
expectError(
  () =>
    resolveLocationContext(
      registry,
      ownerActor,
      "loc-future",
    ),
  "location.status",
  "ML-005: onboarding location cannot be selected for operations",
);

// ML-006.
const switchRecord = createLocationSwitchRecord(
  registry,
  contract,
  {
    actor: regionalManagerActor,
    fromLocationId: "loc-pigeon-forge",
    toLocationId: "loc-knoxville-lab",
    occurredAt: "2026-08-02T12:10:00.000Z",
    reason: "Review Knoxville operating plan",
    requestId: "switch-request-001",
  },
);
pass(
  switchRecord.recordVersion ===
    "PTT_LOCATION_SWITCH_12_1_0",
  "ML-006: switch record uses controlled version",
);
pass(
  switchRecord.toLocationId === "loc-knoxville-lab" &&
    switchRecord.switchId.length > 20,
  "ML-006: switch record retains authorized destination",
);

// ML-007.
expectError(
  () =>
    createLocationSwitchRecord(registry, contract, {
      actor: pfManagerActor,
      fromLocationId: "loc-pigeon-forge",
      toLocationId: "loc-knoxville-lab",
      occurredAt: "2026-08-02T12:11:00.000Z",
      reason: "Unauthorized switch attempt",
      requestId: "switch-request-002",
    }),
  "locationId",
  "ML-007: unauthorized location switch is denied",
);

// ML-008.
const pfReadiness = evaluateLocationReadiness(
  registry,
  "loc-pigeon-forge",
);
pass(
  pfReadiness.status === "READY",
  "ML-008: Pigeon Forge location master data is ready",
);
pass(
  pfReadiness.productCount === 4 &&
    pfReadiness.activeSmokerCount === 2,
  "ML-008: Pigeon Forge has four products and two active smokers",
);

// ML-009.
const missingProductRegistry = clone(registry);
missingProductRegistry.products =
  missingProductRegistry.products.filter(
    (row) =>
      !(
        row.locationId === "loc-knoxville-lab" &&
        row.productCode === "CHICKEN"
      ),
  );
const missingProductReadiness = evaluateLocationReadiness(
  missingProductRegistry,
  "loc-knoxville-lab",
);
pass(
  missingProductReadiness.status === "BLOCKED",
  "ML-009: missing required product blocks readiness",
);
pass(
  missingProductReadiness.blockers.includes(
    "product:CHICKEN",
  ),
  "ML-009: missing CHICKEN configuration is named",
);

// ML-010.
expectError(
  () =>
    resolveLocationMasterData(registry, {
      tenantId: "tenant-ptt",
      locationId: "loc-future",
      productCode: "BRISKET",
    }),
  "locationId",
  "ML-010: cross-location master-data fallback is forbidden",
);

const pfBrisket = resolveLocationMasterData(registry, {
  tenantId: "tenant-ptt",
  locationId: "loc-pigeon-forge",
  productCode: "BRISKET",
});
pass(
  pfBrisket.product.forecastBaselineCookedLb === 100,
  "location-specific product configuration resolves exactly",
);

// ML-011.
const locationRecord = createLocationScopedRecord({
  tenantId: "tenant-ptt",
  locationId: "loc-pigeon-forge",
  recordType: "FORECAST",
  sourceId: "forecast-2026-08-03",
  occurredAt: "2026-08-02T12:20:00.000Z",
  payload: { approvedCookedLb: 420 },
});
pass(
  locationRecord.recordVersion ===
    "PTT_LOCATION_RECORD_12_1_0",
  "ML-011: location-scoped record uses controlled version",
);
const locationRecordAgain = createLocationScopedRecord({
  tenantId: "tenant-ptt",
  locationId: "loc-pigeon-forge",
  recordType: "FORECAST",
  sourceId: "forecast-2026-08-03",
  occurredAt: "2026-08-02T12:20:00.000Z",
  payload: { approvedCookedLb: 420 },
});
pass(
  locationRecord.recordId === locationRecordAgain.recordId,
  "ML-011: unchanged source creates deterministic identity",
);

// ML-012.
const pfContext = resolveLocationContext(
  registry,
  pfManagerActor,
  "loc-pigeon-forge",
);
pass(
  assertLocationScopedRecord(locationRecord, pfContext).valid ===
    true,
  "matching location-scoped record passes",
);
expectError(
  () =>
    assertLocationScopedRecord(locationRecord, {
      ...pfContext,
      activeLocationId: "loc-knoxville-lab",
    }),
  "locationId",
  "ML-012: record location mismatch is rejected",
);

// Authorization matrix.
const viewerWrite = authorizeLocationAction(
  registry,
  contract,
  {
    actor: viewerActor,
    locationId: "loc-pigeon-forge",
    action: "inventory:write",
  },
);
pass(
  viewerWrite.allowed === false &&
    viewerWrite.reason === "ROLE_DENIED",
  "Viewer cannot mutate location inventory",
);
const managerWrite = authorizeLocationAction(
  registry,
  contract,
  {
    actor: regionalManagerActor,
    locationId: "loc-knoxville-lab",
    action: "inventory:write",
  },
);
pass(
  managerWrite.allowed === true,
  "regional manager can mutate assigned-location inventory",
);

// ML-013.
const draftTransfer = createTransferOrder(
  registry,
  contract,
  fixtures.transferRequest,
);
pass(
  draftTransfer.status === "DRAFT",
  "ML-013: valid transfer is created as DRAFT",
);
pass(
  draftTransfer.items.reduce(
    (sum, item) => sum + item.quantityCookedLb,
    0,
  ) === 20,
  "ML-013: transfer retains twenty cooked pounds",
);

// ML-014.
const sameLocationRequest = clone(fixtures.transferRequest);
sameLocationRequest.destinationLocationId =
  sameLocationRequest.sourceLocationId;
expectError(
  () =>
    createTransferOrder(
      registry,
      contract,
      sameLocationRequest,
    ),
  "destinationLocationId",
  "ML-014: same-location transfer is rejected",
);

// ML-015.
const approved = approveTransferOrder(
  registry,
  contract,
  draftTransfer,
  {
    actor: regionalManagerActor,
    commandId: "transfer-approve-001",
    occurredAt: "2026-08-02T12:30:00.000Z",
    reason: "Approved to balance forecast demand",
  },
);
pass(
  approved.record.status === "APPROVED",
  "ML-015: source-authorized manager approves transfer",
);
pass(
  approved.record.approvals.length === 1,
  "ML-015: approval evidence is retained",
);

// ML-016.
const shippedItems = [
  {
    productCode: "BRISKET",
    quantityCookedLb: 12,
    lotIds: ["lot-brisket-pf-0802"],
  },
  {
    productCode: "PORK",
    quantityCookedLb: 8,
    lotIds: ["lot-pork-pf-0802"],
  },
];
const dispatched = dispatchTransferOrder(
  registry,
  contract,
  approved.record,
  {
    actor: pitmasterActor,
    commandId: "transfer-dispatch-001",
    occurredAt: "2026-08-02T13:00:00.000Z",
    shippedItems,
  },
);
pass(
  dispatched.record.status === "IN_TRANSIT",
  "ML-016: approved transfer dispatches to IN_TRANSIT",
);
pass(
  dispatched.record.dispatch.sourceInventoryEffects.reduce(
    (sum, row) => sum + row.availableDeltaCookedLb,
    0,
  ) === -20,
  "ML-016: source inventory decrements by twenty cooked pounds",
);

// ML-017.
const duplicateDispatch = dispatchTransferOrder(
  registry,
  contract,
  dispatched.record,
  {
    actor: pitmasterActor,
    commandId: "transfer-dispatch-001",
    occurredAt: "2026-08-02T13:00:01.000Z",
    shippedItems,
  },
);
pass(
  duplicateDispatch.duplicate === true,
  "ML-017: duplicate dispatch command is idempotent",
);
pass(
  duplicateDispatch.record.commandHistory.length ===
    dispatched.record.commandHistory.length,
  "ML-017: duplicate dispatch creates no second event",
);

// ML-018.
const received = receiveTransferOrder(
  registry,
  contract,
  dispatched.record,
  {
    actor: coordinatorActor,
    commandId: "transfer-receive-001",
    occurredAt: "2026-08-02T14:00:00.000Z",
    receivedItems: shippedItems,
  },
);
pass(
  received.record.status === "RECEIVED",
  "ML-018: exact transfer receipt reaches RECEIVED",
);
pass(
  received.record.receipt.destinationInventoryEffects.reduce(
    (sum, row) => sum + row.availableDeltaCookedLb,
    0,
  ) === 20,
  "ML-018: destination inventory increments by twenty cooked pounds",
);

const duplicateReceipt = receiveTransferOrder(
  registry,
  contract,
  received.record,
  {
    actor: coordinatorActor,
    commandId: "transfer-receive-001",
    occurredAt: "2026-08-02T14:00:01.000Z",
    receivedItems: shippedItems,
  },
);
pass(
  duplicateReceipt.duplicate === true,
  "duplicate receipt command is idempotent",
);

// ML-019.
expectError(
  () =>
    receiveTransferOrder(
      registry,
      contract,
      dispatched.record,
      {
        actor: coordinatorActor,
        commandId: "transfer-receive-over",
        occurredAt: "2026-08-02T14:05:00.000Z",
        receivedItems: [
          {
            productCode: "BRISKET",
            quantityCookedLb: 13,
          },
          {
            productCode: "PORK",
            quantityCookedLb: 8,
          },
        ],
      },
    ),
  "receivedItems",
  "ML-019: over receipt is rejected",
);

// ML-020.
const varianceReceipt = receiveTransferOrder(
  registry,
  contract,
  dispatched.record,
  {
    actor: coordinatorActor,
    commandId: "transfer-receive-variance",
    occurredAt: "2026-08-02T14:10:00.000Z",
    receivedItems: [
      {
        productCode: "BRISKET",
        quantityCookedLb: 11,
      },
      {
        productCode: "PORK",
        quantityCookedLb: 8,
      },
    ],
  },
);
pass(
  varianceReceipt.record.status ===
    "RECEIVED_WITH_VARIANCE",
  "ML-020: short receipt retains variance status",
);
pass(
  varianceReceipt.record.receipt.variances.find(
    (row) => row.productCode === "BRISKET",
  ).varianceCookedLb === -1,
  "ML-020: one-pound brisket shortage is recorded",
);

// ML-021 and ML-022.
const consolidated = generateConsolidatedLocationReport(
  registry,
  contract,
  {
    actor: ownerActor,
    tenantId: "tenant-ptt",
    metrics: fixtures.locationMetrics,
  },
);
pass(
  consolidated.locationCount === 2,
  "ML-021: consolidated owner report preserves two locations",
);
pass(
  consolidated.totals.sales === 86000 &&
    consolidated.totals.foodSales === 68800,
  "ML-021: consolidated sales totals are correct",
);
pass(
  consolidated.totals.netTransferCookedLb === 0,
  "ML-022: internal transfers net to zero",
);
pass(
  consolidated.transferDoubleCountingExcluded === true,
  "ML-022: transfer double-counting exclusion is explicit",
);

// ML-023.
expectError(
  () =>
    generateConsolidatedLocationReport(
      registry,
      contract,
      {
        actor: regionalManagerActor,
        tenantId: "tenant-ptt",
        metrics: fixtures.locationMetrics,
      },
    ),
  "actor.role",
  "ML-023: non-owner consolidated reporting is denied",
);

// ML-024.
const crossTenantMetrics = clone(fixtures.locationMetrics);
crossTenantMetrics[1].tenantId = "tenant-other";
expectError(
  () =>
    generateConsolidatedLocationReport(
      registry,
      contract,
      {
        actor: ownerActor,
        tenantId: "tenant-ptt",
        metrics: crossTenantMetrics,
      },
    ),
  "tenantId",
  "ML-024: cross-tenant metric is rejected",
);

// ML-025.
const onboarding = evaluateLocationOnboarding(contract, {
  tenantId: "tenant-ptt",
  locationId: "loc-future",
  evidence: fixtures.onboardingEvidence,
  evaluatedAt: "2026-08-02T15:00:00.000Z",
});
pass(
  onboarding.status === "READY_FOR_ACTIVATION",
  "ML-025: complete onboarding is ready for activation",
);
pass(
  onboarding.controls.length === 10 &&
    onboarding.blockers.length === 0,
  "ML-025: all ten onboarding controls pass",
);

// ML-026.
const incompleteOnboardingEvidence = clone(
  fixtures.onboardingEvidence,
);
incompleteOnboardingEvidence.training = false;
const incompleteOnboarding = evaluateLocationOnboarding(
  contract,
  {
    tenantId: "tenant-ptt",
    locationId: "loc-future",
    evidence: incompleteOnboardingEvidence,
    evaluatedAt: "2026-08-02T15:01:00.000Z",
  },
);
pass(
  incompleteOnboarding.status === "BLOCKED",
  "ML-026: incomplete onboarding is blocked",
);
pass(
  incompleteOnboarding.blockers.includes("training"),
  "ML-026: missing training is named",
);

// ML-027.
const activation = createLocationActivationRecord(
  registry,
  contract,
  onboarding,
  {
    actor: ownerActor,
    activatedAt: "2026-08-02T15:10:00.000Z",
    reason: "All onboarding controls approved",
  },
);
pass(
  activation.recordVersion ===
    "PTT_LOCATION_ACTIVATION_12_1_0",
  "ML-027: owner activation uses controlled version",
);
pass(
  activation.newStatus === "ACTIVE",
  "ML-027: activation record transitions to ACTIVE",
);
expectError(
  () =>
    createLocationActivationRecord(
      registry,
      contract,
      onboarding,
      {
        actor: pfManagerActor,
        activatedAt: "2026-08-02T15:11:00.000Z",
        reason: "Unauthorized activation",
      },
    ),
  "actor.role",
  "location activation requires Owner or Admin",
);

// ML-028.
const blockedDeactivation = evaluateLocationDeactivation(
  registry,
  contract,
  {
    actor: ownerActor,
    locationId: "loc-knoxville-lab",
    evidence: {
      ...fixtures.deactivationEvidence,
      openTransfer: true,
    },
    reviewedAt: "2026-08-02T15:20:00.000Z",
  },
);
pass(
  blockedDeactivation.status === "BLOCKED",
  "ML-028: open transfer blocks deactivation",
);
pass(
  blockedDeactivation.blockers.includes("openTransfer"),
  "ML-028: open transfer blocker is named",
);

// ML-029.
const cleanDeactivation = evaluateLocationDeactivation(
  registry,
  contract,
  {
    actor: ownerActor,
    locationId: "loc-knoxville-lab",
    evidence: fixtures.deactivationEvidence,
    reviewedAt: "2026-08-02T15:21:00.000Z",
  },
);
pass(
  cleanDeactivation.status ===
    "READY_FOR_DEACTIVATION",
  "ML-029: clean location is ready for deactivation",
);
pass(
  cleanDeactivation.historicalDataRetained === true &&
    cleanDeactivation.newOperationsBlockedAfterDeactivation ===
      true,
  "ML-029: deactivation retains history and blocks new operations",
);

// ML-030.
const migration = evaluateSingleLocationMigration(
  fixtures.migrationSnapshot,
);
pass(
  migration.status === "READY",
  "ML-030: zero unscoped records produces migration readiness",
);
pass(
  migration.unscopedRecords === 0 &&
    migration.automaticMigrationExecuted === false,
  "ML-030: migration is ready but not automatically executed",
);

// ML-031.
const unscopedMigration = clone(fixtures.migrationSnapshot);
unscopedMigration.tables[0].unscopedRecords = 3;
const blockedMigration = evaluateSingleLocationMigration(
  unscopedMigration,
);
pass(
  blockedMigration.status === "BLOCKED",
  "ML-031: unscoped legacy records block migration",
);
pass(
  blockedMigration.blockers[0].includes(
    "Forecast:3 unscoped records",
  ),
  "ML-031: blocking table and count are named",
);

// ML-032.
pass(
  contract.renderTopology.webServices === 1 &&
    contract.renderTopology.cronServices === 0 &&
    contract.renderTopology.databases === 1,
  "ML-032: controlled Render topology remains one web, zero cron, one database",
);

if (failures.length) {
  console.error(
    `\nBuild 12.1.0 Multi-Location Foundation test failed: ${failures.length} control(s).`,
  );
  process.exit(1);
}

console.log(
  "\nBuild 12.1.0 Multi-Location Foundation fixture test passed.",
);

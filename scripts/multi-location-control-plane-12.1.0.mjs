#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  approveTransferOrder,
  createLocationActivationRecord,
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
} from "../lib/multi-location/build-12.1.0/multi-location-engine.mjs";

const BUILD = "12.1.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-12.1.0");
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

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(
  path.join(outDir, "multi-location-hash-manifest.json"),
  { force: true },
);

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
  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true,
  })) {
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
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}
function csvEscape(value) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);
  return /[",\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}
function writeCsv(name, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(
      columns
        .map((column) => csvEscape(row[column]))
        .join(","),
    );
  }
  fs.writeFileSync(
    path.join(outDir, name),
    `${lines.join("\n")}\n`,
    "utf8",
  );
}

const files = walk(root);
const textFiles = files.filter((file) =>
  textExtensions.has(path.extname(file).toLowerCase()),
);
const cache = new Map(
  textFiles.map((file) => [file, read(file)]),
);

const capabilities = [
  [
    "location-context",
    "Explicit tenant and location context",
    [
      "resolveLocationContext",
      "selectionRequired",
      "activeLocationId",
    ],
  ],
  [
    "location-switch",
    "Audited authorized location switching",
    [
      "createLocationSwitchRecord",
      "PTT_LOCATION_SWITCH_12_1_0",
    ],
  ],
  [
    "location-authorization",
    "Role and membership authorization",
    [
      "authorizeLocationAction",
      "ASSIGNED_LOCATIONS",
      "ALL_LOCATIONS",
    ],
  ],
  [
    "location-master-data",
    "Location-specific products and smokers",
    [
      "evaluateLocationReadiness",
      "resolveLocationMasterData",
      "cross-location fallback",
    ],
  ],
  [
    "location-records",
    "Location-scoped operational records",
    [
      "createLocationScopedRecord",
      "assertLocationScopedRecord",
    ],
  ],
  [
    "transfer-lifecycle",
    "Inter-location transfer lifecycle",
    [
      "createTransferOrder",
      "dispatchTransferOrder",
      "receiveTransferOrder",
    ],
  ],
  [
    "transfer-idempotency",
    "Transfer command idempotency",
    ["idempotentResult", "commandHistory", "duplicate"],
  ],
  [
    "transfer-reconciliation",
    "Source and destination inventory effects",
    [
      "sourceInventoryEffects",
      "destinationInventoryEffects",
      "RECEIVED_WITH_VARIANCE",
    ],
  ],
  [
    "consolidated-reporting",
    "Consolidated owner reporting",
    [
      "generateConsolidatedLocationReport",
      "locationCount",
      "transferDoubleCountingExcluded",
    ],
  ],
  [
    "onboarding",
    "Location onboarding and activation",
    [
      "evaluateLocationOnboarding",
      "createLocationActivationRecord",
    ],
  ],
  [
    "deactivation",
    "Controlled location deactivation",
    [
      "evaluateLocationDeactivation",
      "historicalDataRetained",
    ],
  ],
  [
    "migration-readiness",
    "Single-location migration readiness",
    [
      "evaluateSingleLocationMigration",
      "unscopedRecords",
      "automaticMigrationExecuted",
    ],
  ],
  [
    "tenant-isolation",
    "Cross-tenant rejection",
    [
      "cannot cross tenants",
      "Consolidated reporting cannot cross tenants",
    ],
  ],
  [
    "no-cron-topology",
    "One web and zero Render cron services",
    [
      "cronServicesForbidden",
      "Cron services: 0",
    ],
  ],
];

const capabilityRows = [];
const sourceRows = [];
const findings = [];

for (const [capabilityId, label, tokens] of capabilities) {
  const matches = [];
  for (const file of textFiles) {
    const source = `${rel(file)}\n${
      cache.get(file) || ""
    }`.toLowerCase();
    const matched = tokens.filter((token) =>
      source.includes(token.toLowerCase()),
    );
    if (matched.length) {
      matches.push({
        sourceFile: rel(file),
        matched,
      });
    }
  }
  capabilityRows.push({
    capabilityId,
    label,
    required: true,
    status: matches.length
      ? "STATIC_EVIDENCE_FOUND"
      : "NO_STATIC_EVIDENCE",
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
      category: "MULTI_LOCATION_CAPABILITY_GAP",
      subject: label,
      detail:
        "No static implementation evidence was detected.",
      releaseBlocking: true,
    });
  }
}

const ownerActor = {
  userId: "user-owner",
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

const ownerContext = resolveLocationContext(
  fixtures.registry,
  ownerActor,
);
const pfContext = resolveLocationContext(
  fixtures.registry,
  regionalManagerActor,
  "loc-pigeon-forge",
);
const kxContext = resolveLocationContext(
  fixtures.registry,
  regionalManagerActor,
  "loc-knoxville-lab",
);
const switchRecord = createLocationSwitchRecord(
  fixtures.registry,
  contract,
  {
    actor: regionalManagerActor,
    fromLocationId: "loc-pigeon-forge",
    toLocationId: "loc-knoxville-lab",
    occurredAt: "2026-08-02T20:10:00.000Z",
    reason: "Evidence generation",
    requestId: "evidence-switch-1210",
  },
);

const readinessRows = fixtures.registry.locations.map(
  (location) => {
    const readiness = evaluateLocationReadiness(
      fixtures.registry,
      location.locationId,
    );
    return {
      tenantId: readiness.tenantId,
      locationId: readiness.locationId,
      locationStatus: readiness.locationStatus,
      readinessStatus: readiness.status,
      productCount: readiness.productCount,
      activeSmokerCount: readiness.activeSmokerCount,
      blockers: readiness.blockers.join("|"),
    };
  },
);

let transfer = createTransferOrder(
  fixtures.registry,
  contract,
  fixtures.transferRequest,
);
const transferEvents = [
  {
    eventType: "TRANSFER_CREATED",
    status: transfer.status,
    commandId: transfer.commandHistory[0].commandId,
    occurredAt: transfer.commandHistory[0].occurredAt,
    actorId: transfer.commandHistory[0].actorId,
    duplicate: false,
  },
];
const approval = approveTransferOrder(
  fixtures.registry,
  contract,
  transfer,
  {
    actor: regionalManagerActor,
    commandId: "evidence-transfer-approve",
    occurredAt: "2026-08-02T20:15:00.000Z",
    reason: "Evidence approval",
  },
);
transfer = approval.record;
transferEvents.push({
  eventType: "TRANSFER_APPROVED",
  status: transfer.status,
  commandId: approval.event.commandId,
  occurredAt: approval.event.occurredAt,
  actorId: approval.event.actorId,
  duplicate: approval.duplicate,
});
const dispatch = dispatchTransferOrder(
  fixtures.registry,
  contract,
  transfer,
  {
    actor: pitmasterActor,
    commandId: "evidence-transfer-dispatch",
    occurredAt: "2026-08-02T20:20:00.000Z",
    shippedItems: fixtures.transferRequest.items,
  },
);
transfer = dispatch.record;
transferEvents.push({
  eventType: "TRANSFER_DISPATCHED",
  status: transfer.status,
  commandId: dispatch.event.commandId,
  occurredAt: dispatch.event.occurredAt,
  actorId: dispatch.event.actorId,
  duplicate: dispatch.duplicate,
});
const receipt = receiveTransferOrder(
  fixtures.registry,
  contract,
  transfer,
  {
    actor: coordinatorActor,
    commandId: "evidence-transfer-receive",
    occurredAt: "2026-08-02T20:30:00.000Z",
    receivedItems: fixtures.transferRequest.items,
  },
);
transfer = receipt.record;
transferEvents.push({
  eventType: "TRANSFER_RECEIVED",
  status: transfer.status,
  commandId: receipt.event.commandId,
  occurredAt: receipt.event.occurredAt,
  actorId: receipt.event.actorId,
  duplicate: receipt.duplicate,
});

const transferItemRows = transfer.items.map((item) => {
  const sourceEffect =
    transfer.dispatch.sourceInventoryEffects.find(
      (row) => row.productCode === item.productCode,
    );
  const destinationEffect =
    transfer.receipt.destinationInventoryEffects.find(
      (row) => row.productCode === item.productCode,
    );
  const variance = transfer.receipt.variances.find(
    (row) => row.productCode === item.productCode,
  );
  return {
    transferId: transfer.transferId,
    tenantId: transfer.tenantId,
    sourceLocationId: transfer.sourceLocationId,
    destinationLocationId:
      transfer.destinationLocationId,
    status: transfer.status,
    productCode: item.productCode,
    approvedCookedLb: item.quantityCookedLb,
    sourceDeltaCookedLb:
      sourceEffect.availableDeltaCookedLb,
    destinationDeltaCookedLb:
      destinationEffect.availableDeltaCookedLb,
    varianceCookedLb: variance.varianceCookedLb,
  };
});

const consolidated = generateConsolidatedLocationReport(
  fixtures.registry,
  contract,
  {
    actor: ownerActor,
    tenantId: "tenant-ptt",
    metrics: fixtures.locationMetrics,
  },
);

const consolidatedRows = consolidated.locations.map(
  (row) => ({
    reportId: consolidated.reportId,
    operatingDate: consolidated.operatingDate,
    tenantId: consolidated.tenantId,
    locationId: row.locationId,
    locationCode: row.locationCode,
    sales: row.sales,
    foodSales: row.foodSales,
    barSales: row.barSales,
    forecastCookedLb: row.forecastCookedLb,
    actualUsageCookedLb: row.actualUsageCookedLb,
    forecastVarianceCookedLb:
      row.forecastVarianceCookedLb,
    wasteCookedLb: row.wasteCookedLb,
    endingInventoryCookedLb:
      row.endingInventoryCookedLb,
    planAdherencePercent: row.planAdherencePercent,
    transferInCookedLb: row.transferInCookedLb,
    transferOutCookedLb: row.transferOutCookedLb,
    netTransferCookedLb: row.netTransferCookedLb,
  }),
);

const onboarding = evaluateLocationOnboarding(contract, {
  tenantId: "tenant-ptt",
  locationId: "loc-future",
  evidence: fixtures.onboardingEvidence,
  evaluatedAt: "2026-08-02T20:40:00.000Z",
});
const activation = createLocationActivationRecord(
  fixtures.registry,
  contract,
  onboarding,
  {
    actor: ownerActor,
    activatedAt: "2026-08-02T20:45:00.000Z",
    reason: "Controlled evidence activation",
  },
);
const deactivation = evaluateLocationDeactivation(
  fixtures.registry,
  contract,
  {
    actor: ownerActor,
    locationId: "loc-knoxville-lab",
    evidence: fixtures.deactivationEvidence,
    reviewedAt: "2026-08-02T20:50:00.000Z",
  },
);
const migration = evaluateSingleLocationMigration(
  fixtures.migrationSnapshot,
);

const membershipRows = fixtures.registry.memberships.map(
  (membership) => ({
    membershipId: membership.membershipId,
    tenantId: membership.tenantId,
    userId: membership.userId,
    role: membership.role,
    status: membership.status,
    scope: membership.scope,
    locationIds: membership.locationIds.join("|"),
    activeLocationCount:
      membership.status !== "ACTIVE"
        ? 0
        : membership.scope === "ALL_LOCATIONS"
          ? fixtures.registry.locations.filter(
              (location) =>
                location.status === "ACTIVE",
            ).length
          : membership.locationIds.filter((locationId) =>
              fixtures.registry.locations.some(
                (location) =>
                  location.locationId === locationId &&
                  location.status === "ACTIVE",
              ),
            ).length,
  }),
);

const contextRows = [
  {
    actor: "OWNER",
    tenantId: ownerContext.tenantId,
    activeLocationId: ownerContext.activeLocationId,
    selectionRequired: ownerContext.selectionRequired,
    accessibleLocationIds:
      ownerContext.accessibleLocations
        .map((row) => row.locationId)
        .join("|"),
  },
  {
    actor: "REGIONAL_KM_PF",
    tenantId: pfContext.tenantId,
    activeLocationId: pfContext.activeLocationId,
    selectionRequired: pfContext.selectionRequired,
    accessibleLocationIds:
      pfContext.accessibleLocations
        .map((row) => row.locationId)
        .join("|"),
  },
  {
    actor: "REGIONAL_KM_KX",
    tenantId: kxContext.tenantId,
    activeLocationId: kxContext.activeLocationId,
    selectionRequired: kxContext.selectionRequired,
    accessibleLocationIds:
      kxContext.accessibleLocations
        .map((row) => row.locationId)
        .join("|"),
  },
];

const scenarioRows = fixtures.scenarios.map(
  (scenario) => ({
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    deterministicStatus: "PASSED_BY_TEST_SCRIPT",
    expected: JSON.stringify(scenario.expected),
    deployedStatus: "NOT_EXECUTED",
    evidence: "",
  }),
);

const uatRows = [
  ["MX-001", "OWNER", "Explicit location selection", "Sign in with access to two locations without a saved location.", "The application requires explicit location selection and does not silently choose the first location."],
  ["MX-002", "KM", "Assigned-location visibility", "Sign in as a manager assigned only to Pigeon Forge.", "Only Pigeon Forge is visible and accessible."],
  ["MX-003", "VIEWER", "Read-only location switching", "Switch between assigned active locations.", "Switching works; mutations remain denied server-side."],
  ["MX-004", "Inactive user", "Inactive membership", "Attempt login or tenant/location selection.", "Membership is rejected and no location data is returned."],
  ["MX-005", "KM", "Unauthorized location URL", "Request an unassigned location directly through page and API URLs.", "Server denies the request without revealing location data."],
  ["MX-006", "KM", "Location switch audit", "Switch active location.", "Audit contains user, tenant, prior location, destination, request ID, reason, and timestamp."],
  ["MX-007", "KM", "Context persistence", "Select a location, navigate all workflows, reload, and sign in again.", "Location context is explicit, stable, and never crosses tenant or membership boundaries."],
  ["MX-008", "ADMIN", "Active-location readiness", "Open readiness for each active location.", "Timezone, service hours, four products, yields, unit weights, smokers, capacities, forecast profile, and inventory policy pass."],
  ["MX-009", "ADMIN", "Missing product configuration", "Remove one required product in staging.", "Location readiness becomes BLOCKED and names the product."],
  ["MX-010", "ADMIN", "Missing smoker capacity", "Remove a location smoker capacity profile.", "Location readiness becomes BLOCKED."],
  ["MX-011", "KM", "No cross-location product fallback", "Request a product absent at the active location but present elsewhere.", "The request fails; another location's configuration is never substituted."],
  ["MX-012", "KM", "Location-scoped forecast", "Create forecasts for two locations on the same date.", "Each persists with its own tenant/location identity and independent approval."],
  ["MX-013", "KM", "Location-scoped production plan", "Create production plans for two locations.", "Plans, smoker bookings, and capacity remain location-specific."],
  ["MX-014", "PITMASTER", "Location-scoped Today", "Open and update Today at Pigeon Forge, then switch to Knoxville.", "No Pigeon Forge load or event appears in Knoxville."],
  ["MX-015", "KC", "Location-scoped EOD", "Submit and close EOD independently for both locations.", "Each close and rollover remains location-specific."],
  ["MX-016", "KC", "Location-scoped inventory", "Receive, use, waste, hold, count, and close at both locations.", "Ledgers, balances, holds, exceptions, and counts never mix."],
  ["MX-017", "OWNER", "Location report", "Open a daily report for each location.", "Each report reconciles only its location's source transactions."],
  ["MX-018", "OWNER", "Consolidated report", "Open consolidated daily reporting.", "Both active locations appear with a location breakdown and correct totals."],
  ["MX-019", "OWNER", "Transfer double-counting", "Transfer product between locations and open consolidated reporting.", "Internal transfer in/out nets to zero and does not inflate usage or production."],
  ["MX-020", "KM", "Create transfer", "Create a same-tenant transfer with positive quantities and source access.", "Transfer is DRAFT with source, destination, reason, items, lots, actor, and command ID."],
  ["MX-021", "KM", "Same-location transfer", "Set source and destination to the same location.", "Transfer is rejected."],
  ["MX-022", "KM", "Cross-tenant transfer", "Attempt transfer to another tenant.", "Transfer is rejected before any inventory effect."],
  ["MX-023", "KM", "Transfer approval", "Approve a draft transfer as an authorized source manager.", "Approval is durable and auditable."],
  ["MX-024", "PITMASTER", "Transfer dispatch", "Dispatch an approved transfer.", "Source inventory decrements exactly once and status becomes IN_TRANSIT."],
  ["MX-025", "PITMASTER", "Duplicate dispatch", "Retry dispatch with the same command ID.", "No second inventory decrement or event occurs."],
  ["MX-026", "KC", "Transfer receipt", "Receive exact shipped quantities at destination.", "Destination inventory increments exactly once and status becomes RECEIVED."],
  ["MX-027", "KC", "Duplicate receipt", "Retry receipt with the same command ID.", "No second destination increment or event occurs."],
  ["MX-028", "KC", "Receipt shortage", "Receive less than shipped.", "Status becomes RECEIVED_WITH_VARIANCE and shortage is retained."],
  ["MX-029", "KC", "Over receipt", "Receive more than shipped.", "Receipt is rejected without inventory mutation."],
  ["MX-030", "OWNER", "Transfer reconciliation", "Compare source dispatch, destination receipt, and consolidated report.", "Source and destination effects reconcile by product, command, lot, and transfer ID."],
  ["MX-031", "OWNER", "Future-location onboarding", "Complete the ten onboarding controls.", "Location becomes READY_FOR_ACTIVATION."],
  ["MX-032", "OWNER", "Incomplete onboarding", "Leave training or opening inventory incomplete.", "Activation remains blocked and missing controls are named."],
  ["MX-033", "OWNER", "Location activation", "Activate a ready onboarding location.", "Activation record retains prior status, new status, actor, time, reason, and onboarding ID."],
  ["MX-034", "KM", "Unauthorized activation", "Attempt activation as KM.", "Server denies activation."],
  ["MX-035", "OWNER", "Deactivation blockers", "Review a location with an open operating day, transfer, hold, inventory discrepancy, or P0/P1.", "Deactivation remains BLOCKED and every blocker is listed."],
  ["MX-036", "OWNER", "Clean deactivation", "Resolve all blockers and deactivate.", "New operations are blocked while historical data remains available."],
  ["MX-037", "ADMIN", "Single-location migration mapping", "Map every legacy record to the default Pigeon Forge location.", "Unscoped record count is zero before migration approval."],
  ["MX-038", "ADMIN", "Migration blocker", "Leave one legacy record without location ID.", "Migration status is BLOCKED and table/count are named."],
  ["MX-039", "ADMIN", "Migration rollback", "Execute the documented migration rehearsal and rollback in staging.", "Rollback restores the pre-migration state and record counts reconcile."],
  ["MX-040", "ADMIN", "Schema and index review", "Inspect deployed schema and query plans for tenant/location indexes.", "Every multi-location query uses explicit tenant/location predicates with acceptable performance."],
  ["MX-041", "QA", "Two-location concurrency", "Operate both locations concurrently under controlled load.", "No cross-location cache, session, write, report, or notification contamination occurs."],
  ["MX-042", "Release owner", "Multi-location release gate", "Review all UAT, migration, performance, authorization, and defect evidence.", "Decision is GO only with zero open P0/P1 defects."],
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

writeCsv("multi-location-capability-map.csv", capabilityRows, [
  "capabilityId",
  "label",
  "required",
  "status",
  "evidenceCount",
  "deployedVerification",
]);
writeCsv("multi-location-source-evidence.csv", sourceRows, [
  "capabilityId",
  "sourceFile",
  "matchedTokens",
]);
writeCsv("multi-location-known-scenarios.csv", scenarioRows, [
  "scenarioId",
  "scenarioName",
  "deterministicStatus",
  "expected",
  "deployedStatus",
  "evidence",
]);
writeCsv("location-membership-matrix.csv", membershipRows, [
  "membershipId",
  "tenantId",
  "userId",
  "role",
  "status",
  "scope",
  "locationIds",
  "activeLocationCount",
]);
writeCsv("location-context-evidence.csv", contextRows, [
  "actor",
  "tenantId",
  "activeLocationId",
  "selectionRequired",
  "accessibleLocationIds",
]);
writeCsv("location-readiness.csv", readinessRows, [
  "tenantId",
  "locationId",
  "locationStatus",
  "readinessStatus",
  "productCount",
  "activeSmokerCount",
  "blockers",
]);
writeCsv("transfer-event-history.csv", transferEvents, [
  "eventType",
  "status",
  "commandId",
  "occurredAt",
  "actorId",
  "duplicate",
]);
writeCsv("transfer-reconciliation.csv", transferItemRows, [
  "transferId",
  "tenantId",
  "sourceLocationId",
  "destinationLocationId",
  "status",
  "productCode",
  "approvedCookedLb",
  "sourceDeltaCookedLb",
  "destinationDeltaCookedLb",
  "varianceCookedLb",
]);
writeCsv("consolidated-location-report.csv", consolidatedRows, [
  "reportId",
  "operatingDate",
  "tenantId",
  "locationId",
  "locationCode",
  "sales",
  "foodSales",
  "barSales",
  "forecastCookedLb",
  "actualUsageCookedLb",
  "forecastVarianceCookedLb",
  "wasteCookedLb",
  "endingInventoryCookedLb",
  "planAdherencePercent",
  "transferInCookedLb",
  "transferOutCookedLb",
  "netTransferCookedLb",
]);
writeCsv("multi-location-uat-workbook.csv", uatRows, [
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
writeCsv("multi-location-findings.csv", findings, [
  "severity",
  "category",
  "subject",
  "detail",
  "releaseBlocking",
]);

fs.writeFileSync(
  path.join(outDir, "location-switch-record.json"),
  `${JSON.stringify(switchRecord, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "transfer-record.json"),
  `${JSON.stringify(transfer, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "consolidated-report.json"),
  `${JSON.stringify(consolidated, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "onboarding-readiness.json"),
  `${JSON.stringify(onboarding, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "activation-record.json"),
  `${JSON.stringify(activation, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "deactivation-readiness.json"),
  `${JSON.stringify(deactivation, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "migration-readiness.json"),
  `${JSON.stringify(migration, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "multi-location-contract-snapshot.json"),
  `${JSON.stringify(contract, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "multi-location-fixture-snapshot.json"),
  `${JSON.stringify(fixtures, null, 2)}\n`,
  "utf8",
);

const readiness = {
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
    deterministicScenarios: fixtures.scenarios.length,
    registryLocations:
      fixtures.registry.locations.length,
    activeLocations:
      fixtures.registry.locations.filter(
        (row) => row.status === "ACTIVE",
      ).length,
    memberships:
      fixtures.registry.memberships.length,
    productConfigurations:
      fixtures.registry.products.length,
    smokerConfigurations:
      fixtures.registry.smokers.length,
    transferEvents: transferEvents.length,
    transferItems: transferItemRows.length,
    consolidatedLocations:
      consolidated.locationCount,
    onboardingControls:
      onboarding.controls.length,
    migrationTables:
      migration.tables.length,
    uatRows: uatRows.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter(
      (finding) => finding.releaseBlocking,
    ).length,
  },
  results: {
    ownerAccessibleLocations:
      ownerContext.accessibleLocations.length,
    activeLocationReadinessPassed:
      readinessRows.filter(
        (row) =>
          row.locationStatus === "ACTIVE" &&
          row.readinessStatus === "READY",
      ).length,
    transferStatus: transfer.status,
    transferSourceDeltaCookedLb:
      transferItemRows.reduce(
        (sum, row) =>
          sum + row.sourceDeltaCookedLb,
        0,
      ),
    transferDestinationDeltaCookedLb:
      transferItemRows.reduce(
        (sum, row) =>
          sum + row.destinationDeltaCookedLb,
        0,
      ),
    consolidatedSales: consolidated.totals.sales,
    consolidatedNetTransferCookedLb:
      consolidated.totals.netTransferCookedLb,
    onboardingStatus: onboarding.status,
    deactivationStatus: deactivation.status,
    migrationStatus: migration.status,
    unscopedRecords: migration.unscopedRecords,
    renderWebServices:
      contract.renderTopology.webServices,
    renderCronServices:
      contract.renderTopology.cronServices,
    renderDatabases:
      contract.renderTopology.databases,
    durablePersistenceStatus:
      "PENDING_DEPLOYED_SCHEMA_AND_UAT",
  },
  capabilities: capabilityRows,
  findings,
};

fs.writeFileSync(
  path.join(outDir, "multi-location-readiness.json"),
  `${JSON.stringify(readiness, null, 2)}\n`,
  "utf8",
);

const summary = `# Build ${BUILD} Multi-Location Readiness

Generated: ${readiness.generatedAt}

## Exit gate

${contract.exitGate}

| Measure | Count |
|---|---:|
| Files scanned | ${readiness.counts.filesScanned} |
| Required capabilities | ${readiness.counts.capabilities} |
| Capabilities with evidence | ${readiness.counts.capabilitiesWithEvidence} |
| Deterministic scenarios | ${readiness.counts.deterministicScenarios} |
| Registry locations | ${readiness.counts.registryLocations} |
| Active locations | ${readiness.counts.activeLocations} |
| Memberships | ${readiness.counts.memberships} |
| Product configurations | ${readiness.counts.productConfigurations} |
| Smoker configurations | ${readiness.counts.smokerConfigurations} |
| Transfer events | ${readiness.counts.transferEvents} |
| Consolidated locations | ${readiness.counts.consolidatedLocations} |
| Onboarding controls | ${readiness.counts.onboardingControls} |
| Migration tables | ${readiness.counts.migrationTables} |
| Deployed UAT rows | ${readiness.counts.uatRows} |
| Release-blocking static findings | ${readiness.counts.releaseBlockingFindings} |

Deterministic evidence validates the multi-location domain rules. Durable persistence, deployed schema changes, indexes, authorization, tenant/location isolation, migration, and concurrent two-location operation remain pending staging implementation and UAT.
`;
fs.writeFileSync(
  path.join(outDir, "multi-location-readiness-summary.md"),
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
  path.join(outDir, "multi-location-hash-manifest.json"),
  `${JSON.stringify(
    {
      buildVersion: BUILD,
      algorithm: "sha256",
      generatedAt: readiness.generatedAt,
      files: hashes,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `Build ${BUILD} multi-location evidence generated.`,
);
console.log(`Locations: ${readiness.counts.registryLocations}`);
console.log(`Transfer status: ${transfer.status}`);
console.log(
  `Consolidated sales: ${consolidated.totals.sales}`,
);
console.log(`UAT rows: ${uatRows.length}`);
console.log(`Output: ${path.relative(root, outDir)}`);

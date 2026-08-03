#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
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
  reconcileSalesBatch,
  scheduleFailedBatchRetry,
} from "../lib/pos-data-integrations/build-12.2.0/pos-data-integrations-engine.mjs";

const BUILD = "12.2.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-12.2.0");
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

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(
  path.join(outDir, "pos-data-integrations-hash-manifest.json"),
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
function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
    "connection-health",
    "Provider connection health and fallback",
    [
      "evaluateConnectionHealth",
      "automaticImportAllowed",
      "manualFallbackAvailable",
    ],
  ],
  [
    "provider-location-scope",
    "Tenant and provider-location mapping",
    [
      "providerLocationMappings",
      "providerLocationId",
      "cross-tenant import",
    ],
  ],
  [
    "normalization",
    "Deterministic sales normalization",
    [
      "normalizeSalesPayload",
      "sourcePayloadHash",
      "lineKey",
    ],
  ],
  [
    "import-idempotency",
    "Provider-event import idempotency",
    [
      "idempotencyKey",
      "batchesByIdempotencyKey",
      "duplicate",
    ],
  ],
  [
    "item-mapping",
    "Location-scoped POS item mapping",
    [
      "mapSalesBatch",
      "targetCategory",
      "mappingVersion",
    ],
  ],
  [
    "unmapped-quarantine",
    "Unmapped item quarantine",
    [
      "unmappedLines",
      "NO_ACTIVE_MAPPING",
      "PARTIAL",
    ],
  ],
  [
    "reconciliation",
    "Source-total reconciliation",
    [
      "reconcileSalesBatch",
      "sourceDifferenceCents",
      "classificationDifferenceCents",
    ],
  ],
  [
    "daily-summary",
    "Location-scoped daily sales summary",
    [
      "buildDailySalesSummary",
      "PTT_DAILY_POS_SUMMARY_12_2_0",
    ],
  ],
  [
    "forecast-comparison",
    "Actual sales versus forecast",
    [
      "compareActualSalesToForecast",
      "varianceCents",
      "variancePercent",
    ],
  ],
  [
    "forecast-learning",
    "Controlled forecast-learning input",
    [
      "createForecastLearningInput",
      "automaticFactorChangeApplied",
      "managerApprovalRequired",
    ],
  ],
  [
    "retry-recovery",
    "Failed and partial import recovery",
    [
      "scheduleFailedBatchRetry",
      "protectedLineKeys",
      "manualEscalationRequired",
    ],
  ],
  [
    "manual-fallback",
    "Audited manual sales fallback",
    [
      "createManualSalesBatch",
      "sourceDocumentReference",
      "manualAudit",
    ],
  ],
  [
    "supplier-cost",
    "Supplier cost snapshots and alerts",
    [
      "createSupplierCostSnapshot",
      "automaticMenuPriceChangeApplied",
      "costChangeAlertPercent",
    ],
  ],
  [
    "multi-location-isolation",
    "Location-separated imports and consolidation",
    [
      "consolidateLocationSalesSummaries",
      "locationCount",
      "providerLocationId",
    ],
  ],
  [
    "no-cron-topology",
    "One web and zero Render cron services",
    ["cronServicesForbidden", "Cron services: 0"],
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
      category: "INTEGRATION_CAPABILITY_GAP",
      subject: label,
      detail:
        "No static implementation evidence was detected.",
      releaseBlocking: true,
    });
  }
}

const connectionRows = fixtures.connections.map((connection) => {
  const health = evaluateConnectionHealth(
    connection,
    contract,
    "2026-08-02T06:10:00.000Z",
  );
  return {
    connectionId: health.connectionId,
    tenantId: health.tenantId,
    locationId: health.locationId,
    provider: health.provider,
    status: health.status,
    ageMinutes: health.ageMinutes,
    automaticImportAllowed:
      health.automaticImportAllowed,
    manualFallbackAvailable:
      health.manualFallbackAvailable,
    blockers: health.blockers.join("|"),
  };
});

const mappedBatches = [];
const summaries = [];
const comparisons = [];
const learningInputs = [];
const reconciliationRows = [];
const lineRows = [];
let state = createImportState();

for (let index = 0; index < fixtures.salesBatches.length; index += 1) {
  const payload = fixtures.salesBatches[index];
  const imported = ingestSalesBatch(
    state,
    payload,
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
      approvedAt: `2026-08-02T06:${30 + index}:00.000Z`,
      reason: "Controlled source reconciliation",
    },
  );
  const summary = buildDailySalesSummary(reconciled);
  const forecast = fixtures.forecastSnapshots[index];
  const comparison = compareActualSalesToForecast(
    summary,
    forecast,
  );
  const learning = createForecastLearningInput(
    reconciled,
    summary,
    forecast,
  );

  mappedBatches.push(reconciled);
  summaries.push(summary);
  comparisons.push(comparison);
  learningInputs.push(learning);

  reconciliationRows.push({
    batchId: reconciled.batchId,
    tenantId: reconciled.tenantId,
    locationId: reconciled.locationId,
    provider: reconciled.provider,
    businessDate: reconciled.businessDate,
    status: reconciled.status,
    importedNetSalesCents:
      reconciled.reconciliation.importedNetSalesCents,
    sourceNetSalesCents:
      reconciled.reconciliation.sourceNetSalesCents,
    sourceDifferenceCents:
      reconciled.reconciliation.sourceDifferenceCents,
    mappedNetSalesCents:
      reconciled.reconciliation.mappedNetSalesCents,
    unmappedNetSalesCents:
      reconciled.reconciliation.unmappedNetSalesCents,
    ignoredNetSalesCents:
      reconciled.reconciliation.ignoredNetSalesCents,
    reportingEligible: reconciled.reportingEligible,
    learningEligible: reconciled.learningEligible,
    sourcePayloadHash: reconciled.sourcePayloadHash,
  });

  for (const line of reconciled.mapping.mappedLines) {
    lineRows.push({
      batchId: reconciled.batchId,
      tenantId: reconciled.tenantId,
      locationId: reconciled.locationId,
      businessDate: reconciled.businessDate,
      lineKey: line.lineKey,
      providerItemId: line.providerItemId,
      providerItemName: line.providerItemName,
      mappingId: line.mappingId,
      mappingVersion: line.mappingVersion,
      targetCategory: line.targetCategory,
      productCode: line.productCode,
      quantity: line.quantity,
      cookedLbEquivalent: line.cookedLbEquivalent,
      netSalesCents: line.netSalesCents,
      mappingStatus: line.mappingStatus,
    });
  }
}

const summaryRows = summaries.map((summary) => ({
  summaryId: summary.summaryId,
  batchId: summary.batchId,
  tenantId: summary.tenantId,
  locationId: summary.locationId,
  businessDate: summary.businessDate,
  provider: summary.provider,
  orderCount: summary.orderCount,
  lineCount: summary.lineCount,
  grossSalesCents: summary.grossSalesCents,
  discountCents: summary.discountCents,
  netSalesCents: summary.netSalesCents,
  taxCents: summary.taxCents,
  tipCents: summary.tipCents,
  refundCents: summary.refundCents,
  unmappedNetSalesCents:
    summary.unmappedNetSalesCents,
  ignoredNetSalesCents:
    summary.ignoredNetSalesCents,
  sourcePayloadHash: summary.sourcePayloadHash,
}));

const comparisonRows = comparisons.map((row) => ({
  tenantId: row.tenantId,
  locationId: row.locationId,
  businessDate: row.businessDate,
  summaryId: row.summaryId,
  actualNetSalesCents: row.actualNetSalesCents,
  forecastNetSalesCents:
    row.forecastNetSalesCents,
  varianceCents: row.varianceCents,
  variancePercent: row.variancePercent,
}));

const learningRows = [];
for (const learning of learningInputs) {
  for (const row of learning.productInputs) {
    learningRows.push({
      learningInputId: learning.learningInputId,
      tenantId: learning.tenantId,
      locationId: learning.locationId,
      businessDate: learning.businessDate,
      sourceBatchIds: learning.sourceBatchIds.join("|"),
      sourceHash: learning.sourceHash,
      productCode: row.productCode,
      actualQuantity: row.actualQuantity,
      actualCookedLbEquivalent:
        row.actualCookedLbEquivalent,
      forecastCookedLb: row.forecastCookedLb,
      varianceCookedLb: row.varianceCookedLb,
      proposedObservationRatio:
        row.proposedObservationRatio,
      automaticFactorChangeApplied:
        learning.automaticFactorChangeApplied,
      managerApprovalRequired:
        learning.managerApprovalRequired,
    });
  }
}

const consolidation =
  consolidateLocationSalesSummaries(
    summaries,
    "tenant-ptt",
  );

const retry = scheduleFailedBatchRetry(
  fixtures.failedBatch,
  contract,
  {
    requestedAt: "2026-08-02T06:25:00.000Z",
    nextRetryAt: "2026-08-02T06:40:00.000Z",
    lastErrorCode: "PROVIDER_TIMEOUT",
    lastErrorMessage:
      "Controlled retry evidence timeout",
  },
);

const manual = createManualSalesBatch(
  fixtures.manualEntry,
  fixtures.locationRegistry,
  fixtures.mappings,
  contract,
  [],
);

const supplier = createSupplierCostSnapshot(
  fixtures.supplierRows,
  fixtures.priorSupplierCosts,
  contract,
);

const retryRows = [
  {
    batchId: retry.batchId,
    tenantId: retry.tenantId,
    locationId: retry.locationId,
    provider: retry.provider,
    idempotencyKey: retry.idempotencyKey,
    sameIdempotencyKey: retry.sameIdempotencyKey,
    status: retry.status,
    attemptCount: retry.attemptCount,
    protectedLineCount: retry.protectedLineCount,
    protectedLineKeys:
      retry.protectedLineKeys.join("|"),
    lastErrorCode: retry.lastErrorCode,
    nextRetryAt: retry.nextRetryAt,
    manualEscalationRequired:
      retry.manualEscalationRequired,
  },
];

const supplierRows = supplier.records.map((record) => ({
  snapshotId: supplier.snapshotId,
  tenantId: record.tenantId,
  locationId: record.locationId,
  vendorId: record.vendorId,
  vendorItemId: record.vendorItemId,
  productCode: record.productCode,
  purchaseUnit: record.purchaseUnit,
  packSize: record.packSize,
  totalCostCents: record.totalCostCents,
  effectiveAt: record.effectiveAt,
  sourceFileId: record.sourceFileId,
  idempotencyKey: record.idempotencyKey,
  automaticMenuPriceChangeApplied:
    supplier.automaticMenuPriceChangeApplied,
}));

const supplierAlertRows = supplier.alerts.map((alert) => ({
  tenantId: alert.tenantId,
  locationId: alert.locationId,
  vendorItemId: alert.vendorItemId,
  priorCostCents: alert.priorCostCents,
  currentCostCents: alert.currentCostCents,
  changePercent: alert.changePercent,
}));

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
  ["IX-001", "ADMIN", "Production provider connection", "Configure a production provider connection for each active location without exposing credentials.", "Connection status is HEALTHY and credentials remain server-side."],
  ["IX-002", "ADMIN", "Sandbox rejection", "Set the provider environment to sandbox in production-equivalent staging.", "Automatic import is blocked."],
  ["IX-003", "ADMIN", "Webhook signature", "Send valid and invalid signed webhook fixtures.", "Valid request is accepted once; invalid signature is rejected and audited."],
  ["IX-004", "ADMIN", "Provider location mapping", "Send a Pigeon Forge provider event using the Knoxville provider-location ID.", "Import is rejected before persistence."],
  ["IX-005", "ADMIN", "Cross-tenant import", "Send an event with another tenant ID.", "Import is rejected without revealing or changing data."],
  ["IX-006", "KM", "Initial daily sales import", "Import the complete provider day for Pigeon Forge.", "Batch, lines, raw hash, totals, tenant, location, date, and idempotency key persist."],
  ["IX-007", "KM", "Duplicate provider event", "Resubmit the same provider event ID.", "Existing batch is returned and no second batch or line is written."],
  ["IX-008", "KM", "Duplicate order line", "Submit two rows with the same order and line ID.", "Payload is rejected."],
  ["IX-009", "KM", "Refund normalization", "Import a refund line and a negative non-refund line.", "Refund is accepted and reported separately; invalid negative sale is rejected."],
  ["IX-010", "KM", "Voided line handling", "Import voided and non-voided lines.", "Voided handling matches the approved source-accounting rule and reconciles."],
  ["IX-011", "KM", "Item mapping", "Import mapped food, bar, and merchandise items.", "Each line uses the effective location mapping version and correct target category."],
  ["IX-012", "KM", "Location mapping override", "Use the same provider item at two locations with different mappings.", "Each location resolves its own mapping without cross-location fallback."],
  ["IX-013", "KM", "Unmapped quarantine", "Import an unknown provider item.", "Batch becomes PARTIAL; line and amount are quarantined and visible for mapping."],
  ["IX-014", "KM", "Mapping correction and replay", "Create an active mapping for the quarantined item and replay the batch.", "Only the missing classification is resolved; no duplicate sales line is created."],
  ["IX-015", "KM", "Ignored mapping", "Map a non-demand line to IGNORED.", "Source reconciliation passes but the line is excluded from forecast learning."],
  ["IX-016", "KM", "Exact reconciliation", "Compare imported totals with the POS closing report.", "Difference is within one cent and status becomes RECONCILED."],
  ["IX-017", "KM", "Reconciliation mismatch", "Alter the source total by more than one cent.", "Status becomes FAILED and reporting/learning eligibility is blocked."],
  ["IX-018", "KM", "Classification reconciliation", "Verify mapped, unmapped, and ignored amounts.", "Their sum equals imported net sales exactly."],
  ["IX-019", "OWNER", "Daily location summary", "Open the imported sales summary.", "Gross, discounts, net, tax, tips, refunds, orders, lines, categories, and product demand reconcile."],
  ["IX-020", "OWNER", "Two-location isolation", "Import both locations for the same date.", "Each summary remains tenant/location scoped and no line appears in the other location."],
  ["IX-021", "OWNER", "Consolidated imported sales", "Open the two-location sales consolidation.", "Location count and total equal the sum of both reconciled summaries."],
  ["IX-022", "KM", "Actual versus forecast", "Compare each location summary with its approved forecast.", "Variance cents and percent are correct and source IDs are retained."],
  ["IX-023", "KM", "Product demand conversion", "Review mapped quantity-to-cooked-pound conversion.", "Each product uses the approved effective mapping conversion."],
  ["IX-024", "KM", "Forecast-learning eligibility", "Generate learning input from a fully reconciled mapped batch.", "Input includes source hashes and product evidence; no factor is changed automatically."],
  ["IX-025", "KM", "Forecast-learning unmapped block", "Attempt learning with an unmapped amount.", "Learning input is rejected."],
  ["IX-026", "KM", "Forecast-learning approval", "Approve a learning recommendation through the existing forecast-learning workflow.", "Manager approval and effective date persist; source batch remains traceable."],
  ["IX-027", "ADMIN", "Provider timeout", "Force a controlled provider timeout.", "Batch records error code/message and schedules a retry."],
  ["IX-028", "ADMIN", "Retry idempotency", "Retry using the original idempotency key.", "Successful lines are protected and no duplicate line is created."],
  ["IX-029", "ADMIN", "Partial-batch recovery", "Persist a controlled partial success and retry remaining lines.", "Final batch reconciles with each source line represented once."],
  ["IX-030", "ADMIN", "Maximum retries", "Exhaust five attempts.", "Automatic retry stops and manual escalation is required."],
  ["IX-031", "KC", "Manual outage fallback", "Enter a manual daily summary with reason and source document.", "Manual batch is auditable, reportable, and excluded from automatic forecast learning."],
  ["IX-032", "KC", "Manual missing evidence", "Omit reason or source document.", "Manual entry is rejected."],
  ["IX-033", "KC", "Large manual entry", "Submit manual net sales above the approval threshold.", "Manager approval is required."],
  ["IX-034", "KM", "Manual/provider collision", "Create a manual day and then import the provider day, or reverse the order.", "System prevents overwrite and requires an explicit reconciliation workflow."],
  ["IX-035", "OWNER", "Supplier cost import", "Import location-scoped supplier rows.", "Snapshot, source file, vendor item, pack, cost, date, and idempotency key persist."],
  ["IX-036", "OWNER", "Supplier duplicate", "Re-import the same vendor item/effective date.", "No duplicate cost record is created."],
  ["IX-037", "OWNER", "Supplier cost alert", "Import a cost change above 10%.", "Alert identifies prior cost, current cost, and percentage."],
  ["IX-038", "OWNER", "Menu-price safety", "Import any supplier cost change.", "No menu price changes automatically."],
  ["IX-039", "ADMIN", "Provider rate limit", "Return a controlled provider rate-limit response.", "Retry honors provider guidance and does not create duplicate work."],
  ["IX-040", "ADMIN", "Connection degradation", "Age the last successful sync beyond 30 and 120 minutes.", "Status changes HEALTHY → DEGRADED → FAILED with operator guidance."],
  ["IX-041", "ADMIN", "Pause connection", "Pause a location connection.", "Automatic import stops; manual fallback remains available."],
  ["IX-042", "ADMIN", "Credential redaction", "Generate support/evidence bundles with probe credentials.", "No token, secret, authorization header, or credential value is exported."],
  ["IX-043", "QA", "Integration performance", "Import a controlled large day and replay duplicates.", "Latency, memory, database, and idempotency remain within approved budgets."],
  ["IX-044", "Release owner", "Integration release gate", "Review mapping, reconciliation, retry, security, persistence, migration, and defect evidence.", "Decision is GO only with zero open P0/P1 defects and no unreconciled production batch."],
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

writeCsv("pos-data-integrations-capability-map.csv", capabilityRows, [
  "capabilityId",
  "label",
  "required",
  "status",
  "evidenceCount",
  "deployedVerification",
]);
writeCsv("pos-data-integrations-source-evidence.csv", sourceRows, [
  "capabilityId",
  "sourceFile",
  "matchedTokens",
]);
writeCsv("pos-data-integrations-known-scenarios.csv", scenarioRows, [
  "scenarioId",
  "scenarioName",
  "deterministicStatus",
  "expected",
  "deployedStatus",
  "evidence",
]);
writeCsv("connection-health.csv", connectionRows, [
  "connectionId",
  "tenantId",
  "locationId",
  "provider",
  "status",
  "ageMinutes",
  "automaticImportAllowed",
  "manualFallbackAvailable",
  "blockers",
]);
writeCsv("sales-import-reconciliation.csv", reconciliationRows, [
  "batchId",
  "tenantId",
  "locationId",
  "provider",
  "businessDate",
  "status",
  "importedNetSalesCents",
  "sourceNetSalesCents",
  "sourceDifferenceCents",
  "mappedNetSalesCents",
  "unmappedNetSalesCents",
  "ignoredNetSalesCents",
  "reportingEligible",
  "learningEligible",
  "sourcePayloadHash",
]);
writeCsv("mapped-sales-lines.csv", lineRows, [
  "batchId",
  "tenantId",
  "locationId",
  "businessDate",
  "lineKey",
  "providerItemId",
  "providerItemName",
  "mappingId",
  "mappingVersion",
  "targetCategory",
  "productCode",
  "quantity",
  "cookedLbEquivalent",
  "netSalesCents",
  "mappingStatus",
]);
writeCsv("daily-sales-summaries.csv", summaryRows, [
  "summaryId",
  "batchId",
  "tenantId",
  "locationId",
  "businessDate",
  "provider",
  "orderCount",
  "lineCount",
  "grossSalesCents",
  "discountCents",
  "netSalesCents",
  "taxCents",
  "tipCents",
  "refundCents",
  "unmappedNetSalesCents",
  "ignoredNetSalesCents",
  "sourcePayloadHash",
]);
writeCsv("actual-vs-forecast.csv", comparisonRows, [
  "tenantId",
  "locationId",
  "businessDate",
  "summaryId",
  "actualNetSalesCents",
  "forecastNetSalesCents",
  "varianceCents",
  "variancePercent",
]);
writeCsv("forecast-learning-inputs.csv", learningRows, [
  "learningInputId",
  "tenantId",
  "locationId",
  "businessDate",
  "sourceBatchIds",
  "sourceHash",
  "productCode",
  "actualQuantity",
  "actualCookedLbEquivalent",
  "forecastCookedLb",
  "varianceCookedLb",
  "proposedObservationRatio",
  "automaticFactorChangeApplied",
  "managerApprovalRequired",
]);
writeCsv("retry-recovery-evidence.csv", retryRows, [
  "batchId",
  "tenantId",
  "locationId",
  "provider",
  "idempotencyKey",
  "sameIdempotencyKey",
  "status",
  "attemptCount",
  "protectedLineCount",
  "protectedLineKeys",
  "lastErrorCode",
  "nextRetryAt",
  "manualEscalationRequired",
]);
writeCsv("supplier-cost-snapshot.csv", supplierRows, [
  "snapshotId",
  "tenantId",
  "locationId",
  "vendorId",
  "vendorItemId",
  "productCode",
  "purchaseUnit",
  "packSize",
  "totalCostCents",
  "effectiveAt",
  "sourceFileId",
  "idempotencyKey",
  "automaticMenuPriceChangeApplied",
]);
writeCsv("supplier-cost-alerts.csv", supplierAlertRows, [
  "tenantId",
  "locationId",
  "vendorItemId",
  "priorCostCents",
  "currentCostCents",
  "changePercent",
]);
writeCsv("pos-data-integrations-uat-workbook.csv", uatRows, [
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
writeCsv("pos-data-integrations-findings.csv", findings, [
  "severity",
  "category",
  "subject",
  "detail",
  "releaseBlocking",
]);

fs.writeFileSync(
  path.join(outDir, "import-state.json"),
  `${JSON.stringify(state, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "reconciled-batches.json"),
  `${JSON.stringify(mappedBatches, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "daily-sales-summaries.json"),
  `${JSON.stringify(summaries, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "sales-consolidation.json"),
  `${JSON.stringify(consolidation, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "forecast-learning-inputs.json"),
  `${JSON.stringify(learningInputs, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "retry-recovery.json"),
  `${JSON.stringify(retry, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "manual-fallback-batch.json"),
  `${JSON.stringify(manual, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "supplier-cost-snapshot.json"),
  `${JSON.stringify(supplier, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "pos-data-integrations-contract-snapshot.json"),
  `${JSON.stringify(contract, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "pos-data-integrations-fixture-snapshot.json"),
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
    connections: connectionRows.length,
    importedBatches: mappedBatches.length,
    importedLines: lineRows.length,
    reconciledBatches: mappedBatches.filter(
      (row) => row.status === "RECONCILED",
    ).length,
    dailySummaries: summaries.length,
    forecastComparisons: comparisons.length,
    learningProductRows: learningRows.length,
    supplierItems: supplier.itemCount,
    supplierAlerts: supplier.alertCount,
    uatRows: uatRows.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter(
      (finding) => finding.releaseBlocking,
    ).length,
  },
  results: {
    healthyConnections: connectionRows.filter(
      (row) => row.status === "HEALTHY",
    ).length,
    totalImportedNetSalesCents:
      consolidation.totalNetSalesCents,
    consolidatedLocationCount:
      consolidation.locationCount,
    sourceDifferenceCents:
      reconciliationRows.reduce(
        (sum, row) =>
          sum + row.sourceDifferenceCents,
        0,
      ),
    unmappedNetSalesCents:
      reconciliationRows.reduce(
        (sum, row) =>
          sum + row.unmappedNetSalesCents,
        0,
      ),
    pigeonForgeVarianceCents:
      comparisons[0].varianceCents,
    knoxvilleVarianceCents:
      comparisons[1].varianceCents,
    retryStatus: retry.status,
    retryProtectedLineCount:
      retry.protectedLineCount,
    manualStatus: manual.status,
    manualLearningEligible:
      manual.learningEligible,
    supplierAlertCount: supplier.alertCount,
    automaticMenuPriceChangeApplied:
      supplier.automaticMenuPriceChangeApplied,
    renderWebServices:
      contract.renderTopology.webServices,
    renderCronServices:
      contract.renderTopology.cronServices,
    renderDatabases:
      contract.renderTopology.databases,
    durablePersistenceStatus:
      "PENDING_DEPLOYED_ADAPTERS_SCHEMA_AND_UAT",
    liveProviderStatus:
      "NOT_CONNECTED_BY_OVERLAY",
  },
  capabilities: capabilityRows,
  findings,
};

fs.writeFileSync(
  path.join(outDir, "pos-data-integrations-readiness.json"),
  `${JSON.stringify(readiness, null, 2)}\n`,
  "utf8",
);

const summary = `# Build ${BUILD} POS and Data Integrations Readiness

Generated: ${readiness.generatedAt}

## Exit gate

${contract.exitGate}

| Measure | Count |
|---|---:|
| Files scanned | ${readiness.counts.filesScanned} |
| Required capabilities | ${readiness.counts.capabilities} |
| Capabilities with evidence | ${readiness.counts.capabilitiesWithEvidence} |
| Deterministic scenarios | ${readiness.counts.deterministicScenarios} |
| Connections | ${readiness.counts.connections} |
| Imported batches | ${readiness.counts.importedBatches} |
| Imported lines | ${readiness.counts.importedLines} |
| Reconciled batches | ${readiness.counts.reconciledBatches} |
| Daily summaries | ${readiness.counts.dailySummaries} |
| Learning product rows | ${readiness.counts.learningProductRows} |
| Supplier items | ${readiness.counts.supplierItems} |
| Supplier alerts | ${readiness.counts.supplierAlerts} |
| Deployed UAT rows | ${readiness.counts.uatRows} |
| Release-blocking findings | ${readiness.counts.releaseBlockingFindings} |

Controlled imports reconcile to ${consolidation.totalNetSalesCents} cents across ${consolidation.locationCount} locations. This evidence does not establish a live POS connection, durable adapter persistence, webhook registration, supplier download, or production credential configuration.
`;
fs.writeFileSync(
  path.join(outDir, "pos-data-integrations-readiness-summary.md"),
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
  path.join(
    outDir,
    "pos-data-integrations-hash-manifest.json",
  ),
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
  `Build ${BUILD} POS/data integration evidence generated.`,
);
console.log(
  `Imported sales cents: ${consolidation.totalNetSalesCents}`,
);
console.log(
  `Reconciled batches: ${readiness.counts.reconciledBatches}`,
);
console.log(`UAT rows: ${uatRows.length}`);
console.log(`Output: ${path.relative(root, outDir)}`);

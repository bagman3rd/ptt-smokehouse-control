import crypto from "node:crypto";

export const POS_DATA_INTEGRATIONS_VERSION =
  "PTT_POS_DATA_INTEGRATIONS_12_2_0";

export const INTEGRATION_PROVIDERS = Object.freeze([
  "SQUARE_API",
  "SQUARE_WEBHOOK",
  "CSV_UPLOAD",
  "MANUAL_ENTRY",
  "SUPPLIER_CSV",
]);

export const INTEGRATION_ROLES = Object.freeze([
  "ADMIN",
  "OWNER",
  "KM",
  "PITMASTER",
  "KC",
  "VIEWER",
]);

const PRODUCT_TARGETS = new Set([
  "BRISKET",
  "PORK",
  "RIBS",
  "CHICKEN",
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(value[key])}`,
    )
    .join(",")}}`;
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(
      typeof value === "string" ? value : stableStringify(value),
    )
    .digest("hex");
}

function requiredText(value, field) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new IntegrationValidationError(
      field,
      `${field} is required.`,
    );
  }
  return normalized;
}

function integer(value, field, minimum = undefined) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new IntegrationValidationError(
      field,
      `${field} must be an integer.`,
    );
  }
  if (minimum !== undefined && number < minimum) {
    throw new IntegrationValidationError(
      field,
      `${field} must be at least ${minimum}.`,
    );
  }
  return number;
}

function finite(value, field, minimum = undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new IntegrationValidationError(
      field,
      `${field} must be finite.`,
    );
  }
  if (minimum !== undefined && number < minimum) {
    throw new IntegrationValidationError(
      field,
      `${field} must be at least ${minimum}.`,
    );
  }
  return number;
}

function isoTimestamp(value, field) {
  const normalized = requiredText(value, field);
  if (Number.isNaN(new Date(normalized).getTime())) {
    throw new IntegrationValidationError(
      field,
      `${field} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function isoDate(value, field) {
  const normalized = requiredText(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new IntegrationValidationError(
      field,
      `${field} must use YYYY-MM-DD.`,
    );
  }
  return normalized;
}

function normalizeRole(value, field = "actor.role") {
  const role = String(value ?? "").toUpperCase();
  if (!INTEGRATION_ROLES.includes(role)) {
    throw new IntegrationValidationError(
      field,
      `${field} is invalid.`,
    );
  }
  return role;
}

function normalizeProvider(value, field = "provider") {
  const provider = String(value ?? "").toUpperCase();
  if (!INTEGRATION_PROVIDERS.includes(provider)) {
    throw new IntegrationValidationError(
      field,
      `${field} is invalid.`,
    );
  }
  return provider;
}

function findLocation(registry, tenantId, locationId) {
  if (registry?.tenantId !== tenantId) {
    throw new IntegrationValidationError(
      "tenantId",
      "Import tenant does not match the location registry.",
    );
  }
  const location = (registry?.locations || []).find(
    (row) => row.locationId === locationId,
  );
  if (!location) {
    throw new IntegrationValidationError(
      "locationId",
      "Location does not exist in the tenant registry.",
    );
  }
  if (location.status !== "ACTIVE") {
    throw new IntegrationValidationError(
      "location.status",
      "Location is not active.",
    );
  }
  return location;
}

function assertProviderLocation(location, provider, providerLocationId) {
  if (provider === "MANUAL_ENTRY" || provider === "CSV_UPLOAD") return;
  const expected =
    location.providerLocationMappings?.[provider] || null;
  if (!expected || expected !== providerLocationId) {
    throw new IntegrationValidationError(
      "providerLocationId",
      "Provider location does not match the active application location.",
    );
  }
}

function mappingKey(row) {
  return [
    row.tenantId,
    row.locationId,
    row.provider,
    row.providerItemId,
  ].join(":");
}

function batchIdempotencyKey(payload) {
  return [
    payload.provider,
    payload.tenantId,
    payload.locationId,
    payload.providerEventId,
  ].join(":");
}

function lineIdentity(row) {
  return `${row.orderId}:${row.lineId}`;
}

function totalsFromLines(lines) {
  const fields = [
    "grossSalesCents",
    "discountCents",
    "netSalesCents",
    "taxCents",
    "tipCents",
    "refundCents",
  ];
  const totals = Object.fromEntries(fields.map((field) => [field, 0]));
  for (const line of lines) {
    for (const field of fields) {
      totals[field] += line[field];
    }
  }
  return totals;
}

function effectiveMapping(mappings, payload, line) {
  const candidates = (mappings || [])
    .filter(
      (mapping) =>
        mapping.tenantId === payload.tenantId &&
        mapping.locationId === payload.locationId &&
        mapping.provider === payload.provider &&
        mapping.providerItemId === line.providerItemId &&
        mapping.status !== "UNMAPPED" &&
        String(mapping.effectiveDate || "") <= payload.businessDate,
    )
    .sort(
      (left, right) =>
        Number(right.mappingVersion || 0) -
        Number(left.mappingVersion || 0),
    );
  return candidates[0] || null;
}

function normalizeLine(line, index) {
  const orderId = requiredText(
    line?.orderId,
    `lines.${index}.orderId`,
  );
  const lineId = requiredText(
    line?.lineId,
    `lines.${index}.lineId`,
  );
  const providerItemId = requiredText(
    line?.providerItemId,
    `lines.${index}.providerItemId`,
  );
  const quantity = finite(
    line?.quantity,
    `lines.${index}.quantity`,
    0,
  );
  const grossSalesCents = integer(
    line?.grossSalesCents,
    `lines.${index}.grossSalesCents`,
    0,
  );
  const discountCents = integer(
    line?.discountCents,
    `lines.${index}.discountCents`,
    0,
  );
  const netSalesCents = integer(
    line?.netSalesCents,
    `lines.${index}.netSalesCents`,
  );
  const refundCents = integer(
    line?.refundCents ?? 0,
    `lines.${index}.refundCents`,
    0,
  );
  if (netSalesCents < 0 && refundCents <= 0) {
    throw new IntegrationValidationError(
      "netSalesCents",
      "Negative net sales are allowed only for refund lines.",
    );
  }
  return {
    orderId,
    lineId,
    lineKey: `${orderId}:${lineId}`,
    providerItemId,
    providerItemName: requiredText(
      line?.providerItemName,
      `lines.${index}.providerItemName`,
    ),
    quantity,
    grossSalesCents,
    discountCents,
    netSalesCents,
    taxCents: integer(
      line?.taxCents ?? 0,
      `lines.${index}.taxCents`,
      0,
    ),
    tipCents: integer(
      line?.tipCents ?? 0,
      `lines.${index}.tipCents`,
      0,
    ),
    refundCents,
    voided: line?.voided === true,
  };
}

export class IntegrationValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "IntegrationValidationError";
    this.field = field;
  }
}

export function authorizeIntegrationAction(contract, input) {
  const role = normalizeRole(input?.actor?.role);
  const action = requiredText(input?.action, "action");
  const actorTenantId = requiredText(
    input?.actor?.tenantId,
    "actor.tenantId",
  );
  const actorLocationIds = Array.isArray(
    input?.actor?.locationIds,
  )
    ? input.actor.locationIds.map(String)
    : [];
  const tenantId = requiredText(input?.tenantId, "tenantId");
  const locationId = requiredText(
    input?.locationId,
    "locationId",
  );
  if (actorTenantId !== tenantId) {
    return {
      allowed: false,
      reason: "CROSS_TENANT",
      role,
      action,
      tenantId,
      locationId,
    };
  }
  if (
    !["ADMIN", "OWNER"].includes(role) &&
    !actorLocationIds.includes(locationId)
  ) {
    return {
      allowed: false,
      reason: "LOCATION_DENIED",
      role,
      action,
      tenantId,
      locationId,
    };
  }
  const grants = contract?.authorization?.[role] || [];
  if (!(grants.includes("*") || grants.includes(action))) {
    return {
      allowed: false,
      reason: "ROLE_DENIED",
      role,
      action,
      tenantId,
      locationId,
    };
  }
  return {
    allowed: true,
    reason: "AUTHORIZED",
    role,
    action,
    tenantId,
    locationId,
  };
}

export function evaluateConnectionHealth(
  connectionInput,
  contract,
  nowInput,
) {
  const connection = clone(connectionInput || {});
  const now = isoTimestamp(nowInput, "now");
  const provider = normalizeProvider(connection.provider);
  const status = String(connection.status || "").toUpperCase();
  if (status === "PAUSED") {
    return {
      healthVersion: POS_DATA_INTEGRATIONS_VERSION,
      connectionId: connection.connectionId,
      provider,
      status: "PAUSED",
      automaticImportAllowed: false,
      manualFallbackAvailable:
        contract.connectionHealth.manualFallbackRemainsAvailable,
      ageMinutes: null,
      blockers: ["connection paused"],
    };
  }
  const lastSuccess = isoTimestamp(
    connection.lastSuccessfulSyncAt,
    "lastSuccessfulSyncAt",
  );
  const ageMinutes =
    (new Date(now).getTime() -
      new Date(lastSuccess).getTime()) /
    60_000;
  let derivedStatus = "FAILED";
  if (
    connection.credentialPresent === true &&
    connection.providerEnvironment === "PRODUCTION" &&
    ageMinutes <=
      contract.connectionHealth.healthyMaximumAgeMinutes
  ) {
    derivedStatus = "HEALTHY";
  } else if (
    connection.credentialPresent === true &&
    ageMinutes <=
      contract.connectionHealth.degradedMaximumAgeMinutes
  ) {
    derivedStatus = "DEGRADED";
  }
  const blockers = [];
  if (connection.credentialPresent !== true) {
    blockers.push("credential missing");
  }
  if (connection.providerEnvironment !== "PRODUCTION") {
    blockers.push("provider environment is not production");
  }
  if (derivedStatus === "FAILED" && !connection.lastErrorCode) {
    blockers.push("failure error code missing");
  }
  return {
    healthVersion: POS_DATA_INTEGRATIONS_VERSION,
    connectionId: connection.connectionId,
    tenantId: connection.tenantId,
    locationId: connection.locationId,
    provider,
    status: derivedStatus,
    automaticImportAllowed: derivedStatus === "HEALTHY",
    manualFallbackAvailable:
      contract.connectionHealth.manualFallbackRemainsAvailable,
    ageMinutes: Math.round(ageMinutes * 100) / 100,
    blockers,
  };
}

export function assertAutomaticImportAllowed(connectionHealth) {
  if (connectionHealth?.status === "PAUSED") {
    throw new IntegrationValidationError(
      "connection.status",
      "Paused connection blocks automatic import.",
    );
  }
  if (connectionHealth?.automaticImportAllowed !== true) {
    throw new IntegrationValidationError(
      "connection.status",
      "Connection is not healthy enough for automatic import.",
    );
  }
  return true;
}

export function normalizeSalesPayload(
  payloadInput,
  registry,
) {
  const payload = clone(payloadInput || {});
  const provider = normalizeProvider(payload.provider);
  const tenantId = requiredText(payload.tenantId, "tenantId");
  const locationId = requiredText(
    payload.locationId,
    "locationId",
  );
  const location = findLocation(
    registry,
    tenantId,
    locationId,
  );
  const providerLocationId = requiredText(
    payload.providerLocationId,
    "providerLocationId",
  );
  assertProviderLocation(
    location,
    provider,
    providerLocationId,
  );
  const businessDate = isoDate(
    payload.businessDate,
    "businessDate",
  );
  const receivedAt = isoTimestamp(
    payload.receivedAt,
    "receivedAt",
  );
  if (
    businessDate >
    new Date(receivedAt).toISOString().slice(0, 10)
  ) {
    throw new IntegrationValidationError(
      "businessDate",
      "Business date cannot be later than the received date.",
    );
  }
  const currency = requiredText(
    payload.currency,
    "currency",
  ).toUpperCase();
  if (currency !== "USD") {
    throw new IntegrationValidationError(
      "currency",
      "Only USD is supported.",
    );
  }
  const lines = (payload.lines || []).map(normalizeLine);
  if (!lines.length) {
    throw new IntegrationValidationError(
      "lines",
      "At least one sales line is required.",
    );
  }
  const lineKeys = lines.map(lineIdentity);
  if (new Set(lineKeys).size !== lineKeys.length) {
    throw new IntegrationValidationError(
      "lines",
      "Duplicate order/line identity is forbidden.",
    );
  }
  const normalized = {
    payloadVersion: "PTT_NORMALIZED_SALES_PAYLOAD_12_2_0",
    provider,
    providerEventId: requiredText(
      payload.providerEventId,
      "providerEventId",
    ),
    tenantId,
    locationId,
    providerLocationId,
    businessDate,
    currency,
    receivedAt,
    sourceTotalNetSalesCents: integer(
      payload.sourceTotalNetSalesCents,
      "sourceTotalNetSalesCents",
    ),
    sourceOrderCount: integer(
      payload.sourceOrderCount,
      "sourceOrderCount",
      0,
    ),
    manualReason: payload.manualReason || null,
    sourceDocumentReference:
      payload.sourceDocumentReference || null,
    enteredBy: payload.enteredBy || null,
    approvedBy: payload.approvedBy || null,
    lines,
    totals: totalsFromLines(lines),
  };
  return {
    ...normalized,
    idempotencyKey: batchIdempotencyKey(normalized),
    sourcePayloadHash: sha256(normalized),
  };
}

export function createImportState() {
  return {
    stateVersion: POS_DATA_INTEGRATIONS_VERSION,
    batchesByIdempotencyKey: {},
  };
}

export function ingestSalesBatch(
  stateInput,
  payloadInput,
  registry,
) {
  const state = clone(stateInput || createImportState());
  state.batchesByIdempotencyKey ||= {};
  const normalized = normalizeSalesPayload(
    payloadInput,
    registry,
  );
  const existing =
    state.batchesByIdempotencyKey[normalized.idempotencyKey];
  if (existing) {
    return {
      state,
      batch: clone(existing),
      duplicate: true,
    };
  }
  const core = {
    batchVersion: "PTT_SALES_IMPORT_BATCH_12_2_0",
    batchId: `sales-batch-${sha256(normalized).slice(0, 18)}`,
    ...normalized,
    status:
      normalized.provider === "MANUAL_ENTRY"
        ? "MANUAL"
        : "VALIDATED",
    attemptCount: 1,
    mapping: null,
    reconciliation: null,
    reportingEligible: false,
    learningEligible: false,
  };
  state.batchesByIdempotencyKey[
    normalized.idempotencyKey
  ] = core;
  return {
    state,
    batch: clone(core),
    duplicate: false,
  };
}

export function mapSalesBatch(batchInput, mappings) {
  const batch = clone(batchInput);
  const mappedLines = [];
  const unmappedLines = [];
  const ignoredLines = [];
  for (const line of batch.lines || []) {
    const mapping = effectiveMapping(mappings, batch, line);
    if (!mapping) {
      unmappedLines.push({
        ...line,
        mappingStatus: "UNMAPPED",
        quarantineReason: "NO_ACTIVE_MAPPING",
      });
      continue;
    }
    const mapped = {
      ...line,
      mappingId: mapping.mappingId,
      mappingVersion: mapping.mappingVersion,
      targetCategory: mapping.targetCategory,
      productCode: mapping.productCode,
      cookedLbPerUnit: Number(
        mapping.cookedLbPerUnit || 0,
      ),
      cookedLbEquivalent:
        Number(line.quantity) *
        Number(mapping.cookedLbPerUnit || 0),
      mappingStatus:
        mapping.targetCategory === "IGNORED" ||
        mapping.status === "IGNORED"
          ? "IGNORED"
          : "ACTIVE",
    };
    if (mapped.mappingStatus === "IGNORED") {
      ignoredLines.push(mapped);
    } else {
      mappedLines.push(mapped);
    }
  }
  const mappedNetSalesCents = mappedLines.reduce(
    (sum, row) => sum + row.netSalesCents,
    0,
  );
  const unmappedNetSalesCents = unmappedLines.reduce(
    (sum, row) => sum + row.netSalesCents,
    0,
  );
  const ignoredNetSalesCents = ignoredLines.reduce(
    (sum, row) => sum + row.netSalesCents,
    0,
  );
  batch.mapping = {
    mappingVersion: "PTT_SALES_MAPPING_RESULT_12_2_0",
    mappedLines,
    unmappedLines,
    ignoredLines,
    mappedNetSalesCents,
    unmappedNetSalesCents,
    ignoredNetSalesCents,
    totalClassifiedNetSalesCents:
      mappedNetSalesCents +
      unmappedNetSalesCents +
      ignoredNetSalesCents,
  };
  batch.status = unmappedLines.length
    ? "PARTIAL"
    : batch.status;
  batch.learningEligible =
    unmappedLines.length === 0 &&
    ignoredLines.length === 0 &&
    batch.status === "RECONCILED";
  return batch;
}

export function reconcileSalesBatch(
  batchInput,
  contract,
  input,
) {
  const batch = clone(batchInput);
  if (!batch.mapping) {
    throw new IntegrationValidationError(
      "batch.mapping",
      "Batch must be mapped before reconciliation.",
    );
  }
  const importedNetSalesCents =
    batch.totals.netSalesCents;
  const sourceDifferenceCents =
    importedNetSalesCents -
    batch.sourceTotalNetSalesCents;
  const classificationDifferenceCents =
    batch.mapping.totalClassifiedNetSalesCents -
    importedNetSalesCents;
  const sourcePassed =
    Math.abs(sourceDifferenceCents) <=
    contract.reconciliation.maximumDifferenceCents;
  const classificationPassed =
    classificationDifferenceCents === 0;
  const actorRole = normalizeRole(input?.actor?.role);
  if (
    !contract.reconciliation.approvalRoles.includes(
      actorRole,
    )
  ) {
    throw new IntegrationValidationError(
      "actor.role",
      "Actor cannot approve reconciliation.",
    );
  }
  const approvedAt = isoTimestamp(
    input?.approvedAt,
    "approvedAt",
  );
  const status =
    sourcePassed && classificationPassed
      ? batch.mapping.unmappedLines.length
        ? "PARTIAL"
        : "RECONCILED"
      : "FAILED";
  batch.status = status;
  batch.reportingEligible = status === "RECONCILED";
  batch.learningEligible =
    status === "RECONCILED" &&
    batch.mapping.unmappedNetSalesCents === 0 &&
    batch.mapping.ignoredNetSalesCents === 0;
  batch.reconciliation = {
    reconciliationVersion:
      "PTT_SALES_RECONCILIATION_12_2_0",
    importedNetSalesCents,
    sourceNetSalesCents:
      batch.sourceTotalNetSalesCents,
    sourceDifferenceCents,
    classificationDifferenceCents,
    mappedNetSalesCents:
      batch.mapping.mappedNetSalesCents,
    unmappedNetSalesCents:
      batch.mapping.unmappedNetSalesCents,
    ignoredNetSalesCents:
      batch.mapping.ignoredNetSalesCents,
    status,
    approvedBy: {
      userId: requiredText(
        input?.actor?.userId,
        "actor.userId",
      ),
      role: actorRole,
    },
    approvedAt,
    reason: requiredText(input?.reason, "reason"),
  };
  return batch;
}

export function buildDailySalesSummary(batchInput) {
  const batch = clone(batchInput);
  if (!["RECONCILED", "MANUAL"].includes(batch.status)) {
    throw new IntegrationValidationError(
      "batch.status",
      "Daily reporting requires a reconciled or approved manual batch.",
    );
  }
  if (!batch.mapping) {
    throw new IntegrationValidationError(
      "batch.mapping",
      "Mapped lines are required.",
    );
  }
  const categoryNetSalesCents = {};
  const productDemand = {};
  for (const line of batch.mapping.mappedLines) {
    categoryNetSalesCents[line.targetCategory] =
      (categoryNetSalesCents[line.targetCategory] || 0) +
      line.netSalesCents;
    if (line.productCode && PRODUCT_TARGETS.has(line.productCode)) {
      productDemand[line.productCode] ||= {
        quantity: 0,
        cookedLbEquivalent: 0,
        netSalesCents: 0,
      };
      productDemand[line.productCode].quantity +=
        line.quantity;
      productDemand[line.productCode].cookedLbEquivalent +=
        line.cookedLbEquivalent;
      productDemand[line.productCode].netSalesCents +=
        line.netSalesCents;
    }
  }
  const core = {
    summaryVersion: "PTT_DAILY_POS_SUMMARY_12_2_0",
    batchId: batch.batchId,
    tenantId: batch.tenantId,
    locationId: batch.locationId,
    businessDate: batch.businessDate,
    provider: batch.provider,
    currency: batch.currency,
    orderCount: batch.sourceOrderCount,
    lineCount: batch.lines.length,
    grossSalesCents: batch.totals.grossSalesCents,
    discountCents: batch.totals.discountCents,
    netSalesCents: batch.totals.netSalesCents,
    taxCents: batch.totals.taxCents,
    tipCents: batch.totals.tipCents,
    refundCents: batch.totals.refundCents,
    categoryNetSalesCents,
    productDemand,
    unmappedNetSalesCents:
      batch.mapping.unmappedNetSalesCents,
    ignoredNetSalesCents:
      batch.mapping.ignoredNetSalesCents,
    sourcePayloadHash: batch.sourcePayloadHash,
  };
  return {
    ...core,
    summaryId: `daily-sales-${sha256(core).slice(0, 18)}`,
  };
}

export function compareActualSalesToForecast(
  summaryInput,
  forecastInput,
) {
  const summary = clone(summaryInput);
  const forecast = clone(forecastInput);
  for (const field of [
    "tenantId",
    "locationId",
    "businessDate",
  ]) {
    if (summary[field] !== forecast[field]) {
      throw new IntegrationValidationError(
        field,
        `Forecast ${field} does not match sales summary.`,
      );
    }
  }
  const forecastNetSalesCents = integer(
    forecast.forecastNetSalesCents,
    "forecastNetSalesCents",
    0,
  );
  const varianceCents =
    summary.netSalesCents - forecastNetSalesCents;
  const variancePercent =
    forecastNetSalesCents === 0
      ? null
      : (varianceCents / forecastNetSalesCents) * 100;
  return {
    comparisonVersion:
      "PTT_ACTUAL_VS_FORECAST_12_2_0",
    tenantId: summary.tenantId,
    locationId: summary.locationId,
    businessDate: summary.businessDate,
    summaryId: summary.summaryId,
    actualNetSalesCents: summary.netSalesCents,
    forecastNetSalesCents,
    varianceCents,
    variancePercent,
  };
}

export function createForecastLearningInput(
  batchInput,
  summaryInput,
  forecastInput,
) {
  const batch = clone(batchInput);
  const summary = clone(summaryInput);
  const forecast = clone(forecastInput);
  if (batch.status !== "RECONCILED") {
    throw new IntegrationValidationError(
      "batch.status",
      "Forecast learning requires a reconciled batch.",
    );
  }
  if (batch.mapping?.unmappedNetSalesCents !== 0) {
    throw new IntegrationValidationError(
      "unmappedNetSalesCents",
      "Unmapped sales must be zero before forecast learning.",
    );
  }
  if (batch.mapping?.ignoredNetSalesCents !== 0) {
    throw new IntegrationValidationError(
      "ignoredNetSalesCents",
      "Ignored sales cannot become forecast demand.",
    );
  }
  const comparison = compareActualSalesToForecast(
    summary,
    forecast,
  );
  const productInputs = Object.entries(
    summary.productDemand,
  ).map(([productCode, actual]) => {
    const forecastCookedLb = Number(
      forecast.forecastProductCookedLb?.[productCode] || 0,
    );
    return {
      productCode,
      actualQuantity: actual.quantity,
      actualCookedLbEquivalent:
        actual.cookedLbEquivalent,
      forecastCookedLb,
      varianceCookedLb:
        actual.cookedLbEquivalent - forecastCookedLb,
      proposedObservationRatio:
        forecastCookedLb > 0
          ? actual.cookedLbEquivalent / forecastCookedLb
          : null,
    };
  });
  const core = {
    learningInputVersion:
      "PTT_FORECAST_LEARNING_INPUT_12_2_0",
    tenantId: summary.tenantId,
    locationId: summary.locationId,
    businessDate: summary.businessDate,
    sourceBatchIds: [batch.batchId],
    sourceHash: sha256({
      batch: batch.sourcePayloadHash,
      summary: summary.summaryId,
      forecast,
    }),
    salesComparison: comparison,
    productInputs,
    automaticFactorChangeApplied: false,
    managerApprovalRequired: true,
  };
  return {
    ...core,
    learningInputId: `forecast-learning-${sha256(core).slice(
      0,
      18,
    )}`,
  };
}

export function scheduleFailedBatchRetry(
  batchInput,
  contract,
  input,
) {
  const batch = clone(batchInput);
  if (!["FAILED", "RETRY_PENDING"].includes(batch.status)) {
    throw new IntegrationValidationError(
      "batch.status",
      "Only failed or pending batches can be retried.",
    );
  }
  const attemptCount = integer(
    batch.attemptCount,
    "attemptCount",
    0,
  );
  const requestedAt = isoTimestamp(
    input?.requestedAt,
    "requestedAt",
  );
  const nextAttemptCount = attemptCount + 1;
  const maximumAttempts =
    contract.retryRecovery.maximumAttempts;
  const exhausted = nextAttemptCount > maximumAttempts;
  return {
    ...batch,
    status: exhausted ? "FAILED" : "RETRY_PENDING",
    attemptCount: exhausted
      ? attemptCount
      : nextAttemptCount,
    idempotencyKey: batch.idempotencyKey,
    sameIdempotencyKey: true,
    protectedLineKeys: [
      ...new Set(batch.successfulLineKeys || []),
    ],
    protectedLineCount: new Set(
      batch.successfulLineKeys || [],
    ).size,
    lastErrorCode: requiredText(
      input?.lastErrorCode,
      "lastErrorCode",
    ),
    lastErrorMessage: requiredText(
      input?.lastErrorMessage,
      "lastErrorMessage",
    ),
    lastAttemptAt: requestedAt,
    nextRetryAt: exhausted
      ? null
      : isoTimestamp(input?.nextRetryAt, "nextRetryAt"),
    manualEscalationRequired: exhausted,
  };
}

export function createManualSalesBatch(
  payloadInput,
  registry,
  mappings,
  contract,
  existingBatches = [],
) {
  const payload = clone(payloadInput);
  if (!payload.manualReason) {
    throw new IntegrationValidationError(
      "manualReason",
      "Manual fallback requires a reason.",
    );
  }
  if (!payload.sourceDocumentReference) {
    throw new IntegrationValidationError(
      "sourceDocumentReference",
      "Manual fallback requires a source document reference.",
    );
  }
  if (
    (existingBatches || []).some(
      (batch) =>
        batch.tenantId === payload.tenantId &&
        batch.locationId === payload.locationId &&
        batch.businessDate === payload.businessDate &&
        batch.provider !== "MANUAL_ENTRY",
    )
  ) {
    throw new IntegrationValidationError(
      "providerEventId",
      "Manual entry cannot overwrite an existing provider batch.",
    );
  }
  const enteredRole = normalizeRole(
    payload.enteredBy?.role,
    "enteredBy.role",
  );
  if (!contract.manualFallback.roles.includes(enteredRole)) {
    throw new IntegrationValidationError(
      "enteredBy.role",
      "Actor cannot create manual fallback entries.",
    );
  }
  if (
    Number(payload.sourceTotalNetSalesCents) >
      contract.manualFallback
        .managerApprovalRequiredAboveCents &&
    !payload.approvedBy
  ) {
    throw new IntegrationValidationError(
      "approvedBy",
      "Large manual entry requires manager approval.",
    );
  }
  const imported = ingestSalesBatch(
    createImportState(),
    payload,
    registry,
  ).batch;
  let mapped = mapSalesBatch(imported, mappings);
  mapped.status = "MANUAL";
  mapped.reportingEligible = true;
  mapped.learningEligible = false;
  mapped.manualAudit = {
    auditVersion: "PTT_MANUAL_SALES_AUDIT_12_2_0",
    reason: payload.manualReason,
    sourceDocumentReference:
      payload.sourceDocumentReference,
    enteredBy: clone(payload.enteredBy),
    approvedBy: clone(payload.approvedBy),
    enteredAt: payload.receivedAt,
  };
  return mapped;
}

export function createSupplierCostSnapshot(
  rowsInput,
  priorCostsInput,
  contract,
) {
  const rows = clone(rowsInput || []);
  const priorCosts = clone(priorCostsInput || []);
  const unique = new Map();
  const duplicateRows = [];
  for (const [index, row] of rows.entries()) {
    const normalized = {
      tenantId: requiredText(
        row.tenantId,
        `rows.${index}.tenantId`,
      ),
      locationId: requiredText(
        row.locationId,
        `rows.${index}.locationId`,
      ),
      vendorId: requiredText(
        row.vendorId,
        `rows.${index}.vendorId`,
      ),
      vendorItemId: requiredText(
        row.vendorItemId,
        `rows.${index}.vendorItemId`,
      ),
      productCode: requiredText(
        row.productCode,
        `rows.${index}.productCode`,
      ).toUpperCase(),
      purchaseUnit: requiredText(
        row.purchaseUnit,
        `rows.${index}.purchaseUnit`,
      ),
      packSize: requiredText(
        row.packSize,
        `rows.${index}.packSize`,
      ),
      totalCostCents: integer(
        row.totalCostCents,
        `rows.${index}.totalCostCents`,
        1,
      ),
      effectiveAt: isoTimestamp(
        row.effectiveAt,
        `rows.${index}.effectiveAt`,
      ),
      sourceFileId: requiredText(
        row.sourceFileId,
        `rows.${index}.sourceFileId`,
      ),
    };
    const idempotencyKey = [
      normalized.tenantId,
      normalized.locationId,
      normalized.vendorId,
      normalized.vendorItemId,
      normalized.effectiveAt,
    ].join(":");
    if (unique.has(idempotencyKey)) {
      duplicateRows.push({
        idempotencyKey,
        duplicate: true,
      });
      continue;
    }
    unique.set(idempotencyKey, {
      ...normalized,
      idempotencyKey,
      costRecordId: `supplier-cost-${sha256(normalized).slice(
        0,
        18,
      )}`,
    });
  }
  const records = [...unique.values()];
  const alerts = [];
  for (const record of records) {
    const previous = priorCosts
      .filter(
        (row) =>
          row.tenantId === record.tenantId &&
          row.locationId === record.locationId &&
          row.vendorId === record.vendorId &&
          row.vendorItemId === record.vendorItemId &&
          String(row.effectiveAt) < record.effectiveAt,
      )
      .sort((left, right) =>
        String(right.effectiveAt).localeCompare(
          String(left.effectiveAt),
        ),
      )[0];
    if (!previous) continue;
    const changePercent =
      ((record.totalCostCents -
        previous.totalCostCents) /
        previous.totalCostCents) *
      100;
    if (
      Math.abs(changePercent) >=
      contract.supplierCost.costChangeAlertPercent
    ) {
      alerts.push({
        alertVersion:
          "PTT_SUPPLIER_COST_ALERT_12_2_0",
        tenantId: record.tenantId,
        locationId: record.locationId,
        vendorItemId: record.vendorItemId,
        priorCostCents: previous.totalCostCents,
        currentCostCents: record.totalCostCents,
        changePercent,
      });
    }
  }
  const core = {
    snapshotVersion:
      "PTT_SUPPLIER_COST_SNAPSHOT_12_2_0",
    provider: contract.supplierCost.provider,
    itemCount: records.length,
    records,
    duplicateRows,
    duplicate: duplicateRows.length > 0,
    alerts,
    alertCount: alerts.length,
    automaticMenuPriceChangeApplied: false,
  };
  return {
    ...core,
    snapshotId: `supplier-snapshot-${sha256(core).slice(
      0,
      18,
    )}`,
  };
}

export function consolidateLocationSalesSummaries(
  summariesInput,
  tenantIdInput,
) {
  const tenantId = requiredText(tenantIdInput, "tenantId");
  const summaries = clone(summariesInput || []);
  const locations = new Set();
  const dates = new Set();
  for (const summary of summaries) {
    if (summary.tenantId !== tenantId) {
      throw new IntegrationValidationError(
        "tenantId",
        "Summary tenant does not match consolidated tenant.",
      );
    }
    locations.add(summary.locationId);
    dates.add(summary.businessDate);
  }
  if (dates.size !== 1) {
    throw new IntegrationValidationError(
      "businessDate",
      "Consolidation requires one business date.",
    );
  }
  const totalNetSalesCents = summaries.reduce(
    (sum, row) => sum + row.netSalesCents,
    0,
  );
  return {
    consolidationVersion:
      "PTT_MULTI_LOCATION_SALES_CONSOLIDATION_12_2_0",
    tenantId,
    businessDate: [...dates][0],
    locationCount: locations.size,
    totalNetSalesCents,
    locations: summaries.map((summary) => ({
      locationId: summary.locationId,
      summaryId: summary.summaryId,
      netSalesCents: summary.netSalesCents,
    })),
  };
}

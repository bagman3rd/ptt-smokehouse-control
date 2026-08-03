import crypto from "node:crypto";

export const MULTI_LOCATION_VERSION = "PTT_MULTI_LOCATION_12_1_0";

export const MULTI_LOCATION_ROLES = Object.freeze([
  "ADMIN",
  "OWNER",
  "KM",
  "PITMASTER",
  "KC",
  "VIEWER",
]);

export const REQUIRED_LOCATION_PRODUCTS = Object.freeze([
  "BRISKET",
  "PORK",
  "RIBS",
  "CHICKEN",
]);

export const ACTIVE_OPERATIONAL_LOCATION_STATUSES = Object.freeze([
  "ACTIVE",
]);

const OWNER_ROLES = new Set(["ADMIN", "OWNER"]);
const LOCATION_STATUSES = new Set([
  "DRAFT",
  "ONBOARDING",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATION_PENDING",
  "INACTIVE",
]);
const TRANSFER_STATUSES = new Set([
  "DRAFT",
  "APPROVED",
  "IN_TRANSIT",
  "RECEIVED",
  "RECEIVED_WITH_VARIANCE",
  "CANCELLED",
]);
const OPERATIONAL_RECORD_TYPES = new Set([
  "MASTER_DATA",
  "FORECAST",
  "PRODUCTION_PLAN",
  "TODAY_OPERATIONS",
  "EOD",
  "INVENTORY",
  "REPORTING",
  "NOTIFICATION_RULE",
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
    throw new MultiLocationValidationError(
      field,
      `${field} is required.`,
    );
  }
  return normalized;
}

function finite(value, field, minimum = undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new MultiLocationValidationError(
      field,
      `${field} must be a finite number.`,
    );
  }
  if (minimum !== undefined && number < minimum) {
    throw new MultiLocationValidationError(
      field,
      `${field} must be at least ${minimum}.`,
    );
  }
  return number;
}

function timestamp(value, field) {
  const normalized = requiredText(value, field);
  if (Number.isNaN(new Date(normalized).getTime())) {
    throw new MultiLocationValidationError(
      field,
      `${field} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function normalizeRole(value, field = "actor.role") {
  const role = String(value ?? "").toUpperCase();
  if (!MULTI_LOCATION_ROLES.includes(role)) {
    throw new MultiLocationValidationError(
      field,
      `${field} is invalid.`,
    );
  }
  return role;
}

function normalizeRegistry(input) {
  const tenant = clone(input?.tenant || {});
  tenant.tenantId = requiredText(tenant.tenantId, "tenant.tenantId");
  tenant.name = requiredText(tenant.name, "tenant.name");

  const locations = (input?.locations || []).map((location, index) => {
    const row = clone(location);
    row.locationId = requiredText(
      row.locationId,
      `locations.${index}.locationId`,
    );
    row.tenantId = requiredText(
      row.tenantId,
      `locations.${index}.tenantId`,
    );
    if (row.tenantId !== tenant.tenantId) {
      throw new MultiLocationValidationError(
        `locations.${index}.tenantId`,
        "Every location must belong to the registry tenant.",
      );
    }
    row.status = String(row.status || "").toUpperCase();
    if (!LOCATION_STATUSES.has(row.status)) {
      throw new MultiLocationValidationError(
        `locations.${index}.status`,
        "Location status is invalid.",
      );
    }
    return row;
  });

  const locationIds = new Set();
  for (const location of locations) {
    if (locationIds.has(location.locationId)) {
      throw new MultiLocationValidationError(
        "locations",
        `Duplicate location ID: ${location.locationId}.`,
      );
    }
    locationIds.add(location.locationId);
  }

  const memberships = (input?.memberships || []).map(
    (membership, index) => {
      const row = clone(membership);
      row.membershipId = requiredText(
        row.membershipId,
        `memberships.${index}.membershipId`,
      );
      row.tenantId = requiredText(
        row.tenantId,
        `memberships.${index}.tenantId`,
      );
      row.userId = requiredText(
        row.userId,
        `memberships.${index}.userId`,
      );
      row.role = normalizeRole(
        row.role,
        `memberships.${index}.role`,
      );
      row.status = String(row.status || "").toUpperCase();
      row.scope = String(row.scope || "").toUpperCase();
      row.locationIds = Array.isArray(row.locationIds)
        ? [...new Set(row.locationIds.map(String))]
        : [];
      if (row.tenantId !== tenant.tenantId) {
        throw new MultiLocationValidationError(
          `memberships.${index}.tenantId`,
          "Every membership must belong to the registry tenant.",
        );
      }
      if (
        !["ALL_LOCATIONS", "ASSIGNED_LOCATIONS"].includes(
          row.scope,
        )
      ) {
        throw new MultiLocationValidationError(
          `memberships.${index}.scope`,
          "Membership scope is invalid.",
        );
      }
      for (const locationId of row.locationIds) {
        if (!locationIds.has(locationId)) {
          throw new MultiLocationValidationError(
            `memberships.${index}.locationIds`,
            `Unknown assigned location: ${locationId}.`,
          );
        }
      }
      return row;
    },
  );

  const products = (input?.products || []).map((product, index) => {
    const row = clone(product);
    row.tenantId = requiredText(
      row.tenantId,
      `products.${index}.tenantId`,
    );
    row.locationId = requiredText(
      row.locationId,
      `products.${index}.locationId`,
    );
    row.productCode = requiredText(
      row.productCode,
      `products.${index}.productCode`,
    ).toUpperCase();
    if (
      row.tenantId !== tenant.tenantId ||
      !locationIds.has(row.locationId)
    ) {
      throw new MultiLocationValidationError(
        `products.${index}.locationId`,
        "Product configuration must reference this tenant and a known location.",
      );
    }
    return row;
  });

  const smokers = (input?.smokers || []).map((smoker, index) => {
    const row = clone(smoker);
    row.tenantId = requiredText(
      row.tenantId,
      `smokers.${index}.tenantId`,
    );
    row.locationId = requiredText(
      row.locationId,
      `smokers.${index}.locationId`,
    );
    row.smokerId = requiredText(
      row.smokerId,
      `smokers.${index}.smokerId`,
    );
    if (
      row.tenantId !== tenant.tenantId ||
      !locationIds.has(row.locationId)
    ) {
      throw new MultiLocationValidationError(
        `smokers.${index}.locationId`,
        "Smoker configuration must reference this tenant and a known location.",
      );
    }
    return row;
  });

  return {
    tenant,
    locations,
    memberships,
    products,
    smokers,
  };
}

function membershipCanAccessLocation(membership, locationId) {
  return (
    membership.scope === "ALL_LOCATIONS" ||
    membership.locationIds.includes(locationId)
  );
}

function resolveMembership(registry, actor) {
  const userId = requiredText(actor?.userId, "actor.userId");
  const tenantId = requiredText(actor?.tenantId, "actor.tenantId");
  if (tenantId !== registry.tenant.tenantId) {
    throw new MultiLocationValidationError(
      "tenantId",
      "Actor tenant does not match the requested registry tenant.",
    );
  }
  const membership = registry.memberships.find(
    (row) => row.userId === userId && row.tenantId === tenantId,
  );
  if (!membership) {
    throw new MultiLocationValidationError(
      "membership",
      "No membership exists for this user and tenant.",
    );
  }
  if (membership.status !== "ACTIVE") {
    throw new MultiLocationValidationError(
      "membership.status",
      "Membership is not active.",
    );
  }
  return membership;
}

function findLocation(registry, locationId, field = "locationId") {
  const normalized = requiredText(locationId, field);
  const location = registry.locations.find(
    (row) => row.locationId === normalized,
  );
  if (!location) {
    throw new MultiLocationValidationError(
      field,
      "Location was not found in this tenant.",
    );
  }
  return location;
}

function requireOperationalLocation(location, field = "location.status") {
  if (!ACTIVE_OPERATIONAL_LOCATION_STATUSES.includes(location.status)) {
    throw new MultiLocationValidationError(
      field,
      `Location ${location.locationId} is not active for operations.`,
    );
  }
}

function actionAllowed(contract, role, action) {
  const grants = contract?.authorization?.[role] || [];
  return grants.includes("*") || grants.includes(action);
}

function actorForAction(registry, actorInput) {
  const membership = resolveMembership(registry, actorInput);
  return {
    userId: membership.userId,
    name: membership.name,
    role: membership.role,
    tenantId: membership.tenantId,
    membershipId: membership.membershipId,
    scope: membership.scope,
    locationIds: membership.locationIds,
  };
}

function itemMap(items, field) {
  const output = new Map();
  for (const [index, item] of (items || []).entries()) {
    const productCode = requiredText(
      item?.productCode,
      `${field}.${index}.productCode`,
    ).toUpperCase();
    const quantityCookedLb = finite(
      item?.quantityCookedLb,
      `${field}.${index}.quantityCookedLb`,
      0.001,
    );
    if (output.has(productCode)) {
      throw new MultiLocationValidationError(
        field,
        `Duplicate transfer product: ${productCode}.`,
      );
    }
    output.set(productCode, {
      productCode,
      quantityCookedLb,
      lotIds: Array.isArray(item?.lotIds)
        ? [...new Set(item.lotIds.map(String))]
        : [],
    });
  }
  if (!output.size) {
    throw new MultiLocationValidationError(
      field,
      "At least one transfer item is required.",
    );
  }
  return output;
}

function idempotentResult(record, commandId, eventType) {
  const existing = (record.commandHistory || []).find(
    (row) =>
      row.commandId === commandId && row.eventType === eventType,
  );
  if (!existing) return null;
  return {
    record: clone(record),
    duplicate: true,
    event: clone(existing),
  };
}

function appendCommand(record, event) {
  const updated = clone(record);
  updated.commandHistory ||= [];
  updated.commandHistory.push(event);
  updated.updatedAt = event.occurredAt;
  return updated;
}

function locationMetricsRow(input, index) {
  const row = clone(input);
  row.tenantId = requiredText(
    row.tenantId,
    `metrics.${index}.tenantId`,
  );
  row.locationId = requiredText(
    row.locationId,
    `metrics.${index}.locationId`,
  );
  const fields = [
    "sales",
    "foodSales",
    "barSales",
    "forecastCookedLb",
    "actualUsageCookedLb",
    "wasteCookedLb",
    "endingInventoryCookedLb",
    "completedLoads",
    "adherentLoads",
    "transferInCookedLb",
    "transferOutCookedLb",
  ];
  for (const field of fields) {
    row[field] = finite(
      row[field] ?? 0,
      `metrics.${index}.${field}`,
      0,
    );
  }
  return row;
}

export class MultiLocationValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "MultiLocationValidationError";
    this.field = field;
  }
}

export function resolveLocationContext(
  registryInput,
  actorInput,
  requestedLocationId = null,
) {
  const registry = normalizeRegistry(registryInput);
  const membership = resolveMembership(registry, actorInput);
  const accessibleLocations = registry.locations.filter(
    (location) =>
      location.tenantId === membership.tenantId &&
      location.status === "ACTIVE" &&
      membershipCanAccessLocation(
        membership,
        location.locationId,
      ),
  );

  if (!requestedLocationId) {
    return {
      contextVersion: MULTI_LOCATION_VERSION,
      tenantId: membership.tenantId,
      userId: membership.userId,
      membershipId: membership.membershipId,
      role: membership.role,
      requestedLocationId: null,
      activeLocationId: null,
      selectionRequired: true,
      accessibleLocations: accessibleLocations.map((location) => ({
        locationId: location.locationId,
        name: location.name,
        code: location.code,
        timezone: location.timezone,
        status: location.status,
      })),
    };
  }

  const location = findLocation(
    registry,
    requestedLocationId,
    "locationId",
  );
  if (location.tenantId !== membership.tenantId) {
    throw new MultiLocationValidationError(
      "tenantId",
      "Location tenant does not match actor tenant.",
    );
  }
  requireOperationalLocation(location);
  if (!membershipCanAccessLocation(membership, location.locationId)) {
    throw new MultiLocationValidationError(
      "locationId",
      "Membership does not grant access to this location.",
    );
  }

  return {
    contextVersion: MULTI_LOCATION_VERSION,
    tenantId: membership.tenantId,
    userId: membership.userId,
    membershipId: membership.membershipId,
    role: membership.role,
    requestedLocationId: location.locationId,
    activeLocationId: location.locationId,
    selectionRequired: false,
    location: clone(location),
    accessibleLocations: accessibleLocations.map((item) => ({
      locationId: item.locationId,
      name: item.name,
      code: item.code,
      timezone: item.timezone,
      status: item.status,
    })),
  };
}

export function authorizeLocationAction(
  registryInput,
  contract,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const context = resolveLocationContext(
    registry,
    input?.actor,
    input?.locationId,
  );
  const action = requiredText(input?.action, "action");
  if (!actionAllowed(contract, context.role, action)) {
    return {
      allowed: false,
      reason: "ROLE_DENIED",
      tenantId: context.tenantId,
      locationId: context.activeLocationId,
      userId: context.userId,
      role: context.role,
      action,
    };
  }
  return {
    allowed: true,
    reason: "AUTHORIZED",
    tenantId: context.tenantId,
    locationId: context.activeLocationId,
    userId: context.userId,
    role: context.role,
    action,
  };
}

export function createLocationSwitchRecord(
  registryInput,
  contract,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const fromLocationId = input?.fromLocationId
    ? requiredText(input.fromLocationId, "fromLocationId")
    : null;
  const toContext = resolveLocationContext(
    registry,
    input?.actor,
    input?.toLocationId,
  );
  const authorization = authorizeLocationAction(
    registry,
    contract,
    {
      actor: input?.actor,
      locationId: input?.toLocationId,
      action: "location:switch",
    },
  );
  if (!authorization.allowed) {
    throw new MultiLocationValidationError(
      "actor.role",
      "Actor is not authorized to switch locations.",
    );
  }
  if (fromLocationId) {
    const from = findLocation(
      registry,
      fromLocationId,
      "fromLocationId",
    );
    if (from.tenantId !== toContext.tenantId) {
      throw new MultiLocationValidationError(
        "tenantId",
        "Location switch cannot cross tenants.",
      );
    }
  }
  const occurredAt = timestamp(input?.occurredAt, "occurredAt");
  const core = {
    recordVersion: "PTT_LOCATION_SWITCH_12_1_0",
    tenantId: toContext.tenantId,
    userId: toContext.userId,
    role: toContext.role,
    fromLocationId,
    toLocationId: toContext.activeLocationId,
    occurredAt,
    reason:
      requiredText(input?.reason, "reason"),
    requestId:
      requiredText(input?.requestId, "requestId"),
  };
  return {
    ...core,
    switchId: `location-switch-${sha256(core).slice(0, 16)}`,
  };
}

export function evaluateLocationReadiness(
  registryInput,
  locationId,
) {
  const registry = normalizeRegistry(registryInput);
  const location = findLocation(registry, locationId);
  const blockers = [];

  if (!location.timezone) blockers.push("timezone");
  if (
    !location.serviceHours ||
    Object.keys(location.serviceHours).length === 0
  ) {
    blockers.push("serviceHours");
  }
  if (!location.forecastProfile?.active) {
    blockers.push("forecastProfile");
  }
  if (!location.inventoryPolicy?.active) {
    blockers.push("inventoryPolicy");
  }

  const productRows = registry.products.filter(
    (row) =>
      row.locationId === location.locationId && row.active === true,
  );
  const productCodes = new Set(
    productRows.map((row) => row.productCode),
  );
  for (const productCode of REQUIRED_LOCATION_PRODUCTS) {
    if (!productCodes.has(productCode)) {
      blockers.push(`product:${productCode}`);
      continue;
    }
    const row = productRows.find(
      (product) => product.productCode === productCode,
    );
    if (
      !Number.isFinite(Number(row?.yieldPercent)) ||
      Number(row.yieldPercent) <= 0
    ) {
      blockers.push(`yield:${productCode}`);
    }
    if (
      !Number.isFinite(Number(row?.unitWeightRawLb)) ||
      Number(row.unitWeightRawLb) <= 0
    ) {
      blockers.push(`unitWeight:${productCode}`);
    }
  }

  const activeSmokers = registry.smokers.filter(
    (row) =>
      row.locationId === location.locationId && row.active === true,
  );
  if (!activeSmokers.length) blockers.push("smokers");
  for (const smoker of activeSmokers) {
    if (!smoker.capacityProfileId) {
      blockers.push(`capacity:${smoker.smokerId}`);
    }
  }

  return {
    readinessVersion: MULTI_LOCATION_VERSION,
    tenantId: location.tenantId,
    locationId: location.locationId,
    locationStatus: location.status,
    status: blockers.length ? "BLOCKED" : "READY",
    blockers,
    productCount: productRows.length,
    activeSmokerCount: activeSmokers.length,
  };
}

export function resolveLocationMasterData(
  registryInput,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const location = findLocation(
    registry,
    input?.locationId,
    "locationId",
  );
  const tenantId = requiredText(input?.tenantId, "tenantId");
  if (tenantId !== registry.tenant.tenantId) {
    throw new MultiLocationValidationError(
      "tenantId",
      "Requested tenant does not match the registry tenant.",
    );
  }
  if (location.tenantId !== tenantId) {
    throw new MultiLocationValidationError(
      "locationId",
      "Requested location does not belong to the requested tenant.",
    );
  }
  const productCode = requiredText(
    input?.productCode,
    "productCode",
  ).toUpperCase();
  const product = registry.products.find(
    (row) =>
      row.locationId === location.locationId &&
      row.productCode === productCode &&
      row.active === true,
  );
  if (!product) {
    throw new MultiLocationValidationError(
      "locationId",
      `No ${productCode} configuration exists for ${location.locationId}; cross-location fallback is forbidden.`,
    );
  }
  return {
    tenantId,
    locationId: location.locationId,
    productCode,
    product: clone(product),
    smokers: registry.smokers
      .filter(
        (row) =>
          row.locationId === location.locationId &&
          row.active === true,
      )
      .map(clone),
  };
}

export function createLocationScopedRecord(input) {
  const tenantId = requiredText(input?.tenantId, "tenantId");
  const locationId = requiredText(
    input?.locationId,
    "locationId",
  );
  const recordType = requiredText(
    input?.recordType,
    "recordType",
  ).toUpperCase();
  if (!OPERATIONAL_RECORD_TYPES.has(recordType)) {
    throw new MultiLocationValidationError(
      "recordType",
      "Unsupported location-scoped record type.",
    );
  }
  const sourceId = requiredText(input?.sourceId, "sourceId");
  const occurredAt = timestamp(input?.occurredAt, "occurredAt");
  const payload = clone(input?.payload || {});
  const core = {
    recordVersion: "PTT_LOCATION_RECORD_12_1_0",
    tenantId,
    locationId,
    recordType,
    sourceId,
    occurredAt,
    payload,
  };
  return {
    ...core,
    recordId: `location-record-${sha256(core).slice(0, 18)}`,
  };
}

export function assertLocationScopedRecord(record, context) {
  if (record?.tenantId !== context?.tenantId) {
    throw new MultiLocationValidationError(
      "tenantId",
      "Record tenant does not match active tenant context.",
    );
  }
  if (record?.locationId !== context?.activeLocationId) {
    throw new MultiLocationValidationError(
      "locationId",
      "Record location does not match active location context.",
    );
  }
  return {
    valid: true,
    tenantId: record.tenantId,
    locationId: record.locationId,
    recordId: record.recordId,
  };
}

export function createTransferOrder(
  registryInput,
  contract,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const tenantId = requiredText(input?.tenantId, "tenantId");
  if (tenantId !== registry.tenant.tenantId) {
    throw new MultiLocationValidationError(
      "tenantId",
      "Transfer tenant does not match registry tenant.",
    );
  }
  const source = findLocation(
    registry,
    input?.sourceLocationId,
    "sourceLocationId",
  );
  const destination = findLocation(
    registry,
    input?.destinationLocationId,
    "destinationLocationId",
  );
  if (source.locationId === destination.locationId) {
    throw new MultiLocationValidationError(
      "destinationLocationId",
      "Source and destination locations must be different.",
    );
  }
  requireOperationalLocation(source, "sourceLocation.status");
  requireOperationalLocation(
    destination,
    "destinationLocation.status",
  );
  if (
    source.tenantId !== tenantId ||
    destination.tenantId !== tenantId
  ) {
    throw new MultiLocationValidationError(
      "tenantId",
      "Transfer locations must belong to the same tenant.",
    );
  }

  const actor = actorForAction(registry, {
    ...input?.requestedBy,
    tenantId,
  });
  if (!membershipCanAccessLocation(actor, source.locationId)) {
    throw new MultiLocationValidationError(
      "sourceLocationId",
      "Requester does not have source-location access.",
    );
  }
  if (!actionAllowed(contract, actor.role, "transfer:create")) {
    throw new MultiLocationValidationError(
      "requestedBy.role",
      "Requester cannot create transfers.",
    );
  }

  const items = [...itemMap(input?.items, "items").values()];
  const createdAt = timestamp(input?.createdAt, "createdAt");
  const commandId = requiredText(input?.commandId, "commandId");
  const core = {
    transferVersion: "PTT_LOCATION_TRANSFER_12_1_0",
    tenantId,
    sourceLocationId: source.locationId,
    destinationLocationId: destination.locationId,
    status: "DRAFT",
    reason: requiredText(input?.reason, "reason"),
    requestedBy: {
      userId: actor.userId,
      name: actor.name,
      role: actor.role,
    },
    createdAt,
    updatedAt: createdAt,
    items,
    approvals: [],
    dispatch: null,
    receipt: null,
    commandHistory: [
      {
        commandId,
        eventType: "TRANSFER_CREATED",
        occurredAt: createdAt,
        actorId: actor.userId,
      },
    ],
  };
  return {
    ...core,
    transferId: `transfer-${sha256(core).slice(0, 18)}`,
  };
}

export function approveTransferOrder(
  registryInput,
  contract,
  transferInput,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const transfer = clone(transferInput);
  if (!TRANSFER_STATUSES.has(transfer.status)) {
    throw new MultiLocationValidationError(
      "transfer.status",
      "Transfer status is invalid.",
    );
  }
  if (transfer.status !== "DRAFT") {
    throw new MultiLocationValidationError(
      "transfer.status",
      "Only a draft transfer can be approved.",
    );
  }
  const commandId = requiredText(input?.commandId, "commandId");
  const duplicate = idempotentResult(
    transfer,
    commandId,
    "TRANSFER_APPROVED",
  );
  if (duplicate) return duplicate;

  const actor = actorForAction(registry, {
    ...input?.actor,
    tenantId: transfer.tenantId,
  });
  if (
    !membershipCanAccessLocation(
      actor,
      transfer.sourceLocationId,
    )
  ) {
    throw new MultiLocationValidationError(
      "sourceLocationId",
      "Approver lacks source-location access.",
    );
  }
  if (!actionAllowed(contract, actor.role, "transfer:approve")) {
    throw new MultiLocationValidationError(
      "actor.role",
      "Actor cannot approve transfers.",
    );
  }
  const occurredAt = timestamp(input?.occurredAt, "occurredAt");
  let updated = appendCommand(transfer, {
    commandId,
    eventType: "TRANSFER_APPROVED",
    occurredAt,
    actorId: actor.userId,
  });
  updated.status = "APPROVED";
  updated.approvals.push({
    approvalVersion: "PTT_TRANSFER_APPROVAL_12_1_0",
    approvedBy: {
      userId: actor.userId,
      name: actor.name,
      role: actor.role,
    },
    approvedAt: occurredAt,
    reason: requiredText(input?.reason, "reason"),
  });
  return {
    record: updated,
    duplicate: false,
    event: clone(updated.commandHistory.at(-1)),
  };
}

export function dispatchTransferOrder(
  registryInput,
  contract,
  transferInput,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const transfer = clone(transferInput);
  const commandId = requiredText(input?.commandId, "commandId");
  const duplicate = idempotentResult(
    transfer,
    commandId,
    "TRANSFER_DISPATCHED",
  );
  if (duplicate) return duplicate;
  if (transfer.status !== "APPROVED") {
    throw new MultiLocationValidationError(
      "transfer.status",
      "Only an approved transfer can be dispatched.",
    );
  }

  const actor = actorForAction(registry, {
    ...input?.actor,
    tenantId: transfer.tenantId,
  });
  if (
    !membershipCanAccessLocation(
      actor,
      transfer.sourceLocationId,
    )
  ) {
    throw new MultiLocationValidationError(
      "sourceLocationId",
      "Dispatcher lacks source-location access.",
    );
  }
  if (!actionAllowed(contract, actor.role, "transfer:dispatch")) {
    throw new MultiLocationValidationError(
      "actor.role",
      "Actor cannot dispatch transfers.",
    );
  }

  const requested = itemMap(transfer.items, "transfer.items");
  const shipped = itemMap(input?.shippedItems, "shippedItems");
  for (const [productCode, requestedItem] of requested) {
    const shippedItem = shipped.get(productCode);
    if (!shippedItem) {
      throw new MultiLocationValidationError(
        "shippedItems",
        `Missing shipped quantity for ${productCode}.`,
      );
    }
    if (
      Math.abs(
        shippedItem.quantityCookedLb -
          requestedItem.quantityCookedLb,
      ) > 0.0001
    ) {
      throw new MultiLocationValidationError(
        "shippedItems",
        `Shipped quantity must equal the approved quantity for ${productCode}.`,
      );
    }
  }

  const occurredAt = timestamp(input?.occurredAt, "occurredAt");
  let updated = appendCommand(transfer, {
    commandId,
    eventType: "TRANSFER_DISPATCHED",
    occurredAt,
    actorId: actor.userId,
  });
  updated.status = "IN_TRANSIT";
  updated.dispatch = {
    dispatchVersion: "PTT_TRANSFER_DISPATCH_12_1_0",
    dispatchedBy: {
      userId: actor.userId,
      name: actor.name,
      role: actor.role,
    },
    dispatchedAt: occurredAt,
    items: [...shipped.values()],
    sourceInventoryEffects: [...shipped.values()].map((item) => ({
      productCode: item.productCode,
      availableDeltaCookedLb: -item.quantityCookedLb,
      transferOutCookedLb: item.quantityCookedLb,
      appliedAt: occurredAt,
      commandId,
    })),
  };
  return {
    record: updated,
    duplicate: false,
    event: clone(updated.commandHistory.at(-1)),
  };
}

export function receiveTransferOrder(
  registryInput,
  contract,
  transferInput,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const transfer = clone(transferInput);
  const commandId = requiredText(input?.commandId, "commandId");
  const duplicate = idempotentResult(
    transfer,
    commandId,
    "TRANSFER_RECEIVED",
  );
  if (duplicate) return duplicate;
  if (transfer.status !== "IN_TRANSIT") {
    throw new MultiLocationValidationError(
      "transfer.status",
      "Only an in-transit transfer can be received.",
    );
  }

  const actor = actorForAction(registry, {
    ...input?.actor,
    tenantId: transfer.tenantId,
  });
  if (
    !membershipCanAccessLocation(
      actor,
      transfer.destinationLocationId,
    )
  ) {
    throw new MultiLocationValidationError(
      "destinationLocationId",
      "Receiver lacks destination-location access.",
    );
  }
  if (!actionAllowed(contract, actor.role, "transfer:receive")) {
    throw new MultiLocationValidationError(
      "actor.role",
      "Actor cannot receive transfers.",
    );
  }

  const shipped = itemMap(
    transfer.dispatch?.items,
    "transfer.dispatch.items",
  );
  const received = itemMap(input?.receivedItems, "receivedItems");
  const variances = [];
  for (const [productCode, shippedItem] of shipped) {
    const receivedItem = received.get(productCode);
    if (!receivedItem) {
      throw new MultiLocationValidationError(
        "receivedItems",
        `Missing received quantity for ${productCode}.`,
      );
    }
    if (
      receivedItem.quantityCookedLb >
      shippedItem.quantityCookedLb + 0.0001
    ) {
      throw new MultiLocationValidationError(
        "receivedItems",
        `Received quantity cannot exceed shipped quantity for ${productCode}.`,
      );
    }
    variances.push({
      productCode,
      shippedCookedLb: shippedItem.quantityCookedLb,
      receivedCookedLb: receivedItem.quantityCookedLb,
      varianceCookedLb:
        receivedItem.quantityCookedLb -
        shippedItem.quantityCookedLb,
    });
  }

  const occurredAt = timestamp(input?.occurredAt, "occurredAt");
  const hasVariance = variances.some(
    (row) => Math.abs(row.varianceCookedLb) > 0.0001,
  );
  let updated = appendCommand(transfer, {
    commandId,
    eventType: "TRANSFER_RECEIVED",
    occurredAt,
    actorId: actor.userId,
  });
  updated.status = hasVariance
    ? "RECEIVED_WITH_VARIANCE"
    : "RECEIVED";
  updated.receipt = {
    receiptVersion: "PTT_TRANSFER_RECEIPT_12_1_0",
    receivedBy: {
      userId: actor.userId,
      name: actor.name,
      role: actor.role,
    },
    receivedAt: occurredAt,
    items: [...received.values()],
    variances,
    destinationInventoryEffects: [...received.values()].map(
      (item) => ({
        productCode: item.productCode,
        availableDeltaCookedLb: item.quantityCookedLb,
        transferInCookedLb: item.quantityCookedLb,
        appliedAt: occurredAt,
        commandId,
      }),
    ),
  };
  return {
    record: updated,
    duplicate: false,
    event: clone(updated.commandHistory.at(-1)),
  };
}

export function generateConsolidatedLocationReport(
  registryInput,
  contract,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const actor = actorForAction(registry, input?.actor);
  if (
    !contract.reporting.consolidatedRoles.includes(actor.role)
  ) {
    throw new MultiLocationValidationError(
      "actor.role",
      "Actor cannot view consolidated reporting.",
    );
  }

  const requestedTenantId = requiredText(
    input?.tenantId,
    "tenantId",
  );
  if (
    requestedTenantId !== registry.tenant.tenantId ||
    requestedTenantId !== actor.tenantId
  ) {
    throw new MultiLocationValidationError(
      "tenantId",
      "Consolidated reporting cannot cross tenants.",
    );
  }

  const activeLocations = registry.locations.filter(
    (location) => location.status === "ACTIVE",
  );
  const activeLocationIds = new Set(
    activeLocations.map((location) => location.locationId),
  );
  const metrics = (input?.metrics || []).map(locationMetricsRow);
  const dateSet = new Set(metrics.map((row) => row.operatingDate));
  if (dateSet.size !== 1) {
    throw new MultiLocationValidationError(
      "operatingDate",
      "Consolidated report requires one operating date.",
    );
  }

  const locationRows = [];
  for (const row of metrics) {
    if (row.tenantId !== requestedTenantId) {
      throw new MultiLocationValidationError(
        "tenantId",
        "Metric tenant does not match consolidated tenant.",
      );
    }
    if (!activeLocationIds.has(row.locationId)) continue;
    if (
      locationRows.some(
        (existing) => existing.locationId === row.locationId,
      )
    ) {
      throw new MultiLocationValidationError(
        "metrics",
        `Duplicate location metric: ${row.locationId}.`,
      );
    }
    const location = findLocation(registry, row.locationId);
    locationRows.push({
      ...row,
      locationName: location.name,
      locationCode: location.code,
      forecastVarianceCookedLb:
        row.actualUsageCookedLb - row.forecastCookedLb,
      planAdherencePercent:
        row.completedLoads > 0
          ? (row.adherentLoads / row.completedLoads) * 100
          : null,
      netTransferCookedLb:
        row.transferInCookedLb - row.transferOutCookedLb,
    });
  }

  const sum = (field) =>
    locationRows.reduce(
      (total, row) => total + Number(row[field] || 0),
      0,
    );
  const completedLoads = sum("completedLoads");
  const adherentLoads = sum("adherentLoads");
  const totals = {
    sales: sum("sales"),
    foodSales: sum("foodSales"),
    barSales: sum("barSales"),
    forecastCookedLb: sum("forecastCookedLb"),
    actualUsageCookedLb: sum("actualUsageCookedLb"),
    forecastVarianceCookedLb:
      sum("actualUsageCookedLb") - sum("forecastCookedLb"),
    wasteCookedLb: sum("wasteCookedLb"),
    endingInventoryCookedLb: sum("endingInventoryCookedLb"),
    completedLoads,
    adherentLoads,
    planAdherencePercent:
      completedLoads > 0
        ? (adherentLoads / completedLoads) * 100
        : null,
    transferInCookedLb: sum("transferInCookedLb"),
    transferOutCookedLb: sum("transferOutCookedLb"),
    netTransferCookedLb:
      sum("transferInCookedLb") -
      sum("transferOutCookedLb"),
  };

  const core = {
    reportVersion: "PTT_CONSOLIDATED_LOCATION_REPORT_12_1_0",
    tenantId: requestedTenantId,
    operatingDate: [...dateSet][0],
    generatedBy: {
      userId: actor.userId,
      role: actor.role,
    },
    locationCount: locationRows.length,
    locations: locationRows,
    totals,
    transferDoubleCountingExcluded: true,
  };
  return {
    ...core,
    reportId: `consolidated-report-${sha256(core).slice(0, 18)}`,
  };
}

export function evaluateLocationOnboarding(
  contract,
  input,
) {
  const tenantId = requiredText(input?.tenantId, "tenantId");
  const locationId = requiredText(
    input?.locationId,
    "locationId",
  );
  const evidence = clone(input?.evidence || {});
  const controls = contract.onboarding.requiredControls.map(
    (controlName) => ({
      control: controlName,
      passed: evidence[controlName] === true,
      actual: evidence[controlName] === true,
      expected: true,
    }),
  );
  const blockers = controls
    .filter((row) => !row.passed)
    .map((row) => row.control);
  const core = {
    onboardingVersion: "PTT_LOCATION_ONBOARDING_12_1_0",
    tenantId,
    locationId,
    status: blockers.length
      ? "BLOCKED"
      : "READY_FOR_ACTIVATION",
    controls,
    blockers,
    evaluatedAt: timestamp(
      input?.evaluatedAt,
      "evaluatedAt",
    ),
  };
  return {
    ...core,
    onboardingId: `location-onboarding-${sha256(core).slice(
      0,
      18,
    )}`,
  };
}

export function createLocationActivationRecord(
  registryInput,
  contract,
  onboardingInput,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const onboarding = clone(onboardingInput);
  if (onboarding.status !== "READY_FOR_ACTIVATION") {
    throw new MultiLocationValidationError(
      "onboarding.status",
      "Location onboarding is not ready for activation.",
    );
  }
  const actor = actorForAction(registry, {
    ...input?.actor,
    tenantId: onboarding.tenantId,
  });
  if (!contract.onboarding.activationRoles.includes(actor.role)) {
    throw new MultiLocationValidationError(
      "actor.role",
      "Actor cannot activate locations.",
    );
  }
  const location = findLocation(
    registry,
    onboarding.locationId,
  );
  if (!["DRAFT", "ONBOARDING", "SUSPENDED"].includes(location.status)) {
    throw new MultiLocationValidationError(
      "location.status",
      "Location cannot be activated from its current status.",
    );
  }
  const activatedAt = timestamp(
    input?.activatedAt,
    "activatedAt",
  );
  const core = {
    recordVersion: "PTT_LOCATION_ACTIVATION_12_1_0",
    tenantId: onboarding.tenantId,
    locationId: onboarding.locationId,
    onboardingId: onboarding.onboardingId,
    priorStatus: location.status,
    newStatus: "ACTIVE",
    activatedBy: {
      userId: actor.userId,
      name: actor.name,
      role: actor.role,
    },
    activatedAt,
    reason: requiredText(input?.reason, "reason"),
  };
  return {
    ...core,
    activationId: `location-activation-${sha256(core).slice(
      0,
      18,
    )}`,
  };
}

export function evaluateLocationDeactivation(
  registryInput,
  contract,
  input,
) {
  const registry = normalizeRegistry(registryInput);
  const location = findLocation(
    registry,
    input?.locationId,
    "locationId",
  );
  const actor = actorForAction(registry, {
    ...input?.actor,
    tenantId: location.tenantId,
  });
  if (
    !contract.deactivation.deactivationRoles.includes(
      actor.role,
    )
  ) {
    throw new MultiLocationValidationError(
      "actor.role",
      "Actor cannot deactivate locations.",
    );
  }
  const evidence = clone(input?.evidence || {});
  const blockers = contract.deactivation.blockingConditions.filter(
    (condition) => evidence[condition] === true,
  );
  const core = {
    deactivationVersion:
      "PTT_LOCATION_DEACTIVATION_REVIEW_12_1_0",
    tenantId: location.tenantId,
    locationId: location.locationId,
    priorStatus: location.status,
    status: blockers.length
      ? "BLOCKED"
      : "READY_FOR_DEACTIVATION",
    blockers,
    reviewedBy: {
      userId: actor.userId,
      name: actor.name,
      role: actor.role,
    },
    reviewedAt: timestamp(
      input?.reviewedAt,
      "reviewedAt",
    ),
    historicalDataRetained: true,
    newOperationsBlockedAfterDeactivation: true,
  };
  return {
    ...core,
    reviewId: `location-deactivation-${sha256(core).slice(
      0,
      18,
    )}`,
  };
}

export function evaluateSingleLocationMigration(
  input,
) {
  const tenantId = requiredText(input?.tenantId, "tenantId");
  const defaultLocationId = requiredText(
    input?.defaultLocationId,
    "defaultLocationId",
  );
  const rollbackPlan = requiredText(
    input?.rollbackPlan,
    "rollbackPlan",
  );
  const tables = (input?.tables || []).map((table, index) => ({
    name: requiredText(table?.name, `tables.${index}.name`),
    totalRecords: finite(
      table?.totalRecords,
      `tables.${index}.totalRecords`,
      0,
    ),
    unscopedRecords: finite(
      table?.unscopedRecords,
      `tables.${index}.unscopedRecords`,
      0,
    ),
  }));
  if (!tables.length) {
    throw new MultiLocationValidationError(
      "tables",
      "Migration readiness requires at least one table.",
    );
  }
  const blockers = tables
    .filter((table) => table.unscopedRecords > 0)
    .map(
      (table) =>
        `${table.name}:${table.unscopedRecords} unscoped records`,
    );
  const totalRecords = tables.reduce(
    (sum, table) => sum + table.totalRecords,
    0,
  );
  const unscopedRecords = tables.reduce(
    (sum, table) => sum + table.unscopedRecords,
    0,
  );
  const core = {
    migrationVersion: "PTT_MULTI_LOCATION_MIGRATION_12_1_0",
    tenantId,
    defaultLocationId,
    status: blockers.length ? "BLOCKED" : "READY",
    tables,
    totalRecords,
    unscopedRecords,
    blockers,
    rollbackPlan,
    automaticMigrationExecuted: false,
  };
  return {
    ...core,
    migrationReadinessId: `migration-readiness-${sha256(core).slice(
      0,
      18,
    )}`,
  };
}

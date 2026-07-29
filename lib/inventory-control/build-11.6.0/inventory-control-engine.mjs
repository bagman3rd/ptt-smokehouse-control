export const INVENTORY_CONTROL_VERSION = "PTT_INVENTORY_CONTROL_11_6_0";

export const INVENTORY_PRODUCTS = Object.freeze([
  "BRISKET",
  "PORK",
  "RIBS",
  "CHICKEN",
]);

export const WASTE_REASONS = Object.freeze([
  "OVERPRODUCTION",
  "TRIM_OR_PREP",
  "QUALITY_FAILURE",
  "TEMPERATURE_CONTROL",
  "CONTAMINATION",
  "DROP_OR_SPILL",
  "EXPIRED_HOLD",
  "SERVICE_ERROR",
  "OTHER",
]);

export const HOLD_REASONS = Object.freeze([
  "TEMPERATURE_REVIEW",
  "QUALITY_REVIEW",
  "CONTAMINATION_RISK",
  "ALLERGEN_RISK",
  "TRACEABILITY_REVIEW",
  "EQUIPMENT_FAILURE",
  "OTHER",
]);

const ROLES = Object.freeze(["ADMIN", "OWNER", "KM", "PITMASTER", "KC", "VIEWER"]);
const MANAGERS = new Set(["ADMIN", "OWNER", "KM"]);
const INVENTORY_OPERATORS = new Set(["ADMIN", "OWNER", "KM", "PITMASTER", "KC"]);
const RECEIPT_ROLES = new Set(["ADMIN", "OWNER", "KM", "PITMASTER"]);
const USAGE_ROLES = new Set(["ADMIN", "OWNER", "KM", "KC"]);
const COUNT_ROLES = new Set(["ADMIN", "OWNER", "KM", "KC"]);
const SEVERITIES = Object.freeze(["P0", "P1", "P2", "P3"]);

function round(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finite(value, field, minimum = undefined, maximum = undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new InventoryControlValidationError(field, `${field} must be a finite number.`);
  }
  if (minimum !== undefined && number < minimum) {
    throw new InventoryControlValidationError(field, `${field} must be at least ${minimum}.`);
  }
  if (maximum !== undefined && number > maximum) {
    throw new InventoryControlValidationError(field, `${field} must be no more than ${maximum}.`);
  }
  return number;
}

function integer(value, field, minimum = 0) {
  const number = finite(value, field, minimum);
  if (!Number.isInteger(number)) {
    throw new InventoryControlValidationError(field, `${field} must be a whole number.`);
  }
  return number;
}

function dateOnly(value, field = "operatingDate") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InventoryControlValidationError(field, `${field} must use YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new InventoryControlValidationError(field, `${field} is invalid.`);
  }
  return value;
}

function timestamp(value, field = "occurredAt") {
  const text = String(value || "");
  if (!text || Number.isNaN(new Date(text).getTime())) {
    throw new InventoryControlValidationError(field, `${field} must be a valid timestamp.`);
  }
  return text;
}

function stableHash(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function actor(command) {
  const input = command?.actor || {};
  const result = {
    id: String(input.id || "").trim(),
    name: String(input.name || "").trim(),
    role: String(input.role || "").trim().toUpperCase(),
  };
  if (!result.id) throw new InventoryControlValidationError("actor.id", "actor.id is required.");
  if (result.name.length < 2) throw new InventoryControlValidationError("actor.name", "actor.name is required.");
  if (!ROLES.includes(result.role)) throw new InventoryControlValidationError("actor.role", "actor.role is invalid.");
  return result;
}

function identity(command) {
  const commandId = String(command?.commandId || "").trim();
  if (commandId.length < 4) {
    throw new InventoryControlValidationError("commandId", "commandId must contain at least four characters.");
  }
  const type = String(command?.type || "").trim().toUpperCase();
  if (!type) throw new InventoryControlValidationError("type", "command type is required.");
  return {
    commandId,
    type,
    occurredAt: timestamp(command?.occurredAt),
  };
}

function requireRole(person, roles, action) {
  if (!roles.has(person.role)) {
    throw new InventoryControlValidationError("actor.role", `${person.role} is not authorized to ${action}.`);
  }
}

function requireTenant(state, command) {
  const tenantId = String(command?.tenantId || state.tenantId);
  if (tenantId !== state.tenantId) {
    throw new InventoryControlValidationError("tenantId", "Cross-tenant inventory command is blocked.");
  }
}

function product(state, productCode) {
  const code = String(productCode || "").toUpperCase();
  const row = state.products.find((item) => item.productCode === code);
  if (!row) {
    throw new InventoryControlValidationError("payload.productCode", `Unknown product: ${code || "(blank)"}.`);
  }
  return row;
}

function productLedger(state, productCode) {
  return state.ledger.filter((entry) => entry.productCode === productCode);
}

function balancesFor(state, productCode) {
  const config = product(state, productCode);
  const entries = productLedger(state, config.productCode);
  const availableCookedLb = round(
    config.openingCookedLb + entries.reduce((sum, entry) => sum + Number(entry.availableDeltaCookedLb || 0), 0),
  );
  const heldCookedLb = round(
    entries.reduce((sum, entry) => sum + Number(entry.heldDeltaCookedLb || 0), 0),
  );
  const onHandCookedLb = round(availableCookedLb + heldCookedLb);
  const wasteCookedLb = round(
    entries
      .filter((entry) => entry.transactionType === "WASTE" || entry.transactionType === "QUALITY_DISCARD")
      .reduce((sum, entry) => sum + Math.abs(Number(entry.onHandDeltaCookedLb || 0)), 0),
  );
  return {
    productCode: config.productCode,
    openingCookedLb: config.openingCookedLb,
    availableCookedLb,
    heldCookedLb,
    onHandCookedLb,
    wasteCookedLb,
  };
}

function allBalances(state) {
  return state.products.map((row) => balancesFor(state, row.productCode));
}

function requireOpen(state) {
  if (state.status !== "OPEN") {
    throw new InventoryControlValidationError("day", "Inventory day is not open.");
  }
}

function event(state, command, person, type, payload) {
  const core = {
    sequence: state.events.length + 1,
    commandId: command.commandId,
    occurredAt: command.occurredAt,
    type,
    actor: person,
    payload: clone(payload || {}),
  };
  return { ...core, eventId: `ie-${stableHash({ inventoryDayId: state.inventoryDayId, ...core })}` };
}

function ledgerEntry(state, command, person, input) {
  const core = {
    sequence: state.ledger.length + 1,
    commandId: command.commandId,
    occurredAt: command.occurredAt,
    actor: person,
    productCode: input.productCode,
    transactionType: input.transactionType,
    availableDeltaCookedLb: round(input.availableDeltaCookedLb || 0),
    heldDeltaCookedLb: round(input.heldDeltaCookedLb || 0),
    onHandDeltaCookedLb: round(input.onHandDeltaCookedLb || 0),
    reason: String(input.reason || ""),
    referenceType: String(input.referenceType || ""),
    referenceId: String(input.referenceId || ""),
    note: String(input.note || ""),
  };
  return { ...core, ledgerEntryId: `le-${stableHash({ inventoryDayId: state.inventoryDayId, ...core })}` };
}

function applyMutation(state, command, entry, eventRecord, extras = {}) {
  return {
    ...state,
    ...extras,
    ledger: entry ? [...state.ledger, entry] : state.ledger,
    events: eventRecord ? [...state.events, eventRecord] : state.events,
    processedCommandIds: [...state.processedCommandIds, command.commandId],
    updatedAt: command.occurredAt,
  };
}

function duplicate(state, commandId) {
  return {
    state,
    result: {
      status: "DUPLICATE",
      commandId,
      eventId: state.events.find((row) => row.commandId === commandId)?.eventId || null,
    },
  };
}

function positiveQuantity(payload) {
  return finite(payload?.quantityCookedLb, "payload.quantityCookedLb", 0.001, 1000000);
}

function ensureAvailable(state, productCode, quantity) {
  const balances = balancesFor(state, productCode);
  if (quantity > balances.availableCookedLb + 0.0001) {
    throw new InventoryControlValidationError(
      "payload.quantityCookedLb",
      `${productCode} available inventory is ${balances.availableCookedLb} cooked lb; ${round(quantity)} cooked lb cannot be removed.`,
    );
  }
  return balances;
}

function findHold(state, holdId) {
  const index = state.holds.findIndex((row) => row.holdId === holdId);
  if (index < 0) throw new InventoryControlValidationError("payload.holdId", `Unknown quality hold: ${holdId}.`);
  return { index, hold: state.holds[index] };
}

function findException(state, exceptionId) {
  const index = state.exceptions.findIndex((row) => row.exceptionId === exceptionId);
  if (index < 0) throw new InventoryControlValidationError("payload.exceptionId", `Unknown exception: ${exceptionId}.`);
  return { index, exception: state.exceptions[index] };
}

function countVariance(expectedCookedLb, observedCookedLb) {
  const varianceCookedLb = round(observedCookedLb - expectedCookedLb);
  const denominator = Math.max(Math.abs(expectedCookedLb), 1);
  const variancePercent = round(Math.abs(varianceCookedLb) / denominator * 100, 2);
  return {
    varianceCookedLb,
    variancePercent,
    classification:
      variancePercent > 10 ? "BLOCKING" :
      variancePercent > 3 ? "WARNING" : "ACCEPTABLE",
  };
}

function closeBlockers(state) {
  const blockers = [];
  const balances = allBalances(state);
  const negative = balances.filter((row) => row.availableCookedLb < -0.0001 || row.heldCookedLb < -0.0001 || row.onHandCookedLb < -0.0001);
  if (negative.length) blockers.push(`Negative inventory exists for ${negative.map((row) => row.productCode).join(", ")}.`);

  const missingCounts = state.products.filter((row) => !state.counts[row.productCode]);
  if (missingCounts.length) blockers.push(`Final counts are missing for ${missingCounts.map((row) => row.productName).join(", ")}.`);

  const blockingCounts = Object.values(state.counts).filter((row) => row.classification === "BLOCKING" && !row.resolvedByAdjustment);
  if (blockingCounts.length) blockers.push(`${blockingCounts.length} blocking count variance${blockingCounts.length === 1 ? "" : "s"} remain unresolved.`);

  const openBlockingHolds = state.holds.filter((row) => row.status === "OPEN" && row.blocking);
  if (openBlockingHolds.length) blockers.push(`${openBlockingHolds.length} blocking quality hold${openBlockingHolds.length === 1 ? "" : "s"} remain open.`);

  const openCritical = state.exceptions.filter((row) => row.status !== "RESOLVED" && ["P0", "P1"].includes(row.severity));
  if (openCritical.length) blockers.push(`${openCritical.length} open P0/P1 exception${openCritical.length === 1 ? "" : "s"} remain.`);

  const unowned = state.exceptions.filter((row) => row.status !== "RESOLVED" && !row.owner);
  if (unowned.length) blockers.push(`${unowned.length} open exception${unowned.length === 1 ? "" : "s"} have no owner.`);
  return blockers;
}

export class InventoryControlValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "InventoryControlValidationError";
    this.field = field;
  }
}

export function createInventoryDay(input) {
  const operatingDate = dateOnly(input?.operatingDate);
  const tenantId = String(input?.tenantId || "").trim();
  const locationId = String(input?.locationId || "").trim();
  if (!tenantId) throw new InventoryControlValidationError("tenantId", "tenantId is required.");
  if (!locationId) throw new InventoryControlValidationError("locationId", "locationId is required.");

  const products = (input?.products || []).map((row) => {
    const productCode = String(row?.productCode || "").toUpperCase();
    if (!INVENTORY_PRODUCTS.includes(productCode)) {
      throw new InventoryControlValidationError("products.productCode", `Unsupported product: ${productCode || "(blank)"}.`);
    }
    return {
      productCode,
      productName: String(row?.productName || productCode),
      openingCookedLb: round(finite(row?.openingCookedLb ?? 0, `products.${productCode}.openingCookedLb`, 0)),
      cookedLbPerOperationalUnit:
        row?.cookedLbPerOperationalUnit === null || row?.cookedLbPerOperationalUnit === undefined
          ? null
          : round(finite(row.cookedLbPerOperationalUnit, `products.${productCode}.cookedLbPerOperationalUnit`, 0.001)),
    };
  });
  if (products.length !== INVENTORY_PRODUCTS.length || new Set(products.map((row) => row.productCode)).size !== INVENTORY_PRODUCTS.length) {
    throw new InventoryControlValidationError("products", "Exactly one configuration is required for each core product.");
  }

  const core = {
    engineVersion: INVENTORY_CONTROL_VERSION,
    tenantId,
    locationId,
    operatingDate,
    timezone: String(input?.timezone || "America/New_York"),
    status: "OPEN",
    products,
    ledger: [],
    holds: [],
    exceptions: [],
    counts: {},
    countCorrections: [],
    notes: [],
    events: [],
    processedCommandIds: [],
    close: null,
    createdAt: String(input?.createdAt || `${operatingDate}T04:00:00.000Z`),
    updatedAt: String(input?.createdAt || `${operatingDate}T04:00:00.000Z`),
  };
  return { ...core, inventoryDayId: `inv-${stableHash(core)}` };
}

export function executeInventoryCommand(currentState, inputCommand) {
  const state = clone(currentState);
  if (!state || state.engineVersion !== INVENTORY_CONTROL_VERSION) {
    throw new InventoryControlValidationError("day", "Command requires a Build 11.6.0 inventory day.");
  }
  const command = { ...clone(inputCommand), ...identity(inputCommand), payload: clone(inputCommand?.payload || {}) };
  requireTenant(state, command);
  if (state.processedCommandIds.includes(command.commandId)) return duplicate(state, command.commandId);
  const person = actor(command);
  requireOpen(state);

  if (command.type === "RECEIVE_PRODUCTION") {
    requireRole(person, RECEIPT_ROLES, "receive completed production");
    const row = product(state, command.payload.productCode);
    const quantity = positiveQuantity(command.payload);
    const entry = ledgerEntry(state, command, person, {
      productCode: row.productCode,
      transactionType: "PRODUCTION_RECEIPT",
      availableDeltaCookedLb: quantity,
      onHandDeltaCookedLb: quantity,
      reason: "COMPLETED_PRODUCTION",
      referenceType: "LOAD",
      referenceId: command.payload.loadId,
      note: command.payload.note,
    });
    const ev = event(state, command, person, "PRODUCTION_RECEIVED", { productCode: row.productCode, quantityCookedLb: quantity, ledgerEntryId: entry.ledgerEntryId });
    const next = applyMutation(state, command, entry, ev);
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId, ledgerEntryId: entry.ledgerEntryId } };
  }

  if (command.type === "RECORD_SERVICE_USAGE") {
    requireRole(person, USAGE_ROLES, "record service usage");
    const row = product(state, command.payload.productCode);
    const quantity = positiveQuantity(command.payload);
    ensureAvailable(state, row.productCode, quantity);
    const entry = ledgerEntry(state, command, person, {
      productCode: row.productCode,
      transactionType: "SERVICE_USAGE",
      availableDeltaCookedLb: -quantity,
      onHandDeltaCookedLb: -quantity,
      reason: "SERVICE_USAGE",
      referenceType: "SERVICE_PERIOD",
      referenceId: command.payload.servicePeriodId,
      note: command.payload.note,
    });
    const ev = event(state, command, person, "SERVICE_USAGE_RECORDED", { productCode: row.productCode, quantityCookedLb: quantity, ledgerEntryId: entry.ledgerEntryId });
    const next = applyMutation(state, command, entry, ev);
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId } };
  }

  if (command.type === "RECORD_WASTE") {
    requireRole(person, INVENTORY_OPERATORS, "record waste");
    const row = product(state, command.payload.productCode);
    const quantity = positiveQuantity(command.payload);
    ensureAvailable(state, row.productCode, quantity);
    const reason = String(command.payload.reason || "").toUpperCase();
    if (!WASTE_REASONS.includes(reason)) {
      throw new InventoryControlValidationError("payload.reason", "A valid waste reason is required.");
    }
    const note = String(command.payload.note || "").trim();
    if (reason === "OTHER" && note.length < 5) {
      throw new InventoryControlValidationError("payload.note", "OTHER waste requires an explanatory note.");
    }
    const entry = ledgerEntry(state, command, person, {
      productCode: row.productCode,
      transactionType: "WASTE",
      availableDeltaCookedLb: -quantity,
      onHandDeltaCookedLb: -quantity,
      reason,
      referenceType: "WASTE_RECORD",
      referenceId: command.payload.wasteRecordId,
      note,
    });
    const ev = event(state, command, person, "WASTE_RECORDED", { productCode: row.productCode, quantityCookedLb: quantity, reason, ledgerEntryId: entry.ledgerEntryId });
    const next = applyMutation(state, command, entry, ev);
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId } };
  }

  if (command.type === "OPEN_QUALITY_HOLD") {
    requireRole(person, INVENTORY_OPERATORS, "open a quality hold");
    const row = product(state, command.payload.productCode);
    const quantity = positiveQuantity(command.payload);
    ensureAvailable(state, row.productCode, quantity);
    const reason = String(command.payload.reason || "").toUpperCase();
    if (!HOLD_REASONS.includes(reason)) {
      throw new InventoryControlValidationError("payload.reason", "A valid quality-hold reason is required.");
    }
    const severity = String(command.payload.severity || "P1").toUpperCase();
    if (!SEVERITIES.includes(severity)) {
      throw new InventoryControlValidationError("payload.severity", "Hold severity must be P0, P1, P2, or P3.");
    }
    const owner = command.payload.owner ? {
      id: String(command.payload.owner.id || ""),
      name: String(command.payload.owner.name || ""),
      role: String(command.payload.owner.role || "").toUpperCase(),
    } : null;
    const holdCore = {
      productCode: row.productCode,
      quantityCookedLb: round(quantity),
      reason,
      severity,
      blocking: command.payload.blocking !== false,
      status: "OPEN",
      owner,
      openedAt: command.occurredAt,
      openedBy: person,
      resolution: null,
      closedAt: null,
      closedBy: null,
    };
    const hold = { ...holdCore, holdId: `hold-${stableHash({ inventoryDayId: state.inventoryDayId, commandId: command.commandId, ...holdCore })}` };
    const entry = ledgerEntry(state, command, person, {
      productCode: row.productCode,
      transactionType: "QUALITY_HOLD",
      availableDeltaCookedLb: -quantity,
      heldDeltaCookedLb: quantity,
      onHandDeltaCookedLb: 0,
      reason,
      referenceType: "QUALITY_HOLD",
      referenceId: hold.holdId,
      note: command.payload.note,
    });
    const ev = event(state, command, person, "QUALITY_HOLD_OPENED", { hold, ledgerEntryId: entry.ledgerEntryId });
    const next = applyMutation(state, command, entry, ev, { holds: [...state.holds, hold] });
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId, holdId: hold.holdId } };
  }

  if (command.type === "RELEASE_QUALITY_HOLD" || command.type === "DISCARD_QUALITY_HOLD") {
    requireRole(person, MANAGERS, command.type === "RELEASE_QUALITY_HOLD" ? "release a quality hold" : "discard held inventory");
    const { index, hold } = findHold(state, String(command.payload.holdId || ""));
    if (hold.status !== "OPEN") {
      throw new InventoryControlValidationError("payload.holdId", "Only an open quality hold can be closed.");
    }
    const resolution = String(command.payload.resolution || "").trim();
    if (resolution.length < 5) {
      throw new InventoryControlValidationError("payload.resolution", "A hold resolution is required.");
    }
    const release = command.type === "RELEASE_QUALITY_HOLD";
    const closedHold = {
      ...hold,
      status: release ? "RELEASED" : "DISCARDED",
      resolution,
      closedAt: command.occurredAt,
      closedBy: person,
    };
    const holds = [...state.holds];
    holds[index] = closedHold;
    const entry = ledgerEntry(state, command, person, {
      productCode: hold.productCode,
      transactionType: release ? "QUALITY_RELEASE" : "QUALITY_DISCARD",
      availableDeltaCookedLb: release ? hold.quantityCookedLb : 0,
      heldDeltaCookedLb: -hold.quantityCookedLb,
      onHandDeltaCookedLb: release ? 0 : -hold.quantityCookedLb,
      reason: release ? "QUALITY_CLEARED" : String(command.payload.wasteReason || "QUALITY_FAILURE"),
      referenceType: "QUALITY_HOLD",
      referenceId: hold.holdId,
      note: resolution,
    });
    const ev = event(state, command, person, release ? "QUALITY_HOLD_RELEASED" : "QUALITY_HOLD_DISCARDED", {
      hold: closedHold,
      ledgerEntryId: entry.ledgerEntryId,
      wasteReason: release ? null : entry.reason,
    });
    const next = applyMutation(state, command, entry, ev, { holds });
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId, holdStatus: closedHold.status } };
  }

  if (command.type === "OPEN_EXCEPTION") {
    requireRole(person, INVENTORY_OPERATORS, "open an inventory exception");
    const severity = String(command.payload.severity || "").toUpperCase();
    if (!SEVERITIES.includes(severity)) {
      throw new InventoryControlValidationError("payload.severity", "Exception severity must be P0, P1, P2, or P3.");
    }
    const summary = String(command.payload.summary || "").trim();
    if (summary.length < 5) {
      throw new InventoryControlValidationError("payload.summary", "Exception summary is required.");
    }
    const owner = command.payload.owner ? clone(command.payload.owner) : null;
    const core = {
      severity,
      summary,
      productCode: command.payload.productCode ? product(state, command.payload.productCode).productCode : null,
      status: "OPEN",
      owner,
      dueAt: command.payload.dueAt ? timestamp(command.payload.dueAt, "payload.dueAt") : null,
      openedAt: command.occurredAt,
      openedBy: person,
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolution: null,
      resolvedAt: null,
      resolvedBy: null,
    };
    const exception = { ...core, exceptionId: `ix-${stableHash({ inventoryDayId: state.inventoryDayId, commandId: command.commandId, ...core })}` };
    const ev = event(state, command, person, "INVENTORY_EXCEPTION_OPENED", { exception });
    const next = applyMutation(state, command, null, ev, { exceptions: [...state.exceptions, exception] });
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId, exceptionId: exception.exceptionId } };
  }

  if (["ASSIGN_EXCEPTION", "ACKNOWLEDGE_EXCEPTION", "RESOLVE_EXCEPTION"].includes(command.type)) {
    const { index, exception } = findException(state, String(command.payload.exceptionId || ""));
    let updated;
    let eventType;
    if (command.type === "ASSIGN_EXCEPTION") {
      requireRole(person, MANAGERS, "assign an inventory exception");
      const owner = clone(command.payload.owner || {});
      if (!owner.id || String(owner.name || "").length < 2 || !ROLES.includes(String(owner.role || "").toUpperCase())) {
        throw new InventoryControlValidationError("payload.owner", "A valid exception owner is required.");
      }
      owner.role = String(owner.role).toUpperCase();
      updated = { ...exception, owner };
      eventType = "INVENTORY_EXCEPTION_ASSIGNED";
    } else if (command.type === "ACKNOWLEDGE_EXCEPTION") {
      requireRole(person, INVENTORY_OPERATORS, "acknowledge an inventory exception");
      if (!exception.owner || exception.owner.id !== person.id) {
        throw new InventoryControlValidationError("actor.id", "Only the assigned owner can acknowledge this exception.");
      }
      updated = { ...exception, status: "ACKNOWLEDGED", acknowledgedAt: command.occurredAt, acknowledgedBy: person };
      eventType = "INVENTORY_EXCEPTION_ACKNOWLEDGED";
    } else {
      requireRole(person, MANAGERS, "resolve an inventory exception");
      const resolution = String(command.payload.resolution || "").trim();
      if (resolution.length < 5) throw new InventoryControlValidationError("payload.resolution", "Exception resolution is required.");
      updated = { ...exception, status: "RESOLVED", resolution, resolvedAt: command.occurredAt, resolvedBy: person };
      eventType = "INVENTORY_EXCEPTION_RESOLVED";
    }
    const exceptions = [...state.exceptions];
    exceptions[index] = updated;
    const ev = event(state, command, person, eventType, { priorException: exception, exception: updated });
    const next = applyMutation(state, command, null, ev, { exceptions });
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId, exceptionStatus: updated.status } };
  }

  if (command.type === "COUNT_INVENTORY") {
    requireRole(person, COUNT_ROLES, "count inventory");
    const row = product(state, command.payload.productCode);
    if (state.counts[row.productCode]) {
      throw new InventoryControlValidationError("payload.productCode", "A final count already exists; use manager recount correction.");
    }
    const observedAvailableCookedLb = finite(command.payload.observedAvailableCookedLb, "payload.observedAvailableCookedLb", 0);
    const observedHeldCookedLb = finite(command.payload.observedHeldCookedLb ?? 0, "payload.observedHeldCookedLb", 0);
    const expected = balancesFor(state, row.productCode);
    const observedTotalCookedLb = round(observedAvailableCookedLb + observedHeldCookedLb);
    const variance = countVariance(expected.onHandCookedLb, observedTotalCookedLb);
    const countCore = {
      productCode: row.productCode,
      expectedAvailableCookedLb: expected.availableCookedLb,
      expectedHeldCookedLb: expected.heldCookedLb,
      expectedOnHandCookedLb: expected.onHandCookedLb,
      observedAvailableCookedLb: round(observedAvailableCookedLb),
      observedHeldCookedLb: round(observedHeldCookedLb),
      observedTotalCookedLb,
      ...variance,
      resolvedByAdjustment: variance.classification !== "BLOCKING",
      countedAt: command.occurredAt,
      countedBy: person,
      version: 1,
    };
    const count = { ...countCore, countId: `count-${stableHash({ inventoryDayId: state.inventoryDayId, commandId: command.commandId, ...countCore })}` };
    const counts = { ...state.counts, [row.productCode]: count };
    const ev = event(state, command, person, "INVENTORY_COUNTED", { count });
    const next = applyMutation(state, command, null, ev, { counts });
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId, classification: count.classification } };
  }

  if (command.type === "CORRECT_INVENTORY_COUNT") {
    requireRole(person, MANAGERS, "correct an inventory count");
    const row = product(state, command.payload.productCode);
    const prior = state.counts[row.productCode];
    if (!prior) throw new InventoryControlValidationError("payload.productCode", "No original inventory count exists.");
    const reason = String(command.payload.reason || "").trim();
    if (reason.length < 5) throw new InventoryControlValidationError("payload.reason", "Count correction reason is required.");
    const observedAvailableCookedLb = finite(command.payload.observedAvailableCookedLb, "payload.observedAvailableCookedLb", 0);
    const observedHeldCookedLb = finite(command.payload.observedHeldCookedLb ?? 0, "payload.observedHeldCookedLb", 0);
    const expected = balancesFor(state, row.productCode);
    const observedTotalCookedLb = round(observedAvailableCookedLb + observedHeldCookedLb);
    const variance = countVariance(expected.onHandCookedLb, observedTotalCookedLb);
    const correction = {
      correctionId: `cc-${stableHash({ inventoryDayId: state.inventoryDayId, commandId: command.commandId })}`,
      productCode: row.productCode,
      priorCount: prior,
      reason,
      correctedAt: command.occurredAt,
      correctedBy: person,
    };
    const nextCount = {
      ...prior,
      countId: `count-${stableHash({ inventoryDayId: state.inventoryDayId, commandId: command.commandId, observedTotalCookedLb })}`,
      expectedAvailableCookedLb: expected.availableCookedLb,
      expectedHeldCookedLb: expected.heldCookedLb,
      expectedOnHandCookedLb: expected.onHandCookedLb,
      observedAvailableCookedLb: round(observedAvailableCookedLb),
      observedHeldCookedLb: round(observedHeldCookedLb),
      observedTotalCookedLb,
      ...variance,
      resolvedByAdjustment: variance.classification !== "BLOCKING",
      countedAt: command.occurredAt,
      countedBy: person,
      version: Number(prior.version || 1) + 1,
      correctionReason: reason,
    };
    const counts = { ...state.counts, [row.productCode]: nextCount };
    const ev = event(state, command, person, "INVENTORY_COUNT_CORRECTED", { correction, count: nextCount });
    const next = applyMutation(state, command, null, ev, { counts, countCorrections: [...state.countCorrections, correction] });
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId, classification: nextCount.classification } };
  }

  if (command.type === "ADJUST_INVENTORY") {
    requireRole(person, MANAGERS, "adjust inventory");
    const row = product(state, command.payload.productCode);
    const delta = finite(command.payload.deltaCookedLb, "payload.deltaCookedLb", -1000000, 1000000);
    if (Math.abs(delta) < 0.001) throw new InventoryControlValidationError("payload.deltaCookedLb", "Adjustment cannot be zero.");
    const reason = String(command.payload.reason || "").trim();
    if (reason.length < 5) throw new InventoryControlValidationError("payload.reason", "Adjustment reason is required.");
    if (delta < 0) ensureAvailable(state, row.productCode, Math.abs(delta));
    const transactionType = delta > 0 ? "ADJUSTMENT_INCREASE" : "ADJUSTMENT_DECREASE";
    const entry = ledgerEntry(state, command, person, {
      productCode: row.productCode,
      transactionType,
      availableDeltaCookedLb: delta,
      onHandDeltaCookedLb: delta,
      reason,
      referenceType: "INVENTORY_COUNT",
      referenceId: state.counts[row.productCode]?.countId || "",
      note: command.payload.note,
    });
    const counts = clone(state.counts);
    if (counts[row.productCode]) {
      const expectedAfter = round(balancesFor(state, row.productCode).onHandCookedLb + delta);
      const observed = counts[row.productCode].observedTotalCookedLb;
      const variance = countVariance(expectedAfter, observed);
      counts[row.productCode] = {
        ...counts[row.productCode],
        expectedOnHandCookedLb: expectedAfter,
        expectedAvailableCookedLb: round(balancesFor(state, row.productCode).availableCookedLb + delta),
        ...variance,
        resolvedByAdjustment: variance.classification !== "BLOCKING",
        resolvedAdjustmentId: entry.ledgerEntryId,
      };
    }
    const ev = event(state, command, person, "INVENTORY_ADJUSTED", { productCode: row.productCode, deltaCookedLb: round(delta), reason, ledgerEntryId: entry.ledgerEntryId });
    const next = applyMutation(state, command, entry, ev, { counts });
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId } };
  }

  if (command.type === "TRANSFER_OUT" || command.type === "TRANSFER_IN") {
    requireRole(person, MANAGERS, "record an inventory transfer");
    const row = product(state, command.payload.productCode);
    const quantity = positiveQuantity(command.payload);
    const transferId = String(command.payload.transferId || "").trim();
    if (transferId.length < 4) throw new InventoryControlValidationError("payload.transferId", "transferId is required.");
    const out = command.type === "TRANSFER_OUT";
    if (out) ensureAvailable(state, row.productCode, quantity);
    const entry = ledgerEntry(state, command, person, {
      productCode: row.productCode,
      transactionType: command.type,
      availableDeltaCookedLb: out ? -quantity : quantity,
      onHandDeltaCookedLb: out ? -quantity : quantity,
      reason: "LOCATION_TRANSFER",
      referenceType: "TRANSFER",
      referenceId: transferId,
      note: command.payload.note,
    });
    const ev = event(state, command, person, out ? "INVENTORY_TRANSFERRED_OUT" : "INVENTORY_TRANSFERRED_IN", {
      productCode: row.productCode,
      quantityCookedLb: quantity,
      transferId,
      ledgerEntryId: entry.ledgerEntryId,
    });
    const next = applyMutation(state, command, entry, ev);
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId, transactionType: command.type } };
  }

  if (command.type === "ADD_INVENTORY_NOTE") {
    requireRole(person, INVENTORY_OPERATORS, "add an inventory note");
    const note = String(command.payload.note || "").trim();
    if (note.length < 2) throw new InventoryControlValidationError("payload.note", "Inventory note is required.");
    const noteRecord = {
      noteId: `in-${stableHash({ inventoryDayId: state.inventoryDayId, commandId: command.commandId, note })}`,
      productCode: command.payload.productCode ? product(state, command.payload.productCode).productCode : null,
      note,
      occurredAt: command.occurredAt,
      actor: person,
    };
    const ev = event(state, command, person, "INVENTORY_NOTE_ADDED", { note: noteRecord });
    const next = applyMutation(state, command, null, ev, { notes: [...state.notes, noteRecord] });
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId } };
  }

  if (command.type === "CLOSE_INVENTORY_DAY") {
    requireRole(person, MANAGERS, "close inventory reconciliation");
    const blockers = closeBlockers(state);
    if (blockers.length) {
      throw new InventoryControlValidationError("day", `Inventory day cannot close: ${blockers.join(" ")}`);
    }
    const closeCore = {
      closedAt: command.occurredAt,
      closedBy: person,
      reason: String(command.payload.reason || "Inventory reconciled"),
      balances: allBalances(state),
      countIds: Object.values(state.counts).map((row) => row.countId),
    };
    const close = { ...closeCore, closeId: `iclose-${stableHash({ inventoryDayId: state.inventoryDayId, commandId: command.commandId, ...closeCore })}` };
    const ev = event(state, command, person, "INVENTORY_DAY_CLOSED", { close });
    const next = applyMutation(state, command, null, ev, { status: "CLOSED", close });
    return { state: next, result: { status: "APPLIED", eventId: ev.eventId, dayStatus: "CLOSED" } };
  }

  throw new InventoryControlValidationError("type", `Unsupported command type: ${command.type}.`);
}

export function deriveInventoryBoard(state, nowIso) {
  if (!state || state.engineVersion !== INVENTORY_CONTROL_VERSION) {
    throw new InventoryControlValidationError("day", "Inventory board requires a Build 11.6.0 inventory day.");
  }
  const now = timestamp(nowIso, "nowIso");
  const balances = allBalances(state);
  const urgentActions = [];

  for (const hold of state.holds.filter((row) => row.status === "OPEN")) {
    urgentActions.push({
      type: "OPEN_QUALITY_HOLD",
      severity: hold.severity,
      productCode: hold.productCode,
      referenceId: hold.holdId,
      message: `${hold.productCode} has ${hold.quantityCookedLb} cooked lb on quality hold.`,
    });
  }
  for (const exception of state.exceptions.filter((row) => row.status !== "RESOLVED")) {
    urgentActions.push({
      type: exception.owner ? "OPEN_INVENTORY_EXCEPTION" : "UNOWNED_INVENTORY_EXCEPTION",
      severity: exception.severity,
      productCode: exception.productCode,
      referenceId: exception.exceptionId,
      message: exception.owner
        ? `${exception.severity} exception assigned to ${exception.owner.name}: ${exception.summary}`
        : `${exception.severity} exception has no owner: ${exception.summary}`,
    });
  }
  for (const count of Object.values(state.counts).filter((row) => row.classification !== "ACCEPTABLE" && !row.resolvedByAdjustment)) {
    urgentActions.push({
      type: count.classification === "BLOCKING" ? "BLOCKING_COUNT_VARIANCE" : "COUNT_VARIANCE_WARNING",
      severity: count.classification === "BLOCKING" ? "P1" : "P2",
      productCode: count.productCode,
      referenceId: count.countId,
      message: `${count.productCode} count variance is ${count.varianceCookedLb} cooked lb (${count.variancePercent}%).`,
    });
  }
  for (const balance of balances.filter((row) => row.availableCookedLb < 0 || row.heldCookedLb < 0)) {
    urgentActions.push({
      type: "NEGATIVE_INVENTORY",
      severity: "P0",
      productCode: balance.productCode,
      referenceId: null,
      message: `${balance.productCode} has a negative inventory balance.`,
    });
  }

  const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  urgentActions.sort((a, b) => rank[a.severity] - rank[b.severity] || String(a.productCode || "").localeCompare(String(b.productCode || "")));

  return {
    boardVersion: INVENTORY_CONTROL_VERSION,
    inventoryDayId: state.inventoryDayId,
    tenantId: state.tenantId,
    locationId: state.locationId,
    operatingDate: state.operatingDate,
    status: state.status,
    generatedAt: now,
    balances,
    openHolds: state.holds.filter((row) => row.status === "OPEN"),
    openExceptions: state.exceptions.filter((row) => row.status !== "RESOLVED"),
    counts: clone(state.counts),
    wasteTotalCookedLb: round(balances.reduce((sum, row) => sum + row.wasteCookedLb, 0)),
    urgentActions,
    urgentActionCount: urgentActions.length,
    closeBlockers: closeBlockers(state),
  };
}

export function createInventoryContingencySnapshot(state, generatedAt) {
  const board = deriveInventoryBoard(state, generatedAt);
  const core = {
    snapshotVersion: "PTT_INVENTORY_CONTINGENCY_11_6_0",
    generatedAt: board.generatedAt,
    inventoryDayId: state.inventoryDayId,
    tenantId: state.tenantId,
    locationId: state.locationId,
    operatingDate: state.operatingDate,
    status: state.status,
    balances: board.balances,
    openHolds: board.openHolds,
    openExceptions: board.openExceptions,
    counts: board.counts,
    notes: clone(state.notes),
    lastLedgerSequence: state.ledger.length,
    lastEventSequence: state.events.length,
  };
  return { ...core, snapshotId: `isnap-${stableHash(core)}` };
}

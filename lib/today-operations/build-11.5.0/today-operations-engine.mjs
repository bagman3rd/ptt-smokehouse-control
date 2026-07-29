export const TODAY_OPERATIONS_VERSION = "PTT_TODAY_OPERATIONS_11_5_0";

export const LOAD_STATUSES = Object.freeze([
  "PLANNED",
  "READY",
  "LOADED",
  "COOKING",
  "RESTING",
  "HOLDING",
  "READY_FOR_SERVICE",
  "COMPLETED",
  "CANCELLED",
  "EXCEPTION",
]);

export const STANDARD_STATUS_FLOW = Object.freeze([
  "PLANNED",
  "READY",
  "LOADED",
  "COOKING",
  "RESTING",
  "HOLDING",
  "READY_FOR_SERVICE",
  "COMPLETED",
]);

export const TERMINAL_LOAD_STATUSES = Object.freeze(["COMPLETED", "CANCELLED"]);

const PRODUCT_CODES = Object.freeze(["BRISKET", "PORK", "RIBS", "CHICKEN"]);
const MANAGER_ROLES = new Set(["ADMIN", "OWNER", "KM"]);
const OPERATIONS_ROLES = new Set(["ADMIN", "OWNER", "KM", "PITMASTER", "KC"]);
const EOD_ROLES = new Set(["ADMIN", "OWNER", "KM", "PITMASTER", "KC"]);
const READ_ONLY_ROLES = new Set(["VIEWER"]);

const NEXT_STATUS = Object.freeze({
  PLANNED: "READY",
  READY: "LOADED",
  LOADED: "COOKING",
  COOKING: "RESTING",
  RESTING: "HOLDING",
  HOLDING: "READY_FOR_SERVICE",
  READY_FOR_SERVICE: "COMPLETED",
  COMPLETED: null,
  CANCELLED: null,
  EXCEPTION: null,
});

const STATUS_TIMESTAMP_FIELDS = Object.freeze({
  READY: "actualReadyToLoadAt",
  LOADED: "actualLoadedAt",
  COOKING: "actualCookStartAt",
  RESTING: "actualCookEndAt",
  HOLDING: "actualHoldStartAt",
  READY_FOR_SERVICE: "actualReadyForServiceAt",
  COMPLETED: "actualCompletedAt",
  CANCELLED: "actualCancelledAt",
  EXCEPTION: "actualExceptionAt",
});

function round(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function requireFiniteNumber(value, field, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TodayOperationsValidationError(field, `${field} must be a finite number.`);
  }
  if (minimum !== undefined && number < minimum) {
    throw new TodayOperationsValidationError(field, `${field} must be at least ${minimum}.`);
  }
  if (maximum !== undefined && number > maximum) {
    throw new TodayOperationsValidationError(field, `${field} must be no more than ${maximum}.`);
  }
  return number;
}

function requireInteger(value, field, minimum = 0) {
  const number = requireFiniteNumber(value, field, minimum);
  if (!Number.isInteger(number)) {
    throw new TodayOperationsValidationError(field, `${field} must be a whole number.`);
  }
  return number;
}

function parseDateOnly(value, field = "operatingDate") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TodayOperationsValidationError(field, `${field} must use YYYY-MM-DD format.`);
  }
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new TodayOperationsValidationError(field, `${field} is invalid.`);
  }
  return date;
}

function parseTimestamp(value, field = "occurredAt") {
  const timestamp = String(value || "");
  const parsed = new Date(timestamp);
  if (!timestamp || Number.isNaN(parsed.getTime())) {
    throw new TodayOperationsValidationError(field, `${field} must be a valid ISO timestamp.`);
  }
  return timestamp;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = parseDateOnly(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return dateOnly(date);
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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function actorFromCommand(command) {
  const actor = command?.actor || {};
  const id = String(actor.id || "").trim();
  const name = String(actor.name || "").trim();
  const role = String(actor.role || "").trim().toUpperCase();
  if (id.length < 1) {
    throw new TodayOperationsValidationError("actor.id", "actor.id is required.");
  }
  if (name.length < 2) {
    throw new TodayOperationsValidationError("actor.name", "actor.name is required.");
  }
  if (!["ADMIN", "OWNER", "KM", "PITMASTER", "KC", "VIEWER"].includes(role)) {
    throw new TodayOperationsValidationError("actor.role", "actor.role is invalid.");
  }
  return { id, name, role };
}

function commandIdentity(command) {
  const commandId = String(command?.commandId || "").trim();
  if (commandId.length < 4) {
    throw new TodayOperationsValidationError("commandId", "commandId is required and must contain at least four characters.");
  }
  const occurredAt = parseTimestamp(command?.occurredAt);
  const type = String(command?.type || "").trim().toUpperCase();
  if (!type) {
    throw new TodayOperationsValidationError("type", "command type is required.");
  }
  return { commandId, occurredAt, type };
}

function requireRole(actor, allowedRoles, capability) {
  if (READ_ONLY_ROLES.has(actor.role) || !allowedRoles.has(actor.role)) {
    throw new TodayOperationsValidationError(
      "actor.role",
      `${actor.role} is not authorized to ${capability}.`,
    );
  }
}

function normalizeLoad(load, index) {
  const loadId = String(load?.loadId || `load-${index + 1}`).trim();
  const productCode = String(load?.productCode || "").toUpperCase();
  if (!PRODUCT_CODES.includes(productCode)) {
    throw new TodayOperationsValidationError(
      `loads.${loadId}.productCode`,
      `${loadId} has an unsupported product code.`,
    );
  }
  const plannedQuantity = requireFiniteNumber(
    load?.plannedQuantity,
    `loads.${loadId}.plannedQuantity`,
    0.01,
    1000000,
  );
  const cookedEquivalentPerOperationalUnitLb =
    load?.cookedEquivalentPerOperationalUnitLb === null ||
    load?.cookedEquivalentPerOperationalUnitLb === undefined ||
    load?.cookedEquivalentPerOperationalUnitLb === ""
      ? null
      : requireFiniteNumber(
          load.cookedEquivalentPerOperationalUnitLb,
          `loads.${loadId}.cookedEquivalentPerOperationalUnitLb`,
          0.001,
          10000,
        );
  const plannedStartOffsetMinutes = requireFiniteNumber(
    load?.plannedStartOffsetMinutes,
    `loads.${loadId}.plannedStartOffsetMinutes`,
    -10080,
    10080,
  );
  const plannedEndOffsetMinutes = requireFiniteNumber(
    load?.plannedEndOffsetMinutes,
    `loads.${loadId}.plannedEndOffsetMinutes`,
    -10080,
    10080,
  );
  if (plannedEndOffsetMinutes <= plannedStartOffsetMinutes) {
    throw new TodayOperationsValidationError(
      `loads.${loadId}.plannedEndOffsetMinutes`,
      `${loadId} planned end must be after planned start.`,
    );
  }
  return {
    loadId,
    productCode,
    productName: String(load?.productName || productCode),
    plannedQuantity: round(plannedQuantity, 3),
    actualQuantity: null,
    unit: String(load?.unit || "unit"),
    cookedEquivalentPerOperationalUnitLb:
      cookedEquivalentPerOperationalUnitLb === null
        ? null
        : round(cookedEquivalentPerOperationalUnitLb, 3),
    smokerId: String(load?.smokerId || ""),
    smokerName: String(load?.smokerName || ""),
    plannedStartOffsetMinutes,
    plannedEndOffsetMinutes,
    status: "PLANNED",
    statusBeforeException: null,
    owner: null,
    exception: null,
    actualTimes: {},
    notes: [],
    correctionHistory: [],
  };
}

function normalizeEodProduct(product) {
  const productCode = String(product?.productCode || "").toUpperCase();
  if (!PRODUCT_CODES.includes(productCode)) {
    throw new TodayOperationsValidationError(
      "eodProducts.productCode",
      `Unsupported EOD product code: ${productCode || "(blank)"}.`,
    );
  }
  const cookedWeightPerSealedUnitLb =
    product?.cookedWeightPerSealedUnitLb === null ||
    product?.cookedWeightPerSealedUnitLb === undefined ||
    product?.cookedWeightPerSealedUnitLb === ""
      ? null
      : requireFiniteNumber(
          product.cookedWeightPerSealedUnitLb,
          `eodProducts.${productCode}.cookedWeightPerSealedUnitLb`,
          0.001,
          10000,
        );
  return {
    productCode,
    productName: String(product?.productName || productCode),
    cookedWeightPerSealedUnitLb:
      cookedWeightPerSealedUnitLb === null
        ? null
        : round(cookedWeightPerSealedUnitLb, 3),
    sealedCarryoverEligible: Boolean(product?.sealedCarryoverEligible),
  };
}

function eventRecord(state, command, actor, type, payload) {
  const core = {
    sequence: state.eventLog.length + 1,
    type,
    commandId: command.commandId,
    occurredAt: command.occurredAt,
    actor,
    payload: deepClone(payload || {}),
  };
  return {
    ...core,
    eventId: `oe-${stableHash({ dayId: state.dayId, ...core })}`,
  };
}

function withAppliedCommand(state, command, event) {
  return {
    ...state,
    eventLog: [...state.eventLog, event],
    processedCommandIds: [...state.processedCommandIds, command.commandId],
    updatedAt: command.occurredAt,
  };
}

function findLoad(state, loadId) {
  const index = state.loads.findIndex((load) => load.loadId === loadId);
  if (index < 0) {
    throw new TodayOperationsValidationError("payload.loadId", `Unknown load: ${loadId}.`);
  }
  return { index, load: state.loads[index] };
}

function ensureOpenDay(state) {
  if (state.status !== "OPEN") {
    throw new TodayOperationsValidationError("day", "The operating day is not open.");
  }
}

function statusRank(status) {
  return STANDARD_STATUS_FLOW.indexOf(status);
}

function nextActionForLoad(load) {
  if (load.status === "EXCEPTION") return "Resolve exception";
  if (load.status === "CANCELLED") return "Cancelled";
  if (load.status === "COMPLETED") return "Complete";
  const next = NEXT_STATUS[load.status];
  const labels = {
    READY: "Mark ready",
    LOADED: "Confirm loaded",
    COOKING: "Start cooking",
    RESTING: "Start resting",
    HOLDING: "Start holding",
    READY_FOR_SERVICE: "Mark ready for service",
    COMPLETED: "Complete load",
  };
  return labels[next] || "Review";
}

function producedCookedEquivalentLb(state, productCode) {
  return round(
    state.loads
      .filter(
        (load) =>
          load.productCode === productCode &&
          load.status === "COMPLETED" &&
          load.actualQuantity !== null &&
          load.cookedEquivalentPerOperationalUnitLb !== null,
      )
      .reduce(
        (sum, load) =>
          sum +
          Number(load.actualQuantity) *
            Number(load.cookedEquivalentPerOperationalUnitLb),
        0,
      ),
    3,
  );
}

function eodSubmissionValidation(state, payload) {
  const productCode = String(payload?.productCode || "").toUpperCase();
  const config = state.eod.products.find(
    (product) => product.productCode === productCode,
  );
  if (!config) {
    throw new TodayOperationsValidationError(
      "payload.productCode",
      `Unknown EOD product: ${productCode || "(blank)"}.`,
    );
  }
  const sealedUnits = requireInteger(
    payload?.sealedUnits,
    "payload.sealedUnits",
    0,
  );
  const openCookedLb = requireFiniteNumber(
    payload?.openCookedLb,
    "payload.openCookedLb",
    0,
    1000000,
  );
  const producedLb = producedCookedEquivalentLb(state, productCode);
  const warnings = [];
  let remainingEquivalentLb = round(openCookedLb, 3);

  if (sealedUnits > 0 && config.cookedWeightPerSealedUnitLb === null) {
    warnings.push(
      `${config.productName} sealed units cannot be converted to cooked pounds because cooked weight per sealed unit is not configured.`,
    );
  } else if (config.cookedWeightPerSealedUnitLb !== null) {
    remainingEquivalentLb = round(
      openCookedLb + sealedUnits * config.cookedWeightPerSealedUnitLb,
      3,
    );
  }

  if (
    config.cookedWeightPerSealedUnitLb !== null &&
    remainingEquivalentLb > producedLb + 0.01
  ) {
    throw new TodayOperationsValidationError(
      "payload",
      `${config.productName} remaining quantity ${remainingEquivalentLb} lb exceeds completed production ${producedLb} lb.`,
    );
  }

  return {
    config,
    productCode,
    sealedUnits,
    openCookedLb: round(openCookedLb, 3),
    producedCookedEquivalentLb: producedLb,
    remainingCookedEquivalentLb: remainingEquivalentLb,
    nextDayEligibleSealedUnits: config.sealedCarryoverEligible
      ? sealedUnits
      : 0,
    nextDayEligibleOpenCookedLb: round(openCookedLb, 3),
    warnings,
  };
}

function eodStatus(state) {
  const completed = state.eod.products.filter(
    (product) => state.eod.submissions[product.productCode],
  ).length;
  if (completed === 0) return "NOT_STARTED";
  if (completed === state.eod.products.length) return "COMPLETE";
  return "IN_PROGRESS";
}

function closeBlockers(state) {
  const blockers = [];
  const nonTerminal = state.loads.filter(
    (load) => !TERMINAL_LOAD_STATUSES.includes(load.status),
  );
  if (nonTerminal.length) {
    blockers.push(
      `${nonTerminal.length} load${nonTerminal.length === 1 ? "" : "s"} are not completed or cancelled.`,
    );
  }
  const exceptions = state.loads.filter(
    (load) => load.status === "EXCEPTION" || load.exception,
  );
  if (exceptions.length) {
    blockers.push(
      `${exceptions.length} unresolved load exception${exceptions.length === 1 ? "" : "s"} remain.`,
    );
  }
  const missingEod = state.eod.products.filter(
    (product) => !state.eod.submissions[product.productCode],
  );
  if (missingEod.length) {
    blockers.push(
      `EOD counts are missing for ${missingEod
        .map((product) => product.productName)
        .join(", ")}.`,
    );
  }
  return blockers;
}

function eventDuplicateResult(state, commandId) {
  return {
    state,
    result: {
      status: "DUPLICATE",
      commandId,
      eventId:
        state.eventLog.find((event) => event.commandId === commandId)?.eventId ||
        null,
    },
  };
}

export class TodayOperationsValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "TodayOperationsValidationError";
    this.field = field;
  }
}

export function createOperatingDay(input) {
  const operatingDateObject = parseDateOnly(input?.operatingDate);
  const loads = (input?.loads || []).map(normalizeLoad);
  if (!loads.length) {
    throw new TodayOperationsValidationError(
      "loads",
      "At least one approved production load is required.",
    );
  }
  const loadIds = new Set();
  for (const load of loads) {
    if (loadIds.has(load.loadId)) {
      throw new TodayOperationsValidationError(
        "loads.loadId",
        `Duplicate load ID: ${load.loadId}.`,
      );
    }
    loadIds.add(load.loadId);
  }

  const eodProducts = (input?.eodProducts || []).map(normalizeEodProduct);
  const productCodes = new Set(eodProducts.map((product) => product.productCode));
  for (const productCode of PRODUCT_CODES) {
    if (!productCodes.has(productCode)) {
      throw new TodayOperationsValidationError(
        "eodProducts",
        `EOD configuration is missing ${productCode}.`,
      );
    }
  }

  const core = {
    engineVersion: TODAY_OPERATIONS_VERSION,
    operatingDate: input.operatingDate,
    dayOfWeek: operatingDateObject.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }),
    locationTimezone: String(
      input?.locationTimezone || "America/New_York",
    ),
    planId: String(input?.planId || ""),
    forecastCalculationId: String(input?.forecastCalculationId || ""),
    weatherNote: String(input?.weatherNote || ""),
    eventNote: String(input?.eventNote || ""),
    forecastSummary: deepClone(input?.forecastSummary || {}),
    status: "OPEN",
    loads,
    eod: {
      products: eodProducts,
      submissions: {},
      corrections: [],
      status: "NOT_STARTED",
    },
    eventLog: [],
    processedCommandIds: [],
    close: null,
    rollover: null,
    createdAt: String(input?.createdAt || `${input.operatingDate}T04:00:00.000Z`),
    updatedAt: String(input?.createdAt || `${input.operatingDate}T04:00:00.000Z`),
  };

  return {
    ...core,
    dayId: `od-${stableHash(core)}`,
  };
}

export function executeOperatingDayCommand(currentState, inputCommand) {
  const state = deepClone(currentState);
  if (!state || state.engineVersion !== TODAY_OPERATIONS_VERSION) {
    throw new TodayOperationsValidationError(
      "day",
      "Command requires a Build 11.5.0 operating day.",
    );
  }
  const identity = commandIdentity(inputCommand);
  const command = {
    ...deepClone(inputCommand),
    ...identity,
    payload: deepClone(inputCommand?.payload || {}),
  };
  if (state.processedCommandIds.includes(command.commandId)) {
    return eventDuplicateResult(state, command.commandId);
  }
  const actor = actorFromCommand(command);
  ensureOpenDay(state);

  if (command.type === "ASSIGN_LOAD_OWNER") {
    requireRole(actor, MANAGER_ROLES, "assign load ownership");
    const { index, load } = findLoad(state, String(command.payload.loadId || ""));
    const owner = {
      id: String(command.payload?.owner?.id || "").trim(),
      name: String(command.payload?.owner?.name || "").trim(),
      role: String(command.payload?.owner?.role || "").trim().toUpperCase(),
    };
    if (!owner.id || owner.name.length < 2 || !OPERATIONS_ROLES.has(owner.role)) {
      throw new TodayOperationsValidationError(
        "payload.owner",
        "A valid operations owner is required.",
      );
    }
    const updatedLoads = [...state.loads];
    updatedLoads[index] = { ...load, owner };
    const event = eventRecord(state, command, actor, "LOAD_OWNER_ASSIGNED", {
      loadId: load.loadId,
      priorOwner: load.owner,
      newOwner: owner,
    });
    const nextState = withAppliedCommand(
      { ...state, loads: updatedLoads },
      command,
      event,
    );
    return { state: nextState, result: { status: "APPLIED", eventId: event.eventId } };
  }

  if (command.type === "SET_LOAD_STATUS") {
    requireRole(actor, OPERATIONS_ROLES, "advance load status");
    const targetStatus = String(command.payload.status || "").toUpperCase();
    if (!LOAD_STATUSES.includes(targetStatus)) {
      throw new TodayOperationsValidationError(
        "payload.status",
        "Target load status is invalid.",
      );
    }
    if (["CANCELLED", "EXCEPTION"].includes(targetStatus)) {
      throw new TodayOperationsValidationError(
        "payload.status",
        "Use CANCEL_LOAD or FLAG_EXCEPTION for this status.",
      );
    }
    const { index, load } = findLoad(state, String(command.payload.loadId || ""));
    if (load.status === "EXCEPTION") {
      throw new TodayOperationsValidationError(
        "payload.status",
        "Resolve the exception before advancing the load.",
      );
    }
    const expected = NEXT_STATUS[load.status];
    if (targetStatus !== expected) {
      throw new TodayOperationsValidationError(
        "payload.status",
        `${load.loadId} must move from ${load.status} to ${expected || "a terminal state"}; ${targetStatus} is not allowed.`,
      );
    }

    let actualQuantity = load.actualQuantity;
    const note = String(command.payload.note || "").trim();
    const reason = String(command.payload.reason || "").trim();
    if (targetStatus === "LOADED") {
      actualQuantity = requireFiniteNumber(
        command.payload.actualQuantity,
        "payload.actualQuantity",
        0.01,
        1000000,
      );
      const variancePercent =
        Math.abs(actualQuantity - load.plannedQuantity) /
        load.plannedQuantity *
        100;
      if (variancePercent > 10 && reason.length < 5) {
        throw new TodayOperationsValidationError(
          "payload.reason",
          "Actual load quantity differing by more than 10% requires a reason.",
        );
      }
    }

    const updatedLoad = {
      ...load,
      status: targetStatus,
      actualQuantity:
        actualQuantity === null ? null : round(actualQuantity, 3),
      actualTimes: {
        ...load.actualTimes,
        [STATUS_TIMESTAMP_FIELDS[targetStatus]]: command.occurredAt,
      },
      notes: note
        ? [
            ...load.notes,
            {
              noteId: `note-${stableHash({
                loadId: load.loadId,
                commandId: command.commandId,
                note,
              })}`,
              note,
              actor,
              occurredAt: command.occurredAt,
            },
          ]
        : load.notes,
    };
    const updatedLoads = [...state.loads];
    updatedLoads[index] = updatedLoad;
    const event = eventRecord(state, command, actor, "LOAD_STATUS_CHANGED", {
      loadId: load.loadId,
      priorStatus: load.status,
      newStatus: targetStatus,
      actualQuantity: updatedLoad.actualQuantity,
      reason,
      note,
    });
    const nextState = withAppliedCommand(
      { ...state, loads: updatedLoads },
      command,
      event,
    );
    return {
      state: nextState,
      result: {
        status: "APPLIED",
        eventId: event.eventId,
        loadStatus: targetStatus,
      },
    };
  }

  if (command.type === "FLAG_EXCEPTION") {
    requireRole(actor, OPERATIONS_ROLES, "flag a load exception");
    const { index, load } = findLoad(state, String(command.payload.loadId || ""));
    if (TERMINAL_LOAD_STATUSES.includes(load.status)) {
      throw new TodayOperationsValidationError(
        "payload.loadId",
        "A terminal load cannot be placed in exception status.",
      );
    }
    if (load.status === "EXCEPTION") {
      throw new TodayOperationsValidationError(
        "payload.loadId",
        "This load already has an active exception.",
      );
    }
    const reason = String(command.payload.reason || "").trim();
    if (reason.length < 5) {
      throw new TodayOperationsValidationError(
        "payload.reason",
        "An exception reason of at least five characters is required.",
      );
    }
    const severity = String(command.payload.severity || "P1").toUpperCase();
    if (!["P0", "P1", "P2", "P3"].includes(severity)) {
      throw new TodayOperationsValidationError(
        "payload.severity",
        "Exception severity must be P0, P1, P2 or P3.",
      );
    }
    const exception = {
      exceptionId: `ex-${stableHash({
        dayId: state.dayId,
        loadId: load.loadId,
        commandId: command.commandId,
      })}`,
      severity,
      reason,
      openedAt: command.occurredAt,
      openedBy: actor,
      owner: command.payload.owner || load.owner || null,
      resolution: null,
      resolvedAt: null,
      resolvedBy: null,
    };
    const updatedLoads = [...state.loads];
    updatedLoads[index] = {
      ...load,
      statusBeforeException: load.status,
      status: "EXCEPTION",
      exception,
      actualTimes: {
        ...load.actualTimes,
        actualExceptionAt: command.occurredAt,
      },
    };
    const event = eventRecord(state, command, actor, "LOAD_EXCEPTION_OPENED", {
      loadId: load.loadId,
      priorStatus: load.status,
      exception,
    });
    const nextState = withAppliedCommand(
      { ...state, loads: updatedLoads },
      command,
      event,
    );
    return { state: nextState, result: { status: "APPLIED", eventId: event.eventId } };
  }

  if (command.type === "RESOLVE_EXCEPTION") {
    requireRole(actor, MANAGER_ROLES, "resolve a load exception");
    const { index, load } = findLoad(state, String(command.payload.loadId || ""));
    if (load.status !== "EXCEPTION" || !load.exception) {
      throw new TodayOperationsValidationError(
        "payload.loadId",
        "This load does not have an active exception.",
      );
    }
    const resolution = String(command.payload.resolution || "").trim();
    if (resolution.length < 5) {
      throw new TodayOperationsValidationError(
        "payload.resolution",
        "A resolution of at least five characters is required.",
      );
    }
    const resumeStatus = load.statusBeforeException || "PLANNED";
    const resolvedException = {
      ...load.exception,
      resolution,
      resolvedAt: command.occurredAt,
      resolvedBy: actor,
    };
    const updatedLoads = [...state.loads];
    updatedLoads[index] = {
      ...load,
      status: resumeStatus,
      statusBeforeException: null,
      exception: null,
      notes: [
        ...load.notes,
        {
          noteId: `note-${stableHash({
            loadId: load.loadId,
            commandId: command.commandId,
            resolution,
          })}`,
          note: `Exception resolved: ${resolution}`,
          actor,
          occurredAt: command.occurredAt,
        },
      ],
    };
    const event = eventRecord(state, command, actor, "LOAD_EXCEPTION_RESOLVED", {
      loadId: load.loadId,
      resumeStatus,
      exception: resolvedException,
    });
    const nextState = withAppliedCommand(
      { ...state, loads: updatedLoads },
      command,
      event,
    );
    return {
      state: nextState,
      result: {
        status: "APPLIED",
        eventId: event.eventId,
        loadStatus: resumeStatus,
      },
    };
  }

  if (command.type === "CANCEL_LOAD") {
    requireRole(actor, MANAGER_ROLES, "cancel a load");
    const { index, load } = findLoad(state, String(command.payload.loadId || ""));
    if (TERMINAL_LOAD_STATUSES.includes(load.status)) {
      throw new TodayOperationsValidationError(
        "payload.loadId",
        "This load is already terminal.",
      );
    }
    const reason = String(command.payload.reason || "").trim();
    if (reason.length < 5) {
      throw new TodayOperationsValidationError(
        "payload.reason",
        "A cancellation reason is required.",
      );
    }
    const updatedLoads = [...state.loads];
    updatedLoads[index] = {
      ...load,
      status: "CANCELLED",
      statusBeforeException: null,
      exception: null,
      actualTimes: {
        ...load.actualTimes,
        actualCancelledAt: command.occurredAt,
      },
      notes: [
        ...load.notes,
        {
          noteId: `note-${stableHash({
            loadId: load.loadId,
            commandId: command.commandId,
            reason,
          })}`,
          note: `Cancelled: ${reason}`,
          actor,
          occurredAt: command.occurredAt,
        },
      ],
    };
    const event = eventRecord(state, command, actor, "LOAD_CANCELLED", {
      loadId: load.loadId,
      priorStatus: load.status,
      reason,
    });
    const nextState = withAppliedCommand(
      { ...state, loads: updatedLoads },
      command,
      event,
    );
    return { state: nextState, result: { status: "APPLIED", eventId: event.eventId } };
  }

  if (command.type === "CORRECT_LOAD_STATUS") {
    requireRole(actor, MANAGER_ROLES, "correct load status");
    const { index, load } = findLoad(state, String(command.payload.loadId || ""));
    const newStatus = String(command.payload.status || "").toUpperCase();
    if (!STANDARD_STATUS_FLOW.includes(newStatus)) {
      throw new TodayOperationsValidationError(
        "payload.status",
        "A corrected load status must use the standard status flow.",
      );
    }
    const reason = String(command.payload.reason || "").trim();
    if (reason.length < 5) {
      throw new TodayOperationsValidationError(
        "payload.reason",
        "A correction reason is required.",
      );
    }
    const correction = {
      correctionId: `lc-${stableHash({
        loadId: load.loadId,
        commandId: command.commandId,
      })}`,
      priorStatus: load.status,
      newStatus,
      reason,
      actor,
      occurredAt: command.occurredAt,
    };
    const updatedLoads = [...state.loads];
    updatedLoads[index] = {
      ...load,
      status: newStatus,
      statusBeforeException: null,
      exception: null,
      correctionHistory: [...load.correctionHistory, correction],
    };
    const event = eventRecord(state, command, actor, "LOAD_STATUS_CORRECTED", {
      loadId: load.loadId,
      correction,
    });
    const nextState = withAppliedCommand(
      { ...state, loads: updatedLoads },
      command,
      event,
    );
    return {
      state: nextState,
      result: {
        status: "APPLIED",
        eventId: event.eventId,
        loadStatus: newStatus,
      },
    };
  }

  if (command.type === "ADD_LOAD_NOTE") {
    requireRole(actor, OPERATIONS_ROLES, "add a load note");
    const { index, load } = findLoad(state, String(command.payload.loadId || ""));
    const note = String(command.payload.note || "").trim();
    if (note.length < 2) {
      throw new TodayOperationsValidationError(
        "payload.note",
        "A note is required.",
      );
    }
    const noteRecord = {
      noteId: `note-${stableHash({
        loadId: load.loadId,
        commandId: command.commandId,
        note,
      })}`,
      note,
      actor,
      occurredAt: command.occurredAt,
      offlineDraftRecovered: Boolean(command.payload.offlineDraftRecovered),
    };
    const updatedLoads = [...state.loads];
    updatedLoads[index] = {
      ...load,
      notes: [...load.notes, noteRecord],
    };
    const event = eventRecord(state, command, actor, "LOAD_NOTE_ADDED", {
      loadId: load.loadId,
      note: noteRecord,
    });
    const nextState = withAppliedCommand(
      { ...state, loads: updatedLoads },
      command,
      event,
    );
    return { state: nextState, result: { status: "APPLIED", eventId: event.eventId } };
  }

  if (command.type === "SUBMIT_EOD_PRODUCT") {
    requireRole(actor, EOD_ROLES, "submit an EOD count");
    const validated = eodSubmissionValidation(state, command.payload);
    if (state.eod.submissions[validated.productCode]) {
      throw new TodayOperationsValidationError(
        "payload.productCode",
        "An EOD submission already exists; use manager correction.",
      );
    }
    const submission = {
      submissionId: `eod-${stableHash({
        dayId: state.dayId,
        productCode: validated.productCode,
        commandId: command.commandId,
      })}`,
      productCode: validated.productCode,
      productName: validated.config.productName,
      sealedUnits: validated.sealedUnits,
      openCookedLb: validated.openCookedLb,
      producedCookedEquivalentLb: validated.producedCookedEquivalentLb,
      remainingCookedEquivalentLb: validated.remainingCookedEquivalentLb,
      nextDayEligibleSealedUnits: validated.nextDayEligibleSealedUnits,
      nextDayEligibleOpenCookedLb: validated.nextDayEligibleOpenCookedLb,
      warnings: validated.warnings,
      note: String(command.payload.note || "").trim(),
      submittedBy: actor,
      submittedAt: command.occurredAt,
      version: 1,
    };
    const nextEod = {
      ...state.eod,
      submissions: {
        ...state.eod.submissions,
        [validated.productCode]: submission,
      },
    };
    const stateWithEod = {
      ...state,
      eod: {
        ...nextEod,
        status: eodStatus({ ...state, eod: nextEod }),
      },
    };
    const event = eventRecord(state, command, actor, "EOD_PRODUCT_SUBMITTED", {
      submission,
    });
    const nextState = withAppliedCommand(stateWithEod, command, event);
    return {
      state: nextState,
      result: {
        status: "APPLIED",
        eventId: event.eventId,
        eodStatus: nextState.eod.status,
      },
    };
  }

  if (command.type === "CORRECT_EOD_PRODUCT") {
    requireRole(actor, MANAGER_ROLES, "correct an EOD count");
    const productCode = String(command.payload.productCode || "").toUpperCase();
    const prior = state.eod.submissions[productCode];
    if (!prior) {
      throw new TodayOperationsValidationError(
        "payload.productCode",
        "No original EOD submission exists for correction.",
      );
    }
    const reason = String(command.payload.reason || "").trim();
    if (reason.length < 5) {
      throw new TodayOperationsValidationError(
        "payload.reason",
        "An EOD correction reason is required.",
      );
    }
    const validated = eodSubmissionValidation(state, command.payload);
    const correction = {
      correctionId: `ec-${stableHash({
        dayId: state.dayId,
        productCode,
        commandId: command.commandId,
      })}`,
      productCode,
      priorSubmission: deepClone(prior),
      reason,
      correctedBy: actor,
      correctedAt: command.occurredAt,
    };
    const submission = {
      ...prior,
      submissionId: `eod-${stableHash({
        dayId: state.dayId,
        productCode,
        commandId: command.commandId,
      })}`,
      sealedUnits: validated.sealedUnits,
      openCookedLb: validated.openCookedLb,
      producedCookedEquivalentLb: validated.producedCookedEquivalentLb,
      remainingCookedEquivalentLb: validated.remainingCookedEquivalentLb,
      nextDayEligibleSealedUnits: validated.nextDayEligibleSealedUnits,
      nextDayEligibleOpenCookedLb: validated.nextDayEligibleOpenCookedLb,
      warnings: validated.warnings,
      note: String(command.payload.note || "").trim(),
      submittedBy: actor,
      submittedAt: command.occurredAt,
      version: Number(prior.version || 1) + 1,
      correctionReason: reason,
    };
    const nextEod = {
      ...state.eod,
      submissions: {
        ...state.eod.submissions,
        [productCode]: submission,
      },
      corrections: [...state.eod.corrections, correction],
    };
    const event = eventRecord(state, command, actor, "EOD_PRODUCT_CORRECTED", {
      correctionId: correction.correctionId,
      productCode,
      priorSubmissionId: prior.submissionId,
      newSubmission: submission,
      reason,
    });
    const nextState = withAppliedCommand(
      { ...state, eod: { ...nextEod, status: eodStatus({ ...state, eod: nextEod }) } },
      command,
      event,
    );
    return {
      state: nextState,
      result: {
        status: "APPLIED",
        eventId: event.eventId,
        eodStatus: nextState.eod.status,
      },
    };
  }

  if (command.type === "CLOSE_OPERATING_DAY") {
    requireRole(actor, MANAGER_ROLES, "close the operating day");
    const blockers = closeBlockers(state);
    if (blockers.length) {
      throw new TodayOperationsValidationError(
        "day",
        `Operating day cannot close: ${blockers.join(" ")}`,
      );
    }
    const close = {
      closeId: `close-${stableHash({
        dayId: state.dayId,
        commandId: command.commandId,
      })}`,
      closedAt: command.occurredAt,
      closedBy: actor,
      reason: String(command.payload.reason || "Operating day complete"),
      eodSubmissionIds: Object.values(state.eod.submissions).map(
        (submission) => submission.submissionId,
      ),
    };
    const event = eventRecord(state, command, actor, "OPERATING_DAY_CLOSED", {
      close,
    });
    const nextState = withAppliedCommand(
      { ...state, status: "CLOSED", close },
      command,
      event,
    );
    return {
      state: nextState,
      result: {
        status: "APPLIED",
        eventId: event.eventId,
        dayStatus: "CLOSED",
      },
    };
  }

  throw new TodayOperationsValidationError(
    "type",
    `Unsupported command type: ${command.type}.`,
  );
}

export function deriveTodayBoard(state, nowIso) {
  if (!state || state.engineVersion !== TODAY_OPERATIONS_VERSION) {
    throw new TodayOperationsValidationError(
      "day",
      "Today board requires a Build 11.5.0 operating day.",
    );
  }
  const now = new Date(parseTimestamp(nowIso, "nowIso"));
  const operatingMidnight = new Date(`${state.operatingDate}T00:00:00Z`);
  const offsetMinutes = Math.floor(
    (now.getTime() - operatingMidnight.getTime()) / 60000,
  );

  const urgentActions = [];
  const severityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };

  for (const load of state.loads) {
    const active = !TERMINAL_LOAD_STATUSES.includes(load.status);
    if (active && !load.owner) {
      urgentActions.push({
        type: "UNASSIGNED_LOAD",
        severity: "P2",
        loadId: load.loadId,
        message: `${load.productName} has no assigned owner.`,
      });
    }
    if (
      active &&
      statusRank(load.status) < statusRank("LOADED") &&
      offsetMinutes > load.plannedStartOffsetMinutes + 15
    ) {
      urgentActions.push({
        type: "MISSED_LOAD_START",
        severity: "P1",
        loadId: load.loadId,
        message: `${load.productName} is past its planned load start.`,
      });
    }
    if (
      active &&
      load.status !== "EXCEPTION" &&
      statusRank(load.status) < statusRank("READY_FOR_SERVICE") &&
      offsetMinutes > load.plannedEndOffsetMinutes
    ) {
      urgentActions.push({
        type: "SERVICE_READINESS_RISK",
        severity: "P1",
        loadId: load.loadId,
        message: `${load.productName} is past its planned completion time and is not ready for service.`,
      });
    }
    if (load.status === "EXCEPTION" || load.exception) {
      urgentActions.push({
        type: "LOAD_EXCEPTION",
        severity: load.exception?.severity || "P1",
        loadId: load.loadId,
        message: `${load.productName} has an active exception: ${load.exception?.reason || "Review required"}.`,
      });
    }
  }

  if (state.status === "OPEN" && offsetMinutes >= 1260 && state.eod.status !== "COMPLETE") {
    urgentActions.push({
      type: "EOD_INCOMPLETE",
      severity: "P1",
      loadId: null,
      message: "Quick EOD is incomplete after 9:00 p.m.",
    });
  }
  if (state.status === "OPEN" && offsetMinutes >= 1320) {
    urgentActions.push({
      type: "OPERATING_DAY_CLOSE_DUE",
      severity: "P1",
      loadId: null,
      message: "The operating day is still open after 10:00 p.m.",
    });
  }

  urgentActions.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      String(a.loadId || "").localeCompare(String(b.loadId || "")) ||
      a.type.localeCompare(b.type),
  );

  const loadCards = state.loads.map((load) => ({
    loadId: load.loadId,
    productCode: load.productCode,
    productName: load.productName,
    plannedQuantity: load.plannedQuantity,
    actualQuantity: load.actualQuantity,
    unit: load.unit,
    smokerId: load.smokerId,
    smokerName: load.smokerName,
    plannedStartOffsetMinutes: load.plannedStartOffsetMinutes,
    plannedEndOffsetMinutes: load.plannedEndOffsetMinutes,
    actualTimes: deepClone(load.actualTimes),
    status: load.status,
    owner: deepClone(load.owner),
    nextAction: nextActionForLoad(load),
    exception: deepClone(load.exception),
    noteCount: load.notes.length,
  }));

  const statusCounts = Object.fromEntries(
    LOAD_STATUSES.map((status) => [
      status,
      state.loads.filter((load) => load.status === status).length,
    ]),
  );

  return {
    boardVersion: TODAY_OPERATIONS_VERSION,
    dayId: state.dayId,
    operatingDate: state.operatingDate,
    dayOfWeek: state.dayOfWeek,
    status: state.status,
    weatherNote: state.weatherNote,
    eventNote: state.eventNote,
    forecastSummary: deepClone(state.forecastSummary),
    urgentActions,
    urgentActionCount: urgentActions.length,
    statusCounts,
    eodStatus: state.eod.status,
    closeBlockers: closeBlockers(state),
    loadCards,
  };
}

export function createContingencySnapshot(state, generatedAt) {
  const board = deriveTodayBoard(state, generatedAt);
  const snapshotCore = {
    snapshotVersion: "PTT_TODAY_CONTINGENCY_11_5_0",
    dayId: state.dayId,
    generatedAt: parseTimestamp(generatedAt, "generatedAt"),
    operatingDate: state.operatingDate,
    dayOfWeek: state.dayOfWeek,
    locationTimezone: state.locationTimezone,
    planId: state.planId,
    forecastCalculationId: state.forecastCalculationId,
    weatherNote: state.weatherNote,
    eventNote: state.eventNote,
    forecastSummary: deepClone(state.forecastSummary),
    dayStatus: state.status,
    urgentActions: board.urgentActions,
    loads: state.loads.map((load) => ({
      loadId: load.loadId,
      productName: load.productName,
      plannedQuantity: load.plannedQuantity,
      actualQuantity: load.actualQuantity,
      unit: load.unit,
      smokerName: load.smokerName,
      plannedStartOffsetMinutes: load.plannedStartOffsetMinutes,
      plannedEndOffsetMinutes: load.plannedEndOffsetMinutes,
      status: load.status,
      owner: deepClone(load.owner),
      actualTimes: deepClone(load.actualTimes),
      notes: deepClone(load.notes),
      exception: deepClone(load.exception),
    })),
    eod: deepClone(state.eod),
    lastEventSequence: state.eventLog.length,
  };
  return {
    ...snapshotCore,
    snapshotId: `snapshot-${stableHash(snapshotCore)}`,
  };
}

export function rolloverOperatingDay(closedState, nextDayInput, inputCommand) {
  const state = deepClone(closedState);
  if (!state || state.engineVersion !== TODAY_OPERATIONS_VERSION) {
    throw new TodayOperationsValidationError(
      "day",
      "Rollover requires a Build 11.5.0 operating day.",
    );
  }
  const identity = commandIdentity(inputCommand);
  const command = {
    ...deepClone(inputCommand),
    ...identity,
    payload: deepClone(inputCommand?.payload || {}),
  };
  if (state.processedCommandIds.includes(command.commandId)) {
    return {
      closedDay: state,
      nextDay: null,
      carryover: state.rollover?.carryover || [],
      result: { status: "DUPLICATE", commandId: command.commandId },
    };
  }
  const actor = actorFromCommand(command);
  requireRole(actor, MANAGER_ROLES, "roll over the operating day");
  if (state.status !== "CLOSED" || !state.close) {
    throw new TodayOperationsValidationError(
      "day",
      "The operating day must be closed before rollover.",
    );
  }
  if (state.rollover) {
    throw new TodayOperationsValidationError(
      "day",
      "This operating day has already been rolled over.",
    );
  }
  const expectedNextDate = addDays(state.operatingDate, 1);
  if (nextDayInput?.operatingDate !== expectedNextDate) {
    throw new TodayOperationsValidationError(
      "nextDayInput.operatingDate",
      `Next operating date must be ${expectedNextDate}.`,
    );
  }

  const carryover = state.eod.products.map((product) => {
    const submission = state.eod.submissions[product.productCode];
    return {
      productCode: product.productCode,
      productName: product.productName,
      sourceOperatingDate: state.operatingDate,
      sealedUnitsRecorded: submission?.sealedUnits || 0,
      eligibleSealedUnits:
        product.sealedCarryoverEligible ? submission?.sealedUnits || 0 : 0,
      openCookedLbRecorded: submission?.openCookedLb || 0,
      eligibleOpenCookedLb: submission?.openCookedLb || 0,
      sourceSubmissionId: submission?.submissionId || null,
    };
  });

  const nextDay = createOperatingDay({
    ...deepClone(nextDayInput),
    createdAt: command.occurredAt,
    priorDayCarryover: carryover,
  });
  nextDay.priorDayCarryover = carryover;

  const rollover = {
    rolloverId: `roll-${stableHash({
      dayId: state.dayId,
      commandId: command.commandId,
      nextDayId: nextDay.dayId,
    })}`,
    rolledOverAt: command.occurredAt,
    rolledOverBy: actor,
    nextDayId: nextDay.dayId,
    nextOperatingDate: nextDay.operatingDate,
    carryover,
  };
  const event = eventRecord(state, command, actor, "OPERATING_DAY_ROLLED_OVER", {
    rollover,
  });
  const updatedClosedDay = withAppliedCommand(
    { ...state, rollover },
    command,
    event,
  );

  return {
    closedDay: updatedClosedDay,
    nextDay,
    carryover,
    result: {
      status: "APPLIED",
      eventId: event.eventId,
      nextDayId: nextDay.dayId,
    },
  };
}

export const PRODUCTION_CALCULATION_VERSION = "PTT_PRODUCTION_PLAN_11_4_0";

export const PRODUCTION_PRODUCTS = Object.freeze([
  { code: "BRISKET", name: "Brisket" },
  { code: "PORK", name: "Pork" },
  { code: "RIBS", name: "Ribs" },
  { code: "CHICKEN", name: "Pulled Chicken" },
]);

export const SMOKER_COOK_WINDOWS = Object.freeze([
  "Overnight only",
  "Same-day only",
  "All day / flexible",
  "Backup / overflow only",
  "Not currently active",
]);

const PRODUCT_NAMES = Object.freeze(
  Object.fromEntries(PRODUCTION_PRODUCTS.map((product) => [product.code, product.name])),
);

function round(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function requireFiniteNumber(value, field, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ProductionValidationError(field, `${field} must be a finite number.`);
  }
  if (minimum !== undefined && number < minimum) {
    throw new ProductionValidationError(field, `${field} must be at least ${minimum}.`);
  }
  if (maximum !== undefined && number > maximum) {
    throw new ProductionValidationError(field, `${field} must be no more than ${maximum}.`);
  }
  return number;
}

function requireInteger(value, field, minimum = 0) {
  const number = requireFiniteNumber(value, field, minimum);
  if (!Number.isInteger(number)) {
    throw new ProductionValidationError(field, `${field} must be a whole number.`);
  }
  return number;
}

function parseServiceDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ProductionValidationError("serviceDate", "serviceDate must use YYYY-MM-DD.");
  }
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ProductionValidationError("serviceDate", "serviceDate is invalid.");
  }
  return date;
}

function dateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function priorDate(serviceDate) {
  const date = new Date(`${serviceDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return dateOnly(date);
}

function formatOffset(serviceDate, offsetMinutes) {
  const date = new Date(`${serviceDate}T00:00:00Z`);
  date.setUTCMinutes(date.getUTCMinutes() + offsetMinutes);
  return {
    iso: date.toISOString(),
    localLabel: `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} restaurant local`,
    date: date.toISOString().slice(0, 10),
    time: date.toISOString().slice(11, 16),
  };
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

function cookWindowSupports(cookWindow, classification) {
  if (cookWindow === "Not currently active") return false;
  if (cookWindow === "All day / flexible") return true;
  if (cookWindow === "Backup / overflow only") return true;
  if (classification === "OVERNIGHT") return cookWindow === "Overnight only";
  if (classification === "SAME_DAY") return cookWindow === "Same-day only";
  return false;
}

function backupPriority(smoker) {
  return smoker.cookWindow === "Backup / overflow only" ? 1 : 0;
}

function findEarliestSlot(smoker, requirement, bookings) {
  const duration = requirement.schedule.durationMinutes;
  const windowStart = requirement.schedule.windowStartOffsetMinutes;
  const windowEnd = requirement.schedule.windowEndOffsetMinutes;
  const smokerBookings = bookings
    .filter((booking) => booking.smokerId === smoker.id)
    .sort((a, b) => a.startOffsetMinutes - b.startOffsetMinutes);

  const availability = Array.isArray(smoker.availability) && smoker.availability.length
    ? smoker.availability
    : [{ startOffsetMinutes: -1440, endOffsetMinutes: 1440 }];

  const slots = [];
  for (const range of availability) {
    const rangeStart = Math.max(
      windowStart,
      requireFiniteNumber(
        range.startOffsetMinutes,
        `smokers.${smoker.id}.availability.startOffsetMinutes`,
        -10080,
        10080,
      ),
    );
    const rangeEnd = Math.min(
      windowEnd,
      requireFiniteNumber(
        range.endOffsetMinutes,
        `smokers.${smoker.id}.availability.endOffsetMinutes`,
        -10080,
        10080,
      ),
    );
    if (rangeEnd - rangeStart < duration) continue;

    let candidate = rangeStart;
    for (const booking of smokerBookings) {
      if (booking.endOffsetMinutes <= candidate) continue;
      if (booking.startOffsetMinutes >= rangeEnd) break;
      if (candidate + duration <= booking.startOffsetMinutes) break;
      candidate = Math.max(candidate, booking.endOffsetMinutes);
    }
    if (candidate + duration <= rangeEnd) {
      slots.push({ startOffsetMinutes: candidate, endOffsetMinutes: candidate + duration });
    }
  }

  if (!slots.length) return null;
  return slots.sort((a, b) => a.startOffsetMinutes - b.startOffsetMinutes)[0];
}

function normalizeProducts(inputProducts) {
  const map = new Map();
  for (const product of inputProducts || []) {
    const code = String(product?.code || "").toUpperCase();
    if (!PRODUCT_NAMES[code]) {
      throw new ProductionValidationError("products.code", `Unsupported product code: ${code || "(blank)"}.`);
    }
    if (map.has(code)) {
      throw new ProductionValidationError(`products.${code}`, `Duplicate product configuration: ${code}.`);
    }
    map.set(code, product);
  }
  for (const product of PRODUCTION_PRODUCTS) {
    if (!map.has(product.code)) {
      throw new ProductionValidationError(
        `products.${product.code}`,
        `Missing product configuration for ${product.code}.`,
      );
    }
  }
  return map;
}

function calculateRequirement(serviceDate, demandValue, product) {
  const code = String(product.code).toUpperCase();
  const productName = PRODUCT_NAMES[code];
  const planningMode = String(product.planningMode || "");
  if (!["WEIGHT_YIELD", "UNIT_COUNT"].includes(planningMode)) {
    throw new ProductionValidationError(
      `products.${code}.planningMode`,
      `${code} planningMode must be WEIGHT_YIELD or UNIT_COUNT.`,
    );
  }

  const forecastDemand = requireFiniteNumber(demandValue ?? 0, `demand.${code}`, 0, 1000000);
  const bufferPercent = requireFiniteNumber(
    product.bufferPercent ?? 0,
    `products.${code}.bufferPercent`,
    0,
    50,
  );
  const bufferReason = String(product.bufferReason || "").trim();
  if (bufferPercent > 10 && bufferReason.length < 5) {
    throw new ProductionValidationError(
      `products.${code}.bufferReason`,
      `${code} buffer above 10% requires a reason.`,
    );
  }

  const yieldPercent = requireFiniteNumber(
    product.yieldPercent,
    `products.${code}.yieldPercent`,
    1,
    100,
  );
  const yieldDecimal = yieldPercent / 100;

  const rawWeightPerUnitLb =
    product.rawWeightPerUnitLb === null ||
    product.rawWeightPerUnitLb === undefined ||
    product.rawWeightPerUnitLb === ""
      ? null
      : requireFiniteNumber(
          product.rawWeightPerUnitLb,
          `products.${code}.rawWeightPerUnitLb`,
          0.01,
          1000,
        );

  const cookedWeightPerUnitLb =
    product.cookedWeightPerUnitLb === null ||
    product.cookedWeightPerUnitLb === undefined ||
    product.cookedWeightPerUnitLb === ""
      ? null
      : requireFiniteNumber(
          product.cookedWeightPerUnitLb,
          `products.${code}.cookedWeightPerUnitLb`,
          0.01,
          1000,
        );

  const carryover = product.carryover || {};
  const sealedUnits = requireInteger(
    carryover.sealedUnits ?? 0,
    `products.${code}.carryover.sealedUnits`,
  );
  const openCookedLb = requireFiniteNumber(
    carryover.openCookedLb ?? 0,
    `products.${code}.carryover.openCookedLb`,
    0,
    1000000,
  );
  const sourceOperatingDate = String(carryover.sourceOperatingDate || "");
  const expectedSourceDate = priorDate(serviceDate);
  const hasCarryover = sealedUnits > 0 || openCookedLb > 0;
  const sourceIsPriorDay = !hasCarryover || sourceOperatingDate === expectedSourceDate;

  const warnings = [];
  const blockers = [];
  if (hasCarryover && !sourceIsPriorDay) {
    warnings.push(
      `${productName} carryover dated ${sourceOperatingDate || "(missing)"} was excluded; only ${expectedSourceDate} is eligible.`,
    );
  }

  let sealedCredit = 0;
  let openCredit = 0;
  if (sourceIsPriorDay) {
    if (sealedUnits > 0 && !product.sealedCarryoverEligible) {
      warnings.push(`${productName} sealed units are not carryover eligible and were not credited.`);
    } else if (sealedUnits > 0 && product.sealedCarryoverEligible) {
      if (planningMode === "UNIT_COUNT") {
        sealedCredit = sealedUnits;
      } else if (rawWeightPerUnitLb !== null) {
        sealedCredit = sealedUnits * rawWeightPerUnitLb * yieldDecimal;
      } else {
        warnings.push(
          `${productName} sealed units could not be converted because raw unit weight is not configured.`,
        );
      }
    }

    if (planningMode === "UNIT_COUNT") {
      if (openCookedLb > 0 && cookedWeightPerUnitLb === null) {
        blockers.push(
          `${productName} cooked weight per operational unit is required to convert opened cooked pounds.`,
        );
      } else if (cookedWeightPerUnitLb !== null) {
        openCredit = openCookedLb / cookedWeightPerUnitLb;
      }
    } else {
      openCredit = openCookedLb;
    }
  }

  const bufferedDemand = forecastDemand * (1 + bufferPercent / 100);
  const carryoverCredit = sealedCredit + openCredit;
  const netDemand = Math.max(0, bufferedDemand - carryoverCredit);
  const carryoverSurplus = Math.max(0, carryoverCredit - bufferedDemand);

  let exactRawLb = 0;
  let plannedRawLb = 0;
  let plannedUnits = 0;
  let expectedCookedOutputLb = 0;
  let expectedOutputInDemandUnits = 0;
  let roundingOverage = 0;

  if (planningMode === "WEIGHT_YIELD") {
    exactRawLb = netDemand / yieldDecimal;
    if (netDemand > 0 && rawWeightPerUnitLb === null) {
      plannedUnits = null;
      plannedRawLb = exactRawLb;
      expectedCookedOutputLb = netDemand;
      expectedOutputInDemandUnits = netDemand;
      blockers.push(
        `${productName} raw unit weight is required for whole-unit rounding and smoker scheduling.`,
      );
    } else if (rawWeightPerUnitLb !== null) {
      plannedUnits = Math.ceil(exactRawLb / rawWeightPerUnitLb);
      plannedRawLb = plannedUnits * rawWeightPerUnitLb;
      expectedCookedOutputLb = plannedRawLb * yieldDecimal;
      expectedOutputInDemandUnits = expectedCookedOutputLb;
      roundingOverage = Math.max(0, expectedCookedOutputLb - netDemand);
    }
  } else {
    if (rawWeightPerUnitLb === null) {
      blockers.push(`${productName} raw weight per operational unit is required.`);
    }
    if (cookedWeightPerUnitLb === null) {
      blockers.push(`${productName} cooked weight per operational unit is required.`);
    }
    plannedUnits = Math.ceil(netDemand);
    exactRawLb = rawWeightPerUnitLb === null ? 0 : netDemand * rawWeightPerUnitLb;
    plannedRawLb = rawWeightPerUnitLb === null ? 0 : plannedUnits * rawWeightPerUnitLb;
    expectedCookedOutputLb =
      cookedWeightPerUnitLb === null ? 0 : plannedUnits * cookedWeightPerUnitLb;
    expectedOutputInDemandUnits = plannedUnits;
    roundingOverage = Math.max(0, plannedUnits - netDemand);
  }

  const schedule = product.schedule || {};
  const classification = String(schedule.classification || "");
  if (!["OVERNIGHT", "SAME_DAY"].includes(classification)) {
    blockers.push(`${productName} schedule classification must be OVERNIGHT or SAME_DAY.`);
  }
  const windowStartOffsetMinutes = requireFiniteNumber(
    schedule.windowStartOffsetMinutes,
    `products.${code}.schedule.windowStartOffsetMinutes`,
    -10080,
    10080,
  );
  const windowEndOffsetMinutes = requireFiniteNumber(
    schedule.windowEndOffsetMinutes,
    `products.${code}.schedule.windowEndOffsetMinutes`,
    -10080,
    10080,
  );
  const durationMinutes =
    schedule.durationMinutes === null ||
    schedule.durationMinutes === undefined ||
    schedule.durationMinutes === ""
      ? null
      : requireFiniteNumber(
          schedule.durationMinutes,
          `products.${code}.schedule.durationMinutes`,
          1,
          10080,
        );

  if (netDemand > 0 && durationMinutes === null) {
    blockers.push(`${productName} cook duration is required before scheduling.`);
  }
  if (windowEndOffsetMinutes <= windowStartOffsetMinutes) {
    blockers.push(`${productName} schedule window end must be after its start.`);
  }
  if (
    durationMinutes !== null &&
    durationMinutes > windowEndOffsetMinutes - windowStartOffsetMinutes
  ) {
    blockers.push(`${productName} cook duration does not fit inside its schedule window.`);
  }

  return {
    productCode: code,
    productName,
    planningMode,
    forecastDemand: round(forecastDemand, 3),
    bufferPercent: round(bufferPercent, 3),
    bufferReason,
    bufferedDemand: round(bufferedDemand, 3),
    yieldPercent: round(yieldPercent, 3),
    rawWeightPerUnitLb: rawWeightPerUnitLb === null ? null : round(rawWeightPerUnitLb, 3),
    cookedWeightPerUnitLb: cookedWeightPerUnitLb === null ? null : round(cookedWeightPerUnitLb, 3),
    carryover: {
      sourceOperatingDate,
      expectedSourceDate,
      sourceIsPriorDay,
      sealedUnits,
      openCookedLb: round(openCookedLb, 3),
      sealedCredit: round(sealedCredit, 3),
      openCredit: round(openCredit, 3),
      totalCredit: round(carryoverCredit, 3),
      surplus: round(carryoverSurplus, 3),
      applied: sourceIsPriorDay,
    },
    netDemand: round(netDemand, 3),
    exactRawLb: round(exactRawLb, 3),
    plannedRawLb: round(plannedRawLb, 3),
    plannedUnits,
    expectedCookedOutputLb: round(expectedCookedOutputLb, 3),
    expectedOutputInDemandUnits: round(expectedOutputInDemandUnits, 3),
    roundingOverage: round(roundingOverage, 3),
    schedule: {
      classification,
      windowStartOffsetMinutes,
      windowEndOffsetMinutes,
      durationMinutes,
    },
    warnings,
    blockers,
  };
}

function scheduleRequirements(serviceDate, requirements, smokersInput) {
  const smokers = (smokersInput || []).map((smoker, index) => {
    const id = String(smoker?.id || `smoker-${index + 1}`);
    const cookWindow = String(smoker?.cookWindow || "");
    if (!SMOKER_COOK_WINDOWS.includes(cookWindow)) {
      throw new ProductionValidationError(
        `smokers.${id}.cookWindow`,
        `${id} cookWindow must use an approved value.`,
      );
    }
    const capacities = {};
    for (const [productCode, value] of Object.entries(smoker?.capacities || {})) {
      if (!PRODUCT_NAMES[productCode]) continue;
      capacities[productCode] = requireInteger(
        value,
        `smokers.${id}.capacities.${productCode}`,
        1,
      );
    }
    return {
      id,
      name: String(smoker?.name || id),
      brand: String(smoker?.brand || ""),
      model: String(smoker?.model || ""),
      location: String(smoker?.location || ""),
      cookWindow,
      active: Boolean(smoker?.active) && cookWindow !== "Not currently active",
      availability: Array.isArray(smoker?.availability) ? smoker.availability : [],
      capacities,
      validationOnlyCapacities: Array.isArray(smoker?.validationOnlyCapacities)
        ? smoker.validationOnlyCapacities.map(String)
        : [],
    };
  });

  const bookings = [];
  const unscheduled = [];
  const warnings = [];
  const blockers = [];

  const queue = requirements
    .filter((requirement) => Number(requirement.plannedUnits) > 0)
    .sort((a, b) => {
      if (a.schedule.windowEndOffsetMinutes !== b.schedule.windowEndOffsetMinutes) {
        return a.schedule.windowEndOffsetMinutes - b.schedule.windowEndOffsetMinutes;
      }
      const aDuration = a.schedule.durationMinutes || 0;
      const bDuration = b.schedule.durationMinutes || 0;
      if (aDuration !== bDuration) return bDuration - aDuration;
      return a.productCode.localeCompare(b.productCode);
    });

  for (const requirement of queue) {
    if (requirement.blockers.length || requirement.schedule.durationMinutes === null) {
      unscheduled.push({
        productCode: requirement.productCode,
        quantity: requirement.plannedUnits,
        reason: "PRODUCT_REQUIREMENT_BLOCKED",
      });
      continue;
    }

    let remaining = requirement.plannedUnits;
    const compatible = smokers
      .filter(
        (smoker) =>
          smoker.active &&
          cookWindowSupports(smoker.cookWindow, requirement.schedule.classification) &&
          Number(smoker.capacities[requirement.productCode]) > 0,
      )
      .sort((a, b) => {
        const priorityDifference = backupPriority(a) - backupPriority(b);
        if (priorityDifference) return priorityDifference;
        return b.capacities[requirement.productCode] - a.capacities[requirement.productCode];
      });

    if (!compatible.length) {
      blockers.push(
        `No active smoker has validated ${requirement.productCode} capacity compatible with the required cook window.`,
      );
      unscheduled.push({
        productCode: requirement.productCode,
        quantity: remaining,
        reason: "NO_VALIDATED_COMPATIBLE_CAPACITY",
      });
      continue;
    }

    while (remaining > 0) {
      const primaryCandidates = compatible.filter((smoker) => backupPriority(smoker) === 0);
      const backupCandidates = compatible.filter((smoker) => backupPriority(smoker) === 1);

      const findCandidates = (group) =>
        group
          .map((smoker) => ({
            smoker,
            slot: findEarliestSlot(smoker, requirement, bookings),
          }))
          .filter((candidate) => candidate.slot)
          .sort((a, b) => {
            if (a.slot.startOffsetMinutes !== b.slot.startOffsetMinutes) {
              return a.slot.startOffsetMinutes - b.slot.startOffsetMinutes;
            }
            return (
              b.smoker.capacities[requirement.productCode] -
              a.smoker.capacities[requirement.productCode]
            );
          });

      let candidates = findCandidates(primaryCandidates);
      if (!candidates.length) candidates = findCandidates(backupCandidates);
      if (!candidates.length) break;

      const chosen = candidates[0];
      const capacity = chosen.smoker.capacities[requirement.productCode];
      const quantity = Math.min(remaining, capacity);
      const start = formatOffset(serviceDate, chosen.slot.startOffsetMinutes);
      const end = formatOffset(serviceDate, chosen.slot.endOffsetMinutes);

      const bookingCore = {
        smokerId: chosen.smoker.id,
        smokerName: chosen.smoker.name,
        smokerBrand: chosen.smoker.brand,
        smokerModel: chosen.smoker.model,
        cookWindow: chosen.smoker.cookWindow,
        backupUsed: backupPriority(chosen.smoker) === 1,
        productCode: requirement.productCode,
        productName: requirement.productName,
        quantity,
        capacity,
        utilizationPercent: round((quantity / capacity) * 100, 1),
        startOffsetMinutes: chosen.slot.startOffsetMinutes,
        endOffsetMinutes: chosen.slot.endOffsetMinutes,
        start,
        end,
        validationOnlyCapacity:
          chosen.smoker.validationOnlyCapacities.includes(requirement.productCode),
      };

      bookings.push({
        ...bookingCore,
        batchId: `batch-${stableHash(bookingCore)}`,
      });

      if (bookingCore.validationOnlyCapacity) {
        warnings.push(
          `${requirement.productName} uses validation-only capacity on ${chosen.smoker.name}; replace it with approved measured capacity before production release.`,
        );
      }
      remaining -= quantity;
    }

    if (remaining > 0) {
      blockers.push(
        `${requirement.productName} has ${remaining} unscheduled unit${remaining === 1 ? "" : "s"} after all compatible smoker windows were exhausted.`,
      );
      unscheduled.push({
        productCode: requirement.productCode,
        quantity: remaining,
        reason: "INSUFFICIENT_TIME_OR_CAPACITY",
      });
    }
  }

  bookings.sort(
    (a, b) =>
      a.startOffsetMinutes - b.startOffsetMinutes ||
      a.smokerName.localeCompare(b.smokerName) ||
      a.productCode.localeCompare(b.productCode),
  );

  return { smokers, bookings, unscheduled, warnings, blockers };
}

export class ProductionValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ProductionValidationError";
    this.field = field;
  }
}

export function calculateProductionPlan(input) {
  const serviceDateObject = parseServiceDate(input?.serviceDate);
  const serviceDate = dateOnly(serviceDateObject);
  const productMap = normalizeProducts(input?.products);
  const demand = input?.demand || {};

  const requirements = PRODUCTION_PRODUCTS.map((product) =>
    calculateRequirement(
      serviceDate,
      demand[product.code] ?? 0,
      productMap.get(product.code),
    ),
  );

  const productWarnings = requirements.flatMap((row) => row.warnings);
  const productBlockers = requirements.flatMap((row) => row.blockers);
  const schedule = scheduleRequirements(serviceDate, requirements, input?.smokers || []);

  const warnings = [...new Set([...productWarnings, ...schedule.warnings])];
  const blockers = [...new Set([...productBlockers, ...schedule.blockers])];
  const unscheduledUnits = schedule.unscheduled.reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0,
  );
  const status = blockers.length ? "BLOCKED" : warnings.length ? "REVIEW" : "READY";

  const planCore = {
    calculationVersion: PRODUCTION_CALCULATION_VERSION,
    forecastCalculationId: String(input?.forecastCalculationId || ""),
    serviceDate,
    serviceDayName: serviceDateObject.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }),
    priorOperatingDate: priorDate(serviceDate),
    requirements,
    schedule: {
      bookings: schedule.bookings,
      unscheduled: schedule.unscheduled,
      unscheduledUnits,
      smokerCount: schedule.smokers.length,
      activeSmokerCount: schedule.smokers.filter((smoker) => smoker.active).length,
      batchCount: schedule.bookings.length,
      backupBatchCount: schedule.bookings.filter((booking) => booking.backupUsed).length,
    },
    review: {
      status,
      approvalAllowed: status !== "BLOCKED",
      warnings,
      blockers,
    },
    explanation: [
      `Demand is planned for ${serviceDate}, a ${serviceDateObject.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}.`,
      "Eligible carryover is limited to the immediately preceding operating date.",
      "Weight-based products convert net cooked demand to raw pounds using configured yield and then round upward to whole raw units.",
      "Ribs and chicken remain whole operational units; opened cooked pounds convert through configured cooked weight per unit.",
      "Smoker bookings are exclusive. Backup/overflow smokers are considered only after no primary slot remains.",
    ],
  };

  return {
    ...planCore,
    planId: `pp-${stableHash(planCore)}`,
  };
}

export function createProductionApprovalRecord(plan, approval) {
  if (!plan || plan.calculationVersion !== PRODUCTION_CALCULATION_VERSION) {
    throw new ProductionValidationError(
      "plan",
      "Approval requires a Build 11.4.0 production plan.",
    );
  }
  if (!plan.review.approvalAllowed || plan.review.status === "BLOCKED") {
    throw new ProductionValidationError(
      "plan",
      "A blocked production plan cannot be approved.",
    );
  }

  const actor = String(approval?.actor || "").trim();
  if (actor.length < 2) {
    throw new ProductionValidationError("actor", "Approval actor is required.");
  }
  const approvedAt = String(approval?.approvedAt || new Date().toISOString());
  if (Number.isNaN(new Date(approvedAt).getTime())) {
    throw new ProductionValidationError(
      "approvedAt",
      "approvedAt must be a valid timestamp.",
    );
  }
  const reason = String(
    approval?.reason ||
      (plan.review.warnings.length
        ? "Warnings reviewed and production plan approved"
        : "Production plan approved"),
  ).trim();
  if (plan.review.warnings.length && reason.length < 5) {
    throw new ProductionValidationError(
      "reason",
      "Approving a plan with warnings requires a reason.",
    );
  }

  const record = {
    recordVersion: "PTT_PRODUCTION_APPROVAL_11_4_0",
    planId: plan.planId,
    calculationVersion: plan.calculationVersion,
    forecastCalculationId: plan.forecastCalculationId,
    serviceDate: plan.serviceDate,
    approvedBy: actor,
    approvedAt,
    reason,
    statusAtApproval: plan.review.status,
    warningsAccepted: plan.review.warnings,
    requirements: plan.requirements.map((requirement) => ({
      productCode: requirement.productCode,
      forecastDemand: requirement.forecastDemand,
      carryoverCredit: requirement.carryover.totalCredit,
      netDemand: requirement.netDemand,
      yieldPercent: requirement.yieldPercent,
      exactRawLb: requirement.exactRawLb,
      plannedRawLb: requirement.plannedRawLb,
      plannedUnits: requirement.plannedUnits,
      roundingOverage: requirement.roundingOverage,
    })),
    bookings: plan.schedule.bookings.map((booking) => ({
      batchId: booking.batchId,
      smokerId: booking.smokerId,
      productCode: booking.productCode,
      quantity: booking.quantity,
      startOffsetMinutes: booking.startOffsetMinutes,
      endOffsetMinutes: booking.endOffsetMinutes,
      backupUsed: booking.backupUsed,
    })),
  };

  return {
    ...record,
    approvalId: `pa-${stableHash(record)}`,
  };
}

export const FORECAST_CALCULATION_VERSION = "PTT_FORECAST_11_3_0";

export const DAY_OF_WEEK_SHARES = Object.freeze({
  MONDAY: 9,
  TUESDAY: 8,
  WEDNESDAY: 10,
  THURSDAY: 12,
  FRIDAY: 17,
  SATURDAY: 25,
  SUNDAY: 19,
});

export const FORECAST_PRODUCTS = Object.freeze([
  { code: "BRISKET", name: "Brisket", unit: "cooked lb", displayPrecision: 1 },
  { code: "PORK", name: "Pork", unit: "cooked lb", displayPrecision: 1 },
  { code: "RIBS", name: "Ribs", unit: "rack-equivalent", displayPrecision: 1 },
  {
    code: "CHICKEN",
    name: "Pulled Chicken",
    unit: "whole-bird-equivalent double breast",
    displayPrecision: 1,
  },
]);

const DAY_KEYS = Object.freeze([
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]);

const DAY_NAMES = Object.freeze([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

const AVERAGE_DAY_SHARE = 100 / 7;

function round(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function requireFiniteNumber(value, field, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ForecastValidationError(field, `${field} must be a finite number.`);
  }
  if (minimum !== undefined && number < minimum) {
    throw new ForecastValidationError(field, `${field} must be at least ${minimum}.`);
  }
  if (maximum !== undefined && number > maximum) {
    throw new ForecastValidationError(field, `${field} must be no more than ${maximum}.`);
  }
  return number;
}

function parseOperatingDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ForecastValidationError(
      "operatingDate",
      "operatingDate must use YYYY-MM-DD format.",
    );
  }
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ForecastValidationError("operatingDate", "operatingDate is invalid.");
  }
  return date;
}

function normalizeCertainty(value) {
  const certainty = String(value || "HIGH").toUpperCase();
  if (!["HIGH", "MEDIUM", "LOW"].includes(certainty)) {
    throw new ForecastValidationError(
      "eventCertainty",
      "eventCertainty must be HIGH, MEDIUM or LOW.",
    );
  }
  return certainty;
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

export class ForecastValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ForecastValidationError";
    this.field = field;
  }
}

export function calculateForecast(input) {
  const operatingDate = parseOperatingDate(input?.operatingDate);
  const dayIndex = operatingDate.getUTCDay();
  const dayKey = DAY_KEYS[dayIndex];
  const dayName = DAY_NAMES[dayIndex];
  const dayShare = DAY_OF_WEEK_SHARES[dayKey];
  const dayFactor = dayShare / AVERAGE_DAY_SHARE;

  const monthlyFactor = requireFiniteNumber(
    input?.monthlyFactor ?? 1,
    "monthlyFactor",
    0.5,
    2,
  );
  const eventAdjustmentPercent = requireFiniteNumber(
    input?.eventAdjustmentPercent ?? 0,
    "eventAdjustmentPercent",
    -50,
    300,
  );
  const manualAdjustmentPercent = requireFiniteNumber(
    input?.manualAdjustmentPercent ?? 0,
    "manualAdjustmentPercent",
    -50,
    200,
  );
  const reason = String(input?.reason ?? "").trim();
  if (manualAdjustmentPercent !== 0 && reason.length < 5) {
    throw new ForecastValidationError(
      "reason",
      "A non-zero manual adjustment requires a reason of at least five characters.",
    );
  }

  const eventCertainty = normalizeCertainty(input?.eventCertainty);
  const dataFreshnessDays = requireFiniteNumber(
    input?.dataFreshnessDays ?? 0,
    "dataFreshnessDays",
    0,
    365,
  );
  const recentSampleDays = requireFiniteNumber(
    input?.recentSampleDays ?? 0,
    "recentSampleDays",
    0,
    3650,
  );
  const recentMapePercent = requireFiniteNumber(
    input?.recentMapePercent ?? 0,
    "recentMapePercent",
    0,
    100,
  );
  const modeledSalesDollars = requireFiniteNumber(
    input?.modeledSalesDollars ?? 0,
    "modeledSalesDollars",
    0,
    1000000000,
  );
  const smokedFoodShareOfFoodPercent = requireFiniteNumber(
    input?.smokedFoodShareOfFoodPercent ?? 50,
    "smokedFoodShareOfFoodPercent",
    0,
    100,
  );

  const baselineDemand = {};
  for (const product of FORECAST_PRODUCTS) {
    baselineDemand[product.code] = requireFiniteNumber(
      input?.baselineDemand?.[product.code] ?? 0,
      `baselineDemand.${product.code}`,
      0,
      1000000,
    );
  }

  const eventFactor = 1 + eventAdjustmentPercent / 100;
  const manualFactor = 1 + manualAdjustmentPercent / 100;
  const automaticFactor = dayFactor * monthlyFactor * eventFactor;
  const finalFactor = automaticFactor * manualFactor;
  const automaticReviewRequired =
    automaticFactor < 0.5 || automaticFactor > 2;
  if (automaticReviewRequired && reason.length < 5) {
    throw new ForecastValidationError(
      "reason",
      "An automatic factor outside the 0.50–2.00 review range requires an explicit reason.",
    );
  }

  const productLines = FORECAST_PRODUCTS.map((product) => {
    const baseline = baselineDemand[product.code];
    const automaticDemand = baseline * automaticFactor;
    const finalDemand = automaticDemand * manualFactor;
    return {
      productCode: product.code,
      productName: product.name,
      unit: product.unit,
      baselineDemand: round(baseline, 3),
      automaticDemand: round(automaticDemand, 3),
      manualAdjustmentPercent: round(manualAdjustmentPercent, 3),
      finalDemand: round(finalDemand, 3),
      displayDemand: round(finalDemand, product.displayPrecision),
    };
  });

  let confidenceScore = 100;
  confidenceScore -= Math.min(25, Math.max(0, dataFreshnessDays - 7) * 0.8);
  confidenceScore -= Math.min(25, Math.max(0, 28 - recentSampleDays) * 0.9);
  confidenceScore -= Math.min(30, Math.max(0, recentMapePercent - 10) * 0.9);
  if (eventAdjustmentPercent !== 0) {
    if (eventCertainty === "MEDIUM") confidenceScore -= 8;
    if (eventCertainty === "LOW") confidenceScore -= 16;
  }
  confidenceScore -= Math.min(15, Math.abs(manualAdjustmentPercent) * 0.4);
  confidenceScore = round(clamp(confidenceScore, 0, 100), 1);

  const confidenceBadge =
    confidenceScore >= 80 ? "HIGH" : confidenceScore >= 60 ? "MEDIUM" : "LOW";

  const warnings = [];
  if (automaticReviewRequired) {
    warnings.push(
      `Automatic factor ${round(automaticFactor, 3)} is outside the 0.50–2.00 review range.`,
    );
  }
  if (Math.abs(manualAdjustmentPercent) > 20) {
    warnings.push("Manual adjustment exceeds 20% and requires heightened review.");
  }
  if (recentMapePercent > 25) {
    warnings.push("Recent forecast error exceeds 25%.");
  }
  if (dataFreshnessDays > 14) {
    warnings.push("Source data is more than 14 days old.");
  }
  if (recentSampleDays < 14) {
    warnings.push("Recent sample contains fewer than 14 operating days.");
  }
  if (eventAdjustmentPercent !== 0 && eventCertainty === "LOW") {
    warnings.push("Event adjustment is based on low-certainty evidence.");
  }

  const barSalesDollars = modeledSalesDollars * 0.2;
  const foodSalesDollars = modeledSalesDollars * 0.8;
  const smokedFoodSalesDollars =
    foodSalesDollars * (smokedFoodShareOfFoodPercent / 100);

  const approvalRequired =
    automaticReviewRequired ||
    manualAdjustmentPercent !== 0 ||
    eventAdjustmentPercent !== 0 ||
    confidenceBadge === "LOW";

  const calculation = {
    calculationVersion: FORECAST_CALCULATION_VERSION,
    operatingDate: input.operatingDate,
    dayOfWeek: {
      key: dayKey,
      name: dayName,
      share: dayShare,
      averageShare: round(AVERAGE_DAY_SHARE, 6),
      factor: round(dayFactor, 6),
    },
    factors: {
      monthlyFactor: round(monthlyFactor, 6),
      eventAdjustmentPercent: round(eventAdjustmentPercent, 3),
      eventFactor: round(eventFactor, 6),
      automaticFactor: round(automaticFactor, 6),
      manualAdjustmentPercent: round(manualAdjustmentPercent, 3),
      manualFactor: round(manualFactor, 6),
      finalFactor: round(finalFactor, 6),
    },
    demand: {
      baseline: baselineDemand,
      lines: productLines,
    },
    confidence: {
      score: confidenceScore,
      badge: confidenceBadge,
      dataFreshnessDays,
      recentSampleDays,
      recentMapePercent,
      eventCertainty,
    },
    salesDisplay: {
      modeledSalesDollars: round(modeledSalesDollars, 2),
      barAllocationPercent: 20,
      barSalesDollars: round(barSalesDollars, 2),
      foodAllocationPercent: 80,
      foodSalesDollars: round(foodSalesDollars, 2),
      smokedFoodShareOfFoodPercent: round(smokedFoodShareOfFoodPercent, 2),
      smokedFoodSalesDollars: round(smokedFoodSalesDollars, 2),
    },
    review: {
      approvalRequired,
      automaticReviewRequired,
      highImpactManualAdjustment: Math.abs(manualAdjustmentPercent) > 20,
      reason,
      warnings,
    },
    explanation: [
      `Operating date ${input.operatingDate} is ${dayName}; DOW share ${dayShare}% produces factor ${round(dayFactor, 3)}.`,
      `Monthly factor ${round(monthlyFactor, 3)} and event factor ${round(eventFactor, 3)} produce automatic factor ${round(automaticFactor, 3)}.`,
      `Manual factor ${round(manualFactor, 3)} produces final factor ${round(finalFactor, 3)}.`,
      `Confidence is ${confidenceBadge} at ${confidenceScore}.`,
    ],
  };

  return {
    ...calculation,
    calculationId: `fc-${stableHash(calculation)}`,
  };
}

export function createForecastApprovalRecord(calculation, approval) {
  if (!calculation || calculation.calculationVersion !== FORECAST_CALCULATION_VERSION) {
    throw new ForecastValidationError(
      "calculation",
      "Approval requires a Build 11.3.0 forecast calculation.",
    );
  }
  const actor = String(approval?.actor ?? "").trim();
  if (actor.length < 2) {
    throw new ForecastValidationError("actor", "Approval actor is required.");
  }
  const approvedAt = String(approval?.approvedAt ?? new Date().toISOString());
  if (Number.isNaN(new Date(approvedAt).getTime())) {
    throw new ForecastValidationError("approvedAt", "approvedAt must be a valid timestamp.");
  }
  const reason = String(
    approval?.reason ?? calculation.review.reason ?? "Forecast approved",
  ).trim();
  if (calculation.review.approvalRequired && reason.length < 5) {
    throw new ForecastValidationError(
      "reason",
      "A reviewed forecast approval requires a reason.",
    );
  }

  const record = {
    recordVersion: "PTT_FORECAST_APPROVAL_11_3_0",
    calculationId: calculation.calculationId,
    calculationVersion: calculation.calculationVersion,
    operatingDate: calculation.operatingDate,
    approvedBy: actor,
    approvedAt,
    reason,
    finalFactor: calculation.factors.finalFactor,
    confidence: calculation.confidence,
    demandLines: calculation.demand.lines.map((line) => ({
      productCode: line.productCode,
      unit: line.unit,
      finalDemand: line.finalDemand,
    })),
    warningsAccepted: calculation.review.warnings,
  };

  return {
    ...record,
    approvalId: `fa-${stableHash(record)}`,
  };
}

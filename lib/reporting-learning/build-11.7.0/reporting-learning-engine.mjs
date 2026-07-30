export const REPORTING_LEARNING_VERSION = "PTT_REPORTING_LEARNING_11_7_0";

export const REPORT_PRODUCTS = Object.freeze([
  "BRISKET",
  "PORK",
  "RIBS",
  "CHICKEN",
]);

export const FORMULA_GLOSSARY = Object.freeze({
  forecastVarianceCookedLb:
    "actual service usage cooked lb - approved forecast cooked lb",
  forecastVariancePercent:
    "forecast variance cooked lb / approved forecast cooked lb × 100",
  dailyForecastAccuracyPercent:
    "max(0, 100 - absolute forecast variance percent)",
  weeklyForecastAccuracyPercent:
    "max(0, 100 - weighted absolute percentage error)",
  productionVarianceCookedLb:
    "actual cooked production lb - planned cooked production lb",
  actualYieldPercent:
    "actual cooked production lb / actual raw input lb × 100",
  wasteRatePercent:
    "waste cooked lb / (opening cooked lb + production receipts cooked lb + transfer-in cooked lb) × 100",
  endingInventoryRatePercent:
    "closing on-hand cooked lb / (opening cooked lb + production receipts cooked lb + transfer-in cooked lb) × 100",
  inventoryExpectedClosingCookedLb:
    "opening + production receipts + transfer in - service usage - waste - transfer out + adjustments",
  inventoryUnexplainedDifferenceCookedLb:
    "recorded closing on-hand cooked lb - expected closing cooked lb",
  planAdherencePercent:
    "loads started and completed within approved tolerances / completed non-cancelled loads × 100",
  smokerUtilizationPercent:
    "occupied capacity-minutes / available capacity-minutes × 100",
  learningFactor:
    "recency-weighted actual service usage cooked lb / recency-weighted approved forecast cooked lb",
});

const REQUIRED_SOURCE_FIELDS = Object.freeze([
  "forecastId",
  "productionPlanId",
  "executionRecordId",
  "inventoryDayId",
  "physicalCountRecordId",
  "sourceRevision",
]);

const PRODUCT_NUMBER_FIELDS = Object.freeze([
  "forecastCookedLb",
  "plannedCookedLb",
  "actualRawInputLb",
  "actualCookedProductionLb",
  "openingCookedLb",
  "productionReceiptCookedLb",
  "transferInCookedLb",
  "serviceUsageCookedLb",
  "wasteCookedLb",
  "transferOutCookedLb",
  "adjustmentCookedLb",
  "closingOnHandCookedLb",
]);

const APPROVER_ROLES = new Set(["ADMIN", "OWNER", "KM"]);
const VIEW_ROLES = new Set(["ADMIN", "OWNER", "KM", "PITMASTER", "KC", "VIEWER"]);

function round(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function finite(value, field, minimum = undefined, maximum = undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ReportingLearningValidationError(
      field,
      `${field} must be a finite number.`,
    );
  }
  if (minimum !== undefined && number < minimum) {
    throw new ReportingLearningValidationError(
      field,
      `${field} must be at least ${minimum}.`,
    );
  }
  if (maximum !== undefined && number > maximum) {
    throw new ReportingLearningValidationError(
      field,
      `${field} must be no more than ${maximum}.`,
    );
  }
  return number;
}

function dateOnly(value, field = "operatingDate") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ReportingLearningValidationError(
      field,
      `${field} must use YYYY-MM-DD.`,
    );
  }
  const parsed = new Date(`${value}T12:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new ReportingLearningValidationError(field, `${field} is invalid.`);
  }
  return value;
}

function timestamp(value, field) {
  const text = String(value || "");
  if (!text || Number.isNaN(new Date(text).getTime())) {
    throw new ReportingLearningValidationError(
      field,
      `${field} must be a valid timestamp.`,
    );
  }
  return text;
}

function percentage(numerator, denominator, precision = 2) {
  if (Math.abs(denominator) < 0.0000001) return null;
  return round((numerator / denominator) * 100, precision);
}

function accuracyFromVariancePercent(variancePercent) {
  if (variancePercent === null) return null;
  return round(Math.max(0, 100 - Math.abs(variancePercent)), 2);
}

function normalizeActor(input, field = "actor") {
  const person = {
    id: String(input?.id || "").trim(),
    name: String(input?.name || "").trim(),
    role: String(input?.role || "").trim().toUpperCase(),
  };
  if (!person.id) {
    throw new ReportingLearningValidationError(
      `${field}.id`,
      `${field}.id is required.`,
    );
  }
  if (person.name.length < 2) {
    throw new ReportingLearningValidationError(
      `${field}.name`,
      `${field}.name is required.`,
    );
  }
  if (!VIEW_ROLES.has(person.role)) {
    throw new ReportingLearningValidationError(
      `${field}.role`,
      `${field}.role is invalid.`,
    );
  }
  return person;
}

function normalizeSource(input) {
  const tenantId = String(input?.tenantId || "").trim();
  const locationId = String(input?.locationId || "").trim();
  if (!tenantId) {
    throw new ReportingLearningValidationError(
      "tenantId",
      "tenantId is required.",
    );
  }
  if (!locationId) {
    throw new ReportingLearningValidationError(
      "locationId",
      "locationId is required.",
    );
  }

  const operatingDate = dateOnly(input?.operatingDate);
  const dayType = String(input?.dayType || "NORMAL_WEEKDAY").trim();
  const sourceIds = {};
  const missingSources = [];
  for (const field of REQUIRED_SOURCE_FIELDS) {
    const value = String(input?.sources?.[field] || "").trim();
    sourceIds[field] = value || null;
    if (!value) missingSources.push(field);
  }

  const products = {};
  for (const productCode of REPORT_PRODUCTS) {
    const sourceRow = input?.products?.[productCode];
    if (!sourceRow) {
      throw new ReportingLearningValidationError(
        `products.${productCode}`,
        `Missing source metrics for ${productCode}.`,
      );
    }
    const row = {};
    for (const field of PRODUCT_NUMBER_FIELDS) {
      const minimum =
        field === "adjustmentCookedLb" ? -1000000 : 0;
      row[field] = round(
        finite(
          sourceRow[field] ?? 0,
          `products.${productCode}.${field}`,
          minimum,
          1000000,
        ),
      );
    }
    products[productCode] = row;
  }

  const loads = (input?.loads || []).map((load, index) => {
    const loadId = String(load?.loadId || `load-${index + 1}`);
    const productCode = String(load?.productCode || "").toUpperCase();
    if (!REPORT_PRODUCTS.includes(productCode)) {
      throw new ReportingLearningValidationError(
        `loads.${loadId}.productCode`,
        `${loadId} has an unsupported product.`,
      );
    }
    return {
      loadId,
      productCode,
      plannedStartOffsetMinutes: finite(
        load?.plannedStartOffsetMinutes,
        `loads.${loadId}.plannedStartOffsetMinutes`,
        -10080,
        10080,
      ),
      actualStartOffsetMinutes:
        load?.actualStartOffsetMinutes === null ||
        load?.actualStartOffsetMinutes === undefined
          ? null
          : finite(
              load.actualStartOffsetMinutes,
              `loads.${loadId}.actualStartOffsetMinutes`,
              -10080,
              10080,
            ),
      plannedEndOffsetMinutes: finite(
        load?.plannedEndOffsetMinutes,
        `loads.${loadId}.plannedEndOffsetMinutes`,
        -10080,
        10080,
      ),
      actualEndOffsetMinutes:
        load?.actualEndOffsetMinutes === null ||
        load?.actualEndOffsetMinutes === undefined
          ? null
          : finite(
              load.actualEndOffsetMinutes,
              `loads.${loadId}.actualEndOffsetMinutes`,
              -10080,
              10080,
            ),
      cancelled: Boolean(load?.cancelled),
    };
  });

  const smokers = (input?.smokers || []).map((smoker, index) => {
    const smokerId = String(smoker?.smokerId || `smoker-${index + 1}`);
    const availableCapacityMinutes = finite(
      smoker?.availableCapacityMinutes,
      `smokers.${smokerId}.availableCapacityMinutes`,
      0,
      100000000,
    );
    const occupiedCapacityMinutes = finite(
      smoker?.occupiedCapacityMinutes,
      `smokers.${smokerId}.occupiedCapacityMinutes`,
      0,
      100000000,
    );
    return {
      smokerId,
      smokerName: String(smoker?.smokerName || smokerId),
      availableCapacityMinutes: round(availableCapacityMinutes),
      occupiedCapacityMinutes: round(occupiedCapacityMinutes),
    };
  });

  return {
    tenantId,
    locationId,
    operatingDate,
    dayType,
    complete: input?.complete !== false,
    sourceIds,
    missingSources,
    products,
    loads,
    smokers,
  };
}

function productMetrics(productCode, row) {
  const forecastVarianceCookedLb = round(
    row.serviceUsageCookedLb - row.forecastCookedLb,
  );
  const forecastVariancePercent = percentage(
    forecastVarianceCookedLb,
    row.forecastCookedLb,
  );
  const forecastAccuracyPercent = accuracyFromVariancePercent(
    forecastVariancePercent,
  );
  const productionVarianceCookedLb = round(
    row.actualCookedProductionLb - row.plannedCookedLb,
  );
  const actualYieldPercent = percentage(
    row.actualCookedProductionLb,
    row.actualRawInputLb,
  );
  const totalAvailableDuringPeriodCookedLb = round(
    row.openingCookedLb +
      row.productionReceiptCookedLb +
      row.transferInCookedLb,
  );
  const wasteRatePercent = percentage(
    row.wasteCookedLb,
    totalAvailableDuringPeriodCookedLb,
  );
  const endingInventoryRatePercent = percentage(
    row.closingOnHandCookedLb,
    totalAvailableDuringPeriodCookedLb,
  );
  const expectedClosingOnHandCookedLb = round(
    row.openingCookedLb +
      row.productionReceiptCookedLb +
      row.transferInCookedLb -
      row.serviceUsageCookedLb -
      row.wasteCookedLb -
      row.transferOutCookedLb +
      row.adjustmentCookedLb,
  );
  const unexplainedDifferenceCookedLb = round(
    row.closingOnHandCookedLb - expectedClosingOnHandCookedLb,
  );

  return {
    productCode,
    ...row,
    totalAvailableDuringPeriodCookedLb,
    forecastVarianceCookedLb,
    forecastVariancePercent,
    forecastAccuracyPercent,
    productionVarianceCookedLb,
    actualYieldPercent,
    wasteRatePercent,
    endingInventoryRatePercent,
    expectedClosingOnHandCookedLb,
    unexplainedDifferenceCookedLb,
    reconciled: Math.abs(unexplainedDifferenceCookedLb) <= 0.01,
    explanations: {
      forecastVarianceCookedLb: FORMULA_GLOSSARY.forecastVarianceCookedLb,
      forecastVariancePercent: FORMULA_GLOSSARY.forecastVariancePercent,
      forecastAccuracyPercent:
        FORMULA_GLOSSARY.dailyForecastAccuracyPercent,
      productionVarianceCookedLb:
        FORMULA_GLOSSARY.productionVarianceCookedLb,
      actualYieldPercent: FORMULA_GLOSSARY.actualYieldPercent,
      wasteRatePercent: FORMULA_GLOSSARY.wasteRatePercent,
      endingInventoryRatePercent:
        FORMULA_GLOSSARY.endingInventoryRatePercent,
      expectedClosingOnHandCookedLb:
        FORMULA_GLOSSARY.inventoryExpectedClosingCookedLb,
      unexplainedDifferenceCookedLb:
        FORMULA_GLOSSARY.inventoryUnexplainedDifferenceCookedLb,
    },
  };
}

function loadAdherence(loads, startToleranceMinutes = 15, endToleranceMinutes = 15) {
  const eligible = loads.filter((load) => !load.cancelled);
  const rows = eligible.map((load) => {
    const startVarianceMinutes =
      load.actualStartOffsetMinutes === null
        ? null
        : round(
            load.actualStartOffsetMinutes -
              load.plannedStartOffsetMinutes,
          );
    const endVarianceMinutes =
      load.actualEndOffsetMinutes === null
        ? null
        : round(
            load.actualEndOffsetMinutes - load.plannedEndOffsetMinutes,
          );
    const startWithinTolerance =
      startVarianceMinutes !== null &&
      Math.abs(startVarianceMinutes) <= startToleranceMinutes;
    const endWithinTolerance =
      endVarianceMinutes !== null &&
      Math.abs(endVarianceMinutes) <= endToleranceMinutes;
    return {
      ...load,
      startVarianceMinutes,
      endVarianceMinutes,
      startWithinTolerance,
      endWithinTolerance,
      adherent: startWithinTolerance && endWithinTolerance,
    };
  });
  const adherentLoads = rows.filter((row) => row.adherent).length;
  return {
    eligibleLoads: rows.length,
    adherentLoads,
    adherencePercent:
      rows.length > 0 ? round((adherentLoads / rows.length) * 100, 2) : null,
    startToleranceMinutes,
    endToleranceMinutes,
    rows,
    explanation: FORMULA_GLOSSARY.planAdherencePercent,
  };
}

function smokerUtilization(smokers) {
  const rows = smokers.map((smoker) => {
    const utilizationPercent = percentage(
      smoker.occupiedCapacityMinutes,
      smoker.availableCapacityMinutes,
    );
    return {
      ...smoker,
      utilizationPercent,
      overCapacity:
        smoker.occupiedCapacityMinutes >
        smoker.availableCapacityMinutes + 0.001,
    };
  });
  const totalAvailableCapacityMinutes = round(
    rows.reduce(
      (sum, row) => sum + row.availableCapacityMinutes,
      0,
    ),
  );
  const totalOccupiedCapacityMinutes = round(
    rows.reduce(
      (sum, row) => sum + row.occupiedCapacityMinutes,
      0,
    ),
  );
  return {
    totalAvailableCapacityMinutes,
    totalOccupiedCapacityMinutes,
    utilizationPercent: percentage(
      totalOccupiedCapacityMinutes,
      totalAvailableCapacityMinutes,
    ),
    rows,
    explanation: FORMULA_GLOSSARY.smokerUtilizationPercent,
  };
}

function reportLineage(source) {
  const sourceSnapshot = {
    tenantId: source.tenantId,
    locationId: source.locationId,
    operatingDate: source.operatingDate,
    dayType: source.dayType,
    sourceIds: source.sourceIds,
  };
  return {
    ...clone(source.sourceIds),
    sourceHash: stableHash(sourceSnapshot),
    sourceSnapshot,
  };
}

function statusForDaily(source, products, utilization) {
  const blockers = [];
  if (!source.complete) {
    blockers.push("Source workflow is not marked complete.");
  }
  for (const field of source.missingSources) {
    blockers.push(`Required source is missing: ${field}.`);
  }
  for (const row of products) {
    if (!row.reconciled) {
      blockers.push(
        `${row.productCode} has ${row.unexplainedDifferenceCookedLb} cooked lb of unexplained inventory difference.`,
      );
    }
  }
  for (const smoker of utilization.rows.filter((row) => row.overCapacity)) {
    blockers.push(
      `${smoker.smokerName} occupied capacity exceeds available capacity.`,
    );
  }
  return {
    status: blockers.length ? "BLOCKED" : "COMPLETE",
    blockers,
  };
}

function deterministicJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function csvEscape(value) {
  const text =
    value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

export class ReportingLearningValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ReportingLearningValidationError";
    this.field = field;
  }
}

export function generateDailyOperationsReport(input) {
  const source = normalizeSource(input);
  const products = REPORT_PRODUCTS.map((productCode) =>
    productMetrics(productCode, source.products[productCode]),
  );
  const adherence = loadAdherence(source.loads);
  const utilization = smokerUtilization(source.smokers);
  const review = statusForDaily(source, products, utilization);

  const totals = {
    forecastCookedLb: round(
      products.reduce((sum, row) => sum + row.forecastCookedLb, 0),
    ),
    plannedCookedLb: round(
      products.reduce((sum, row) => sum + row.plannedCookedLb, 0),
    ),
    actualCookedProductionLb: round(
      products.reduce(
        (sum, row) => sum + row.actualCookedProductionLb,
        0,
      ),
    ),
    serviceUsageCookedLb: round(
      products.reduce(
        (sum, row) => sum + row.serviceUsageCookedLb,
        0,
      ),
    ),
    wasteCookedLb: round(
      products.reduce((sum, row) => sum + row.wasteCookedLb, 0),
    ),
    closingOnHandCookedLb: round(
      products.reduce(
        (sum, row) => sum + row.closingOnHandCookedLb,
        0,
      ),
    ),
    unexplainedDifferenceCookedLb: round(
      products.reduce(
        (sum, row) =>
          sum + row.unexplainedDifferenceCookedLb,
        0,
      ),
    ),
  };

  const reportCore = {
    reportVersion: REPORTING_LEARNING_VERSION,
    reportType: "DAILY",
    tenantId: source.tenantId,
    locationId: source.locationId,
    operatingDate: source.operatingDate,
    dayType: source.dayType,
    lineage: reportLineage(source),
    products,
    totals,
    planAdherence: adherence,
    smokerUtilization: utilization,
    reconciliation: {
      status: review.status,
      toleranceCookedLb: 0.01,
      unexplainedDifferenceCookedLb:
        totals.unexplainedDifferenceCookedLb,
      missingSources: source.missingSources,
      blockers: review.blockers,
      equation:
        FORMULA_GLOSSARY.inventoryExpectedClosingCookedLb,
    },
    formulaGlossary: FORMULA_GLOSSARY,
  };

  return {
    ...reportCore,
    reportId: `dr-${stableHash(reportCore)}`,
  };
}

function aggregateProducts(reports) {
  return REPORT_PRODUCTS.map((productCode) => {
    const rows = reports.map((report) =>
      report.products.find(
        (row) => row.productCode === productCode,
      ),
    );
    const sums = {};
    for (const field of PRODUCT_NUMBER_FIELDS) {
      sums[field] = round(
        rows.reduce((sum, row) => sum + Number(row[field]), 0),
      );
    }
    const metrics = productMetrics(productCode, sums);
    const absoluteForecastErrorCookedLb = round(
      rows.reduce(
        (sum, row) => sum + Math.abs(row.forecastVarianceCookedLb),
        0,
      ),
    );
    const wapePercent = percentage(
      absoluteForecastErrorCookedLb,
      sums.forecastCookedLb,
    );
    return {
      ...metrics,
      observationCount: rows.length,
      absoluteForecastErrorCookedLb,
      wapePercent,
      forecastAccuracyPercent:
        wapePercent === null
          ? null
          : round(Math.max(0, 100 - wapePercent), 2),
      explanations: {
        ...metrics.explanations,
        forecastAccuracyPercent:
          FORMULA_GLOSSARY.weeklyForecastAccuracyPercent,
      },
    };
  });
}

export function generateWeeklyOperationsReport(inputs) {
  if (!Array.isArray(inputs) || inputs.length < 1) {
    throw new ReportingLearningValidationError(
      "inputs",
      "At least one daily source is required.",
    );
  }
  const dailyReports = inputs
    .map((input) => generateDailyOperationsReport(input))
    .sort((a, b) => a.operatingDate.localeCompare(b.operatingDate));
  const tenantId = dailyReports[0].tenantId;
  const locationId = dailyReports[0].locationId;
  const dates = new Set();

  for (const report of dailyReports) {
    if (
      report.tenantId !== tenantId ||
      report.locationId !== locationId
    ) {
      throw new ReportingLearningValidationError(
        "tenantId",
        "Weekly report cannot combine tenants or locations.",
      );
    }
    if (dates.has(report.operatingDate)) {
      throw new ReportingLearningValidationError(
        "operatingDate",
        `Duplicate operating date: ${report.operatingDate}.`,
      );
    }
    dates.add(report.operatingDate);
  }

  const products = aggregateProducts(dailyReports);
  const totalEligibleLoads = dailyReports.reduce(
    (sum, report) => sum + report.planAdherence.eligibleLoads,
    0,
  );
  const totalAdherentLoads = dailyReports.reduce(
    (sum, report) => sum + report.planAdherence.adherentLoads,
    0,
  );
  const availableCapacityMinutes = round(
    dailyReports.reduce(
      (sum, report) =>
        sum +
        report.smokerUtilization.totalAvailableCapacityMinutes,
      0,
    ),
  );
  const occupiedCapacityMinutes = round(
    dailyReports.reduce(
      (sum, report) =>
        sum +
        report.smokerUtilization.totalOccupiedCapacityMinutes,
      0,
    ),
  );

  const blockers = dailyReports.flatMap((report) =>
    report.reconciliation.status === "COMPLETE"
      ? []
      : report.reconciliation.blockers.map(
          (blocker) => `${report.operatingDate}: ${blocker}`,
        ),
  );

  const reportCore = {
    reportVersion: REPORTING_LEARNING_VERSION,
    reportType: "WEEKLY",
    tenantId,
    locationId,
    periodStart: dailyReports[0].operatingDate,
    periodEnd: dailyReports.at(-1).operatingDate,
    observationCount: dailyReports.length,
    dailyReportIds: dailyReports.map((report) => report.reportId),
    sourceHashes: dailyReports.map(
      (report) => report.lineage.sourceHash,
    ),
    products,
    planAdherence: {
      eligibleLoads: totalEligibleLoads,
      adherentLoads: totalAdherentLoads,
      adherencePercent:
        totalEligibleLoads > 0
          ? round(
              (totalAdherentLoads / totalEligibleLoads) * 100,
              2,
            )
          : null,
      explanation: FORMULA_GLOSSARY.planAdherencePercent,
    },
    smokerUtilization: {
      totalAvailableCapacityMinutes: availableCapacityMinutes,
      totalOccupiedCapacityMinutes: occupiedCapacityMinutes,
      utilizationPercent: percentage(
        occupiedCapacityMinutes,
        availableCapacityMinutes,
      ),
      explanation: FORMULA_GLOSSARY.smokerUtilizationPercent,
    },
    reconciliation: {
      status: blockers.length ? "BLOCKED" : "COMPLETE",
      unexplainedDifferenceCookedLb: round(
        products.reduce(
          (sum, row) =>
            sum + row.unexplainedDifferenceCookedLb,
          0,
        ),
      ),
      blockers,
    },
    formulaGlossary: FORMULA_GLOSSARY,
  };

  return {
    ...reportCore,
    reportId: `wr-${stableHash(reportCore)}`,
  };
}

export function generateForecastLearningRecommendation(
  inputs,
  options = {},
) {
  const productCode = String(
    options.productCode || "",
  ).toUpperCase();
  if (!REPORT_PRODUCTS.includes(productCode)) {
    throw new ReportingLearningValidationError(
      "options.productCode",
      "A supported product code is required.",
    );
  }
  const requestedDayType = String(
    options.dayType || "",
  ).trim();
  const normalized = inputs
    .map(normalizeSource)
    .filter((source) => {
      if (
        !source.complete ||
        (requestedDayType && source.dayType !== requestedDayType)
      ) {
        return false;
      }
      const productRows = REPORT_PRODUCTS.map((productCode) =>
        productMetrics(productCode, source.products[productCode]),
      );
      const utilization = smokerUtilization(source.smokers);
      return (
        statusForDaily(source, productRows, utilization).status ===
        "COMPLETE"
      );
    })
    .sort((a, b) =>
      a.operatingDate.localeCompare(b.operatingDate),
    );

  if (!normalized.length) {
    return {
      recommendationVersion: REPORTING_LEARNING_VERSION,
      status: "INSUFFICIENT_DATA",
      productCode,
      dayType: requestedDayType || null,
      observationCount: 0,
      minimumObservationCount: 4,
      reason: "No complete matching observations are available.",
      recommendationId: null,
    };
  }

  const tenantId = normalized[0].tenantId;
  const locationId = normalized[0].locationId;
  for (const source of normalized) {
    if (
      source.tenantId !== tenantId ||
      source.locationId !== locationId
    ) {
      throw new ReportingLearningValidationError(
        "tenantId",
        "Learning observations cannot combine tenants or locations.",
      );
    }
  }

  if (normalized.length < 4) {
    return {
      recommendationVersion: REPORTING_LEARNING_VERSION,
      status: "INSUFFICIENT_DATA",
      tenantId,
      locationId,
      productCode,
      dayType: requestedDayType || normalized[0].dayType,
      observationCount: normalized.length,
      minimumObservationCount: 4,
      reason: "At least four complete matching observations are required.",
      recommendationId: null,
    };
  }

  let weightedForecast = 0;
  let weightedActual = 0;
  const evidence = normalized.map((source, index) => {
    const weight = index + 1;
    const row = source.products[productCode];
    weightedForecast += row.forecastCookedLb * weight;
    weightedActual += row.serviceUsageCookedLb * weight;
    return {
      operatingDate: source.operatingDate,
      dayType: source.dayType,
      forecastCookedLb: row.forecastCookedLb,
      actualServiceUsageCookedLb: row.serviceUsageCookedLb,
      weight,
      sourceHash: reportLineage(source).sourceHash,
      forecastId: source.sourceIds.forecastId,
      inventoryDayId: source.sourceIds.inventoryDayId,
    };
  });

  if (weightedForecast <= 0) {
    return {
      recommendationVersion: REPORTING_LEARNING_VERSION,
      status: "INSUFFICIENT_DATA",
      tenantId,
      locationId,
      productCode,
      dayType: requestedDayType || normalized[0].dayType,
      observationCount: normalized.length,
      minimumObservationCount: 4,
      reason: "Weighted approved forecast is zero.",
      recommendationId: null,
    };
  }

  const unboundedFactor = weightedActual / weightedForecast;
  const recommendedFactor = round(
    Math.min(1.15, Math.max(0.85, unboundedFactor)),
    4,
  );
  const adjustmentPercent = round(
    (recommendedFactor - 1) * 100,
    2,
  );
  const bounded =
    Math.abs(recommendedFactor - unboundedFactor) > 0.00005;
  const confidence =
    normalized.length >= 7 ? "HIGH" : "MODERATE";

  const core = {
    recommendationVersion: REPORTING_LEARNING_VERSION,
    status: "READY_FOR_REVIEW",
    tenantId,
    locationId,
    productCode,
    dayType: requestedDayType || normalized[0].dayType,
    observationCount: normalized.length,
    confidence,
    weightedForecastCookedLb: round(weightedForecast),
    weightedActualServiceUsageCookedLb: round(weightedActual),
    unboundedFactor: round(unboundedFactor, 4),
    recommendedFactor,
    adjustmentPercent,
    bounded,
    minimumFactor: 0.85,
    maximumFactor: 1.15,
    humanApprovalRequired: true,
    autoApplyAllowed: false,
    explanation: FORMULA_GLOSSARY.learningFactor,
    evidence,
  };

  return {
    ...core,
    recommendationId: `rec-${stableHash(core)}`,
  };
}

export function approveForecastLearningRecommendation(
  recommendation,
  approval,
) {
  if (
    !recommendation ||
    recommendation.recommendationVersion !==
      REPORTING_LEARNING_VERSION ||
    recommendation.status !== "READY_FOR_REVIEW" ||
    !recommendation.recommendationId
  ) {
    throw new ReportingLearningValidationError(
      "recommendation",
      "Approval requires a reviewable Build 11.7.0 recommendation.",
    );
  }

  const person = normalizeActor(approval?.actor);
  if (!APPROVER_ROLES.has(person.role)) {
    throw new ReportingLearningValidationError(
      "actor.role",
      `${person.role} cannot approve forecast-learning recommendations.`,
    );
  }
  const approvedAt = timestamp(
    approval?.approvedAt || new Date().toISOString(),
    "approvedAt",
  );
  const reason = String(approval?.reason || "").trim();
  if (
    Math.abs(recommendation.adjustmentPercent) > 10 &&
    reason.length < 5
  ) {
    throw new ReportingLearningValidationError(
      "reason",
      "A recommendation above 10% requires an approval reason.",
    );
  }

  const core = {
    recordVersion:
      "PTT_FORECAST_RECOMMENDATION_APPROVAL_11_7_0",
    recommendationId: recommendation.recommendationId,
    recommendationVersion:
      recommendation.recommendationVersion,
    tenantId: recommendation.tenantId,
    locationId: recommendation.locationId,
    productCode: recommendation.productCode,
    dayType: recommendation.dayType,
    approvedFactor: recommendation.recommendedFactor,
    adjustmentPercent: recommendation.adjustmentPercent,
    confidence: recommendation.confidence,
    observationCount: recommendation.observationCount,
    approvedBy: person,
    approvedAt,
    reason:
      reason ||
      "Reviewed forecast-learning recommendation approved",
    evidence: clone(recommendation.evidence),
    recommendationSnapshot: clone(recommendation),
    effectiveDate: approval?.effectiveDate
      ? dateOnly(approval.effectiveDate, "effectiveDate")
      : null,
    appliedAutomatically: false,
  };

  return {
    ...core,
    approvalId: `ra-${stableHash(core)}`,
  };
}

export function createReportExport(report, format) {
  if (
    !report ||
    report.reportVersion !== REPORTING_LEARNING_VERSION
  ) {
    throw new ReportingLearningValidationError(
      "report",
      "Export requires a Build 11.7.0 report.",
    );
  }
  const normalizedFormat = String(format || "").toUpperCase();
  if (!["CSV", "JSON"].includes(normalizedFormat)) {
    throw new ReportingLearningValidationError(
      "format",
      "Export format must be CSV or JSON.",
    );
  }

  let content;
  let mimeType;
  let extension;
  if (normalizedFormat === "JSON") {
    content = deterministicJson({
      report,
      formulaGlossary: FORMULA_GLOSSARY,
      lineage:
        report.lineage ||
        {
          dailyReportIds: report.dailyReportIds,
          sourceHashes: report.sourceHashes,
        },
    });
    mimeType = "application/json";
    extension = "json";
  } else {
    const headers = [
      "reportId",
      "reportType",
      "periodStart",
      "periodEnd",
      "operatingDate",
      "productCode",
      "forecastCookedLb",
      "serviceUsageCookedLb",
      "forecastVarianceCookedLb",
      "forecastVariancePercent",
      "forecastAccuracyPercent",
      "plannedCookedLb",
      "actualCookedProductionLb",
      "productionVarianceCookedLb",
      "actualYieldPercent",
      "wasteCookedLb",
      "wasteRatePercent",
      "closingOnHandCookedLb",
      "endingInventoryRatePercent",
      "unexplainedDifferenceCookedLb",
      "sourceHash",
    ];
    const rows = report.products.map((row) => ({
      reportId: report.reportId,
      reportType: report.reportType,
      periodStart: report.periodStart || "",
      periodEnd: report.periodEnd || "",
      operatingDate: report.operatingDate || "",
      productCode: row.productCode,
      forecastCookedLb: row.forecastCookedLb,
      serviceUsageCookedLb: row.serviceUsageCookedLb,
      forecastVarianceCookedLb: row.forecastVarianceCookedLb,
      forecastVariancePercent: row.forecastVariancePercent,
      forecastAccuracyPercent: row.forecastAccuracyPercent,
      plannedCookedLb: row.plannedCookedLb,
      actualCookedProductionLb: row.actualCookedProductionLb,
      productionVarianceCookedLb: row.productionVarianceCookedLb,
      actualYieldPercent: row.actualYieldPercent,
      wasteCookedLb: row.wasteCookedLb,
      wasteRatePercent: row.wasteRatePercent,
      closingOnHandCookedLb: row.closingOnHandCookedLb,
      endingInventoryRatePercent:
        row.endingInventoryRatePercent,
      unexplainedDifferenceCookedLb:
        row.unexplainedDifferenceCookedLb,
      sourceHash:
        report.lineage?.sourceHash ||
        (report.sourceHashes || []).join("|"),
    }));
    const lines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => csvEscape(row[header]))
          .join(","),
      ),
      "",
      "formula_key,formula",
      ...Object.entries(FORMULA_GLOSSARY).map(
        ([key, formula]) =>
          `${csvEscape(key)},${csvEscape(formula)}`,
      ),
    ];
    content = `${lines.join("\n")}\n`;
    mimeType = "text/csv";
    extension = "csv";
  }

  const periodLabel =
    report.reportType === "DAILY"
      ? report.operatingDate
      : `${report.periodStart}_to_${report.periodEnd}`;
  const core = {
    exportVersion: REPORTING_LEARNING_VERSION,
    reportId: report.reportId,
    reportType: report.reportType,
    format: normalizedFormat,
    filename: `ptt-${report.reportType.toLowerCase()}-report-${periodLabel}.${extension}`,
    mimeType,
    content,
    formulaGlossaryIncluded: true,
    sourceLineageIncluded: true,
  };
  return {
    ...core,
    checksum: stableHash(core),
  };
}

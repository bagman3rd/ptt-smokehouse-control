export type ReportProductCode = "BRISKET" | "PORK" | "RIBS" | "CHICKEN";
export type ReportRole = "ADMIN" | "OWNER" | "KM" | "PITMASTER" | "KC" | "VIEWER";

export interface ReportActor {
  id: string;
  name: string;
  role: ReportRole;
}

export interface DailyReportingSource {
  tenantId: string;
  locationId: string;
  operatingDate: string;
  dayType: string;
  complete: boolean;
  sources: {
    forecastId: string | null;
    productionPlanId: string | null;
    executionRecordId: string | null;
    inventoryDayId: string | null;
    physicalCountRecordId: string | null;
    sourceRevision: string | null;
  };
  products: Record<
    ReportProductCode,
    {
      forecastCookedLb: number;
      plannedCookedLb: number;
      actualRawInputLb: number;
      actualCookedProductionLb: number;
      openingCookedLb: number;
      productionReceiptCookedLb: number;
      transferInCookedLb: number;
      serviceUsageCookedLb: number;
      wasteCookedLb: number;
      transferOutCookedLb: number;
      adjustmentCookedLb: number;
      closingOnHandCookedLb: number;
    }
  >;
  loads: Array<{
    loadId: string;
    productCode: ReportProductCode;
    plannedStartOffsetMinutes: number;
    actualStartOffsetMinutes: number | null;
    plannedEndOffsetMinutes: number;
    actualEndOffsetMinutes: number | null;
    cancelled: boolean;
  }>;
  smokers: Array<{
    smokerId: string;
    smokerName: string;
    availableCapacityMinutes: number;
    occupiedCapacityMinutes: number;
  }>;
}

export interface ProductReportMetrics {
  productCode: ReportProductCode;
  forecastCookedLb: number;
  serviceUsageCookedLb: number;
  forecastVarianceCookedLb: number;
  forecastVariancePercent: number | null;
  forecastAccuracyPercent: number | null;
  plannedCookedLb: number;
  actualCookedProductionLb: number;
  productionVarianceCookedLb: number;
  actualRawInputLb: number;
  actualYieldPercent: number | null;
  wasteCookedLb: number;
  wasteRatePercent: number | null;
  closingOnHandCookedLb: number;
  endingInventoryRatePercent: number | null;
  expectedClosingOnHandCookedLb: number;
  unexplainedDifferenceCookedLb: number;
  reconciled: boolean;
  [key: string]: unknown;
}

export interface DailyOperationsReport {
  reportVersion: "PTT_REPORTING_LEARNING_11_7_0";
  reportId: string;
  reportType: "DAILY";
  tenantId: string;
  locationId: string;
  operatingDate: string;
  dayType: string;
  lineage: Record<string, unknown>;
  products: ProductReportMetrics[];
  totals: Record<string, number>;
  planAdherence: Record<string, unknown>;
  smokerUtilization: Record<string, unknown>;
  reconciliation: {
    status: "COMPLETE" | "BLOCKED";
    toleranceCookedLb: number;
    unexplainedDifferenceCookedLb: number;
    missingSources: string[];
    blockers: string[];
    equation: string;
  };
  formulaGlossary: Record<string, string>;
}

export interface WeeklyOperationsReport {
  reportVersion: "PTT_REPORTING_LEARNING_11_7_0";
  reportId: string;
  reportType: "WEEKLY";
  tenantId: string;
  locationId: string;
  periodStart: string;
  periodEnd: string;
  observationCount: number;
  dailyReportIds: string[];
  sourceHashes: string[];
  products: ProductReportMetrics[];
  planAdherence: Record<string, unknown>;
  smokerUtilization: Record<string, unknown>;
  reconciliation: {
    status: "COMPLETE" | "BLOCKED";
    unexplainedDifferenceCookedLb: number;
    blockers: string[];
  };
  formulaGlossary: Record<string, string>;
}

export interface ForecastLearningRecommendation {
  recommendationVersion: "PTT_REPORTING_LEARNING_11_7_0";
  recommendationId: string | null;
  status: "READY_FOR_REVIEW" | "INSUFFICIENT_DATA";
  tenantId?: string;
  locationId?: string;
  productCode: ReportProductCode;
  dayType: string | null;
  observationCount: number;
  minimumObservationCount?: number;
  confidence?: "MODERATE" | "HIGH";
  unboundedFactor?: number;
  recommendedFactor?: number;
  adjustmentPercent?: number;
  bounded?: boolean;
  minimumFactor?: number;
  maximumFactor?: number;
  humanApprovalRequired?: boolean;
  autoApplyAllowed?: false;
  evidence?: Array<Record<string, unknown>>;
  reason?: string;
}

export const REPORTING_LEARNING_VERSION: "PTT_REPORTING_LEARNING_11_7_0";
export const REPORT_PRODUCTS: ReadonlyArray<ReportProductCode>;
export const FORMULA_GLOSSARY: Readonly<Record<string, string>>;

export class ReportingLearningValidationError extends Error {
  field: string;
  constructor(field: string, message: string);
}

export function generateDailyOperationsReport(
  input: DailyReportingSource,
): DailyOperationsReport;
export function generateWeeklyOperationsReport(
  inputs: DailyReportingSource[],
): WeeklyOperationsReport;
export function generateForecastLearningRecommendation(
  inputs: DailyReportingSource[],
  options: {
    productCode: ReportProductCode;
    dayType?: string;
  },
): ForecastLearningRecommendation;
export function approveForecastLearningRecommendation(
  recommendation: ForecastLearningRecommendation,
  approval: {
    actor: ReportActor;
    approvedAt?: string;
    reason?: string;
    effectiveDate?: string;
  },
): Record<string, unknown>;
export function createReportExport(
  report: DailyOperationsReport | WeeklyOperationsReport,
  format: "CSV" | "JSON",
): {
  exportVersion: "PTT_REPORTING_LEARNING_11_7_0";
  reportId: string;
  reportType: "DAILY" | "WEEKLY";
  format: "CSV" | "JSON";
  filename: string;
  mimeType: string;
  content: string;
  formulaGlossaryIncluded: true;
  sourceLineageIncluded: true;
  checksum: string;
};

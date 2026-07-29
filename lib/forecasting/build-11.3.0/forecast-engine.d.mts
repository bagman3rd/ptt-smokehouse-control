export type ForecastProductCode = "BRISKET" | "PORK" | "RIBS" | "CHICKEN";
export type ForecastConfidenceBadge = "HIGH" | "MEDIUM" | "LOW";
export type EventCertainty = ForecastConfidenceBadge;

export interface ForecastInput {
  operatingDate: string;
  baselineDemand: Record<ForecastProductCode, number>;
  monthlyFactor: number;
  eventAdjustmentPercent: number;
  manualAdjustmentPercent: number;
  reason: string;
  eventCertainty: EventCertainty;
  dataFreshnessDays: number;
  recentSampleDays: number;
  recentMapePercent: number;
  modeledSalesDollars: number;
  smokedFoodShareOfFoodPercent: number;
}

export interface ForecastProductLine {
  productCode: ForecastProductCode;
  productName: string;
  unit: string;
  baselineDemand: number;
  automaticDemand: number;
  manualAdjustmentPercent: number;
  finalDemand: number;
  displayDemand: number;
}

export interface ForecastCalculation {
  calculationVersion: "PTT_FORECAST_11_3_0";
  calculationId: string;
  operatingDate: string;
  dayOfWeek: {
    key: string;
    name: string;
    share: number;
    averageShare: number;
    factor: number;
  };
  factors: {
    monthlyFactor: number;
    eventAdjustmentPercent: number;
    eventFactor: number;
    automaticFactor: number;
    manualAdjustmentPercent: number;
    manualFactor: number;
    finalFactor: number;
  };
  demand: {
    baseline: Record<ForecastProductCode, number>;
    lines: ForecastProductLine[];
  };
  confidence: {
    score: number;
    badge: ForecastConfidenceBadge;
    dataFreshnessDays: number;
    recentSampleDays: number;
    recentMapePercent: number;
    eventCertainty: EventCertainty;
  };
  salesDisplay: {
    modeledSalesDollars: number;
    barAllocationPercent: 20;
    barSalesDollars: number;
    foodAllocationPercent: 80;
    foodSalesDollars: number;
    smokedFoodShareOfFoodPercent: number;
    smokedFoodSalesDollars: number;
  };
  review: {
    approvalRequired: boolean;
    automaticReviewRequired: boolean;
    highImpactManualAdjustment: boolean;
    reason: string;
    warnings: string[];
  };
  explanation: string[];
}

export interface ForecastApprovalRecord {
  recordVersion: "PTT_FORECAST_APPROVAL_11_3_0";
  approvalId: string;
  calculationId: string;
  calculationVersion: string;
  operatingDate: string;
  approvedBy: string;
  approvedAt: string;
  reason: string;
  finalFactor: number;
  confidence: ForecastCalculation["confidence"];
  demandLines: Array<{
    productCode: ForecastProductCode;
    unit: string;
    finalDemand: number;
  }>;
  warningsAccepted: string[];
}

export const FORECAST_CALCULATION_VERSION: "PTT_FORECAST_11_3_0";
export const DAY_OF_WEEK_SHARES: Readonly<Record<string, number>>;
export const FORECAST_PRODUCTS: ReadonlyArray<{
  code: ForecastProductCode;
  name: string;
  unit: string;
  displayPrecision: number;
}>;

export class ForecastValidationError extends Error {
  field: string;
  constructor(field: string, message: string);
}

export function calculateForecast(input: ForecastInput): ForecastCalculation;
export function createForecastApprovalRecord(
  calculation: ForecastCalculation,
  approval: { actor: string; approvedAt?: string; reason?: string },
): ForecastApprovalRecord;

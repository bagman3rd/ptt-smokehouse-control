export type ProductionProductCode = "BRISKET" | "PORK" | "RIBS" | "CHICKEN";
export type PlanningMode = "WEIGHT_YIELD" | "UNIT_COUNT";
export type ScheduleClass = "OVERNIGHT" | "SAME_DAY";
export type PlanStatus = "READY" | "REVIEW" | "BLOCKED";

export interface ProductPlanningInput {
  code: ProductionProductCode;
  planningMode: PlanningMode;
  yieldPercent: number;
  rawWeightPerUnitLb: number | null;
  cookedWeightPerUnitLb: number | null;
  sealedCarryoverEligible: boolean;
  bufferPercent: number;
  bufferReason: string;
  carryover: {
    sourceOperatingDate: string;
    sealedUnits: number;
    openCookedLb: number;
  };
  schedule: {
    classification: ScheduleClass;
    windowStartOffsetMinutes: number;
    windowEndOffsetMinutes: number;
    durationMinutes: number | null;
  };
}

export interface SmokerPlanningInput {
  id: string;
  name: string;
  brand: string;
  model: string;
  location: string;
  cookWindow:
    | "Overnight only"
    | "Same-day only"
    | "All day / flexible"
    | "Backup / overflow only"
    | "Not currently active";
  active: boolean;
  availability: Array<{ startOffsetMinutes: number; endOffsetMinutes: number }>;
  capacities: Partial<Record<ProductionProductCode, number>>;
  validationOnlyCapacities?: ProductionProductCode[];
}

export interface ProductionPlanInput {
  serviceDate: string;
  forecastCalculationId?: string;
  demand: Record<ProductionProductCode, number>;
  products: ProductPlanningInput[];
  smokers: SmokerPlanningInput[];
}

export interface ProductionRequirement {
  productCode: ProductionProductCode;
  productName: string;
  planningMode: PlanningMode;
  forecastDemand: number;
  bufferPercent: number;
  bufferedDemand: number;
  yieldPercent: number;
  rawWeightPerUnitLb: number | null;
  cookedWeightPerUnitLb: number | null;
  carryover: {
    sourceOperatingDate: string;
    expectedSourceDate: string;
    sourceIsPriorDay: boolean;
    sealedUnits: number;
    openCookedLb: number;
    sealedCredit: number;
    openCredit: number;
    totalCredit: number;
    surplus: number;
    applied: boolean;
  };
  netDemand: number;
  exactRawLb: number;
  plannedRawLb: number;
  plannedUnits: number | null;
  expectedCookedOutputLb: number;
  expectedOutputInDemandUnits: number;
  roundingOverage: number;
  warnings: string[];
  blockers: string[];
}

export interface ProductionPlan {
  calculationVersion: "PTT_PRODUCTION_PLAN_11_4_0";
  planId: string;
  forecastCalculationId: string;
  serviceDate: string;
  serviceDayName: string;
  priorOperatingDate: string;
  requirements: ProductionRequirement[];
  schedule: {
    bookings: Array<{
      batchId: string;
      smokerId: string;
      smokerName: string;
      smokerBrand: string;
      smokerModel: string;
      cookWindow: string;
      backupUsed: boolean;
      productCode: ProductionProductCode;
      productName: string;
      quantity: number;
      capacity: number;
      utilizationPercent: number;
      startOffsetMinutes: number;
      endOffsetMinutes: number;
      start: { iso: string; localLabel: string; date: string; time: string };
      end: { iso: string; localLabel: string; date: string; time: string };
      validationOnlyCapacity: boolean;
    }>;
    unscheduled: Array<{
      productCode: ProductionProductCode;
      quantity: number;
      reason: string;
    }>;
    unscheduledUnits: number;
    smokerCount: number;
    activeSmokerCount: number;
    batchCount: number;
    backupBatchCount: number;
  };
  review: {
    status: PlanStatus;
    approvalAllowed: boolean;
    warnings: string[];
    blockers: string[];
  };
  explanation: string[];
}

export const PRODUCTION_CALCULATION_VERSION: "PTT_PRODUCTION_PLAN_11_4_0";
export const PRODUCTION_PRODUCTS: ReadonlyArray<{
  code: ProductionProductCode;
  name: string;
}>;
export const SMOKER_COOK_WINDOWS: ReadonlyArray<string>;

export class ProductionValidationError extends Error {
  field: string;
  constructor(field: string, message: string);
}

export function calculateProductionPlan(input: ProductionPlanInput): ProductionPlan;
export function createProductionApprovalRecord(
  plan: ProductionPlan,
  approval: { actor: string; approvedAt?: string; reason?: string },
): {
  recordVersion: "PTT_PRODUCTION_APPROVAL_11_4_0";
  approvalId: string;
  planId: string;
  calculationVersion: string;
  forecastCalculationId: string;
  serviceDate: string;
  approvedBy: string;
  approvedAt: string;
  reason: string;
  statusAtApproval: PlanStatus;
  warningsAccepted: string[];
  requirements: unknown[];
  bookings: unknown[];
};

export type TodayRole = "ADMIN" | "OWNER" | "KM" | "PITMASTER" | "KC" | "VIEWER";
export type TodayProductCode = "BRISKET" | "PORK" | "RIBS" | "CHICKEN";
export type LoadStatus =
  | "PLANNED"
  | "READY"
  | "LOADED"
  | "COOKING"
  | "RESTING"
  | "HOLDING"
  | "READY_FOR_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "EXCEPTION";

export interface TodayActor {
  id: string;
  name: string;
  role: TodayRole;
}

export interface OperatingDayInput {
  operatingDate: string;
  locationTimezone: string;
  planId: string;
  forecastCalculationId: string;
  weatherNote?: string;
  eventNote?: string;
  forecastSummary?: Record<string, number>;
  createdAt?: string;
  loads: Array<{
    loadId: string;
    productCode: TodayProductCode;
    productName: string;
    plannedQuantity: number;
    unit: string;
    cookedEquivalentPerOperationalUnitLb: number | null;
    smokerId: string;
    smokerName: string;
    plannedStartOffsetMinutes: number;
    plannedEndOffsetMinutes: number;
  }>;
  eodProducts: Array<{
    productCode: TodayProductCode;
    productName: string;
    cookedWeightPerSealedUnitLb: number | null;
    sealedCarryoverEligible: boolean;
  }>;
}

export interface OperatingDayCommand {
  commandId: string;
  occurredAt: string;
  type:
    | "ASSIGN_LOAD_OWNER"
    | "SET_LOAD_STATUS"
    | "FLAG_EXCEPTION"
    | "RESOLVE_EXCEPTION"
    | "CANCEL_LOAD"
    | "CORRECT_LOAD_STATUS"
    | "ADD_LOAD_NOTE"
    | "SUBMIT_EOD_PRODUCT"
    | "CORRECT_EOD_PRODUCT"
    | "CLOSE_OPERATING_DAY";
  actor: TodayActor;
  payload: Record<string, unknown>;
}

export interface OperatingDayState {
  engineVersion: "PTT_TODAY_OPERATIONS_11_5_0";
  dayId: string;
  operatingDate: string;
  dayOfWeek: string;
  locationTimezone: string;
  planId: string;
  forecastCalculationId: string;
  weatherNote: string;
  eventNote: string;
  forecastSummary: Record<string, number>;
  status: "OPEN" | "CLOSED";
  loads: Array<Record<string, unknown>>;
  eod: {
    products: Array<Record<string, unknown>>;
    submissions: Record<string, Record<string, unknown>>;
    corrections: Array<Record<string, unknown>>;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
  };
  eventLog: Array<Record<string, unknown>>;
  processedCommandIds: string[];
  close: Record<string, unknown> | null;
  rollover: Record<string, unknown> | null;
}

export const TODAY_OPERATIONS_VERSION: "PTT_TODAY_OPERATIONS_11_5_0";
export const LOAD_STATUSES: ReadonlyArray<LoadStatus>;
export const STANDARD_STATUS_FLOW: ReadonlyArray<LoadStatus>;
export const TERMINAL_LOAD_STATUSES: ReadonlyArray<LoadStatus>;

export class TodayOperationsValidationError extends Error {
  field: string;
  constructor(field: string, message: string);
}

export function createOperatingDay(input: OperatingDayInput): OperatingDayState;
export function executeOperatingDayCommand(
  state: OperatingDayState,
  command: OperatingDayCommand,
): {
  state: OperatingDayState;
  result: {
    status: "APPLIED" | "DUPLICATE";
    eventId?: string | null;
    [key: string]: unknown;
  };
};
export interface TodayBoard {
  boardVersion: "PTT_TODAY_OPERATIONS_11_5_0";
  dayId: string;
  operatingDate: string;
  dayOfWeek: string;
  status: "OPEN" | "CLOSED";
  weatherNote: string;
  eventNote: string;
  forecastSummary: Record<string, number>;
  urgentActions: Array<{
    type: string;
    severity: "P0" | "P1" | "P2" | "P3";
    loadId: string | null;
    message: string;
  }>;
  urgentActionCount: number;
  statusCounts: Record<LoadStatus, number>;
  eodStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
  closeBlockers: string[];
  loadCards: Array<{
    loadId: string;
    productCode: TodayProductCode;
    productName: string;
    plannedQuantity: number;
    actualQuantity: number | null;
    unit: string;
    smokerId: string;
    smokerName: string;
    plannedStartOffsetMinutes: number;
    plannedEndOffsetMinutes: number;
    actualTimes: Record<string, string>;
    status: LoadStatus;
    owner: TodayActor | null;
    nextAction: string;
    exception: Record<string, unknown> | null;
    noteCount: number;
  }>;
}

export function deriveTodayBoard(
  state: OperatingDayState,
  nowIso: string,
): TodayBoard;
export function createContingencySnapshot(
  state: OperatingDayState,
  generatedAt: string,
): Record<string, unknown>;
export function rolloverOperatingDay(
  closedState: OperatingDayState,
  nextDayInput: OperatingDayInput,
  command: {
    commandId: string;
    occurredAt: string;
    type: "ROLLOVER_OPERATING_DAY";
    actor: TodayActor;
    payload?: Record<string, unknown>;
  },
): {
  closedDay: OperatingDayState;
  nextDay: OperatingDayState | null;
  carryover: Array<Record<string, unknown>>;
  result: Record<string, unknown>;
};

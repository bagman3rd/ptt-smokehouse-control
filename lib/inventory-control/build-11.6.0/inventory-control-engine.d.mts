export type InventoryRole = "ADMIN" | "OWNER" | "KM" | "PITMASTER" | "KC" | "VIEWER";
export type InventoryProductCode = "BRISKET" | "PORK" | "RIBS" | "CHICKEN";
export type InventoryExceptionSeverity = "P0" | "P1" | "P2" | "P3";

export interface InventoryActor {
  id: string;
  name: string;
  role: InventoryRole;
}
export interface InventoryDayInput {
  tenantId: string;
  locationId: string;
  operatingDate: string;
  timezone: string;
  createdAt?: string;
  products: Array<{
    productCode: InventoryProductCode;
    productName: string;
    openingCookedLb: number;
    cookedLbPerOperationalUnit: number | null;
  }>;
}
export interface InventoryDayState {
  engineVersion: "PTT_INVENTORY_CONTROL_11_6_0";
  inventoryDayId: string;
  tenantId: string;
  locationId: string;
  operatingDate: string;
  timezone: string;
  status: "OPEN" | "CLOSED";
  products: Array<Record<string, unknown>>;
  ledger: Array<Record<string, unknown>>;
  holds: Array<Record<string, unknown>>;
  exceptions: Array<Record<string, unknown>>;
  counts: Record<string, Record<string, unknown>>;
  countCorrections: Array<Record<string, unknown>>;
  notes: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  processedCommandIds: string[];
  close: Record<string, unknown> | null;
}
export interface InventoryCommand {
  commandId: string;
  occurredAt: string;
  type: string;
  tenantId?: string;
  actor: InventoryActor;
  payload: Record<string, unknown>;
}
export interface InventoryBoard {
  boardVersion: "PTT_INVENTORY_CONTROL_11_6_0";
  inventoryDayId: string;
  tenantId: string;
  locationId: string;
  operatingDate: string;
  status: "OPEN" | "CLOSED";
  generatedAt: string;
  balances: Array<{
    productCode: InventoryProductCode;
    openingCookedLb: number;
    availableCookedLb: number;
    heldCookedLb: number;
    onHandCookedLb: number;
    wasteCookedLb: number;
  }>;
  openHolds: Array<Record<string, unknown>>;
  openExceptions: Array<Record<string, unknown>>;
  counts: Record<string, Record<string, unknown>>;
  wasteTotalCookedLb: number;
  urgentActions: Array<{
    type: string;
    severity: InventoryExceptionSeverity;
    productCode: InventoryProductCode | null;
    referenceId: string | null;
    message: string;
  }>;
  urgentActionCount: number;
  closeBlockers: string[];
}

export const INVENTORY_CONTROL_VERSION: "PTT_INVENTORY_CONTROL_11_6_0";
export const INVENTORY_PRODUCTS: ReadonlyArray<InventoryProductCode>;
export const WASTE_REASONS: ReadonlyArray<string>;
export const HOLD_REASONS: ReadonlyArray<string>;

export class InventoryControlValidationError extends Error {
  field: string;
  constructor(field: string, message: string);
}
export function createInventoryDay(input: InventoryDayInput): InventoryDayState;
export function executeInventoryCommand(
  state: InventoryDayState,
  command: InventoryCommand,
): {
  state: InventoryDayState;
  result: {
    status: "APPLIED" | "DUPLICATE";
    eventId?: string | null;
    [key: string]: unknown;
  };
};
export function deriveInventoryBoard(state: InventoryDayState, nowIso: string): InventoryBoard;
export function createInventoryContingencySnapshot(
  state: InventoryDayState,
  generatedAt: string,
): Record<string, unknown>;

export type MultiLocationRole =
  | "ADMIN"
  | "OWNER"
  | "KM"
  | "PITMASTER"
  | "KC"
  | "VIEWER";

export interface MultiLocationContext {
  contextVersion: "PTT_MULTI_LOCATION_12_1_0";
  tenantId: string;
  userId: string;
  membershipId: string;
  role: MultiLocationRole;
  requestedLocationId: string | null;
  activeLocationId: string | null;
  selectionRequired: boolean;
  accessibleLocations: Array<Record<string, unknown>>;
  location?: Record<string, unknown>;
}

export const MULTI_LOCATION_VERSION: "PTT_MULTI_LOCATION_12_1_0";
export const MULTI_LOCATION_ROLES: ReadonlyArray<MultiLocationRole>;
export const REQUIRED_LOCATION_PRODUCTS: ReadonlyArray<string>;
export const ACTIVE_OPERATIONAL_LOCATION_STATUSES: ReadonlyArray<string>;

export class MultiLocationValidationError extends Error {
  field: string;
  constructor(field: string, message: string);
}

export function resolveLocationContext(
  registry: Record<string, unknown>,
  actor: Record<string, unknown>,
  requestedLocationId?: string | null,
): MultiLocationContext;

export function authorizeLocationAction(
  registry: Record<string, unknown>,
  contract: Record<string, unknown>,
  input: Record<string, unknown>,
): Record<string, unknown>;

export function createLocationSwitchRecord(
  registry: Record<string, unknown>,
  contract: Record<string, unknown>,
  input: Record<string, unknown>,
): Record<string, unknown>;

export function evaluateLocationReadiness(
  registry: Record<string, unknown>,
  locationId: string,
): any;

export function resolveLocationMasterData(
  registry: Record<string, unknown>,
  input: Record<string, unknown>,
): any;

export function createLocationScopedRecord(
  input: Record<string, unknown>,
): any;

export function assertLocationScopedRecord(
  record: Record<string, unknown>,
  context: MultiLocationContext,
): any;

export function createTransferOrder(
  registry: Record<string, unknown>,
  contract: Record<string, unknown>,
  input: Record<string, unknown>,
): any;

export function approveTransferOrder(
  registry: Record<string, unknown>,
  contract: Record<string, unknown>,
  transfer: Record<string, unknown>,
  input: Record<string, unknown>,
): {
  record: any;
  duplicate: boolean;
  event: any;
};

export function dispatchTransferOrder(
  registry: Record<string, unknown>,
  contract: Record<string, unknown>,
  transfer: Record<string, unknown>,
  input: Record<string, unknown>,
): {
  record: any;
  duplicate: boolean;
  event: any;
};

export function receiveTransferOrder(
  registry: Record<string, unknown>,
  contract: Record<string, unknown>,
  transfer: Record<string, unknown>,
  input: Record<string, unknown>,
): {
  record: any;
  duplicate: boolean;
  event: any;
};

export function generateConsolidatedLocationReport(
  registry: Record<string, unknown>,
  contract: Record<string, unknown>,
  input: Record<string, unknown>,
): any;

export function evaluateLocationOnboarding(
  contract: Record<string, unknown>,
  input: Record<string, unknown>,
): any;

export function createLocationActivationRecord(
  registry: Record<string, unknown>,
  contract: Record<string, unknown>,
  onboarding: Record<string, unknown>,
  input: Record<string, unknown>,
): any;

export function evaluateLocationDeactivation(
  registry: Record<string, unknown>,
  contract: Record<string, unknown>,
  input: Record<string, unknown>,
): any;

export function evaluateSingleLocationMigration(
  input: Record<string, unknown>,
): any;

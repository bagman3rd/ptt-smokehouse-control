export const POS_DATA_INTEGRATIONS_VERSION:
  "PTT_POS_DATA_INTEGRATIONS_12_2_0";
export const INTEGRATION_PROVIDERS: ReadonlyArray<string>;
export const INTEGRATION_ROLES: ReadonlyArray<string>;

export class IntegrationValidationError extends Error {
  field: string;
  constructor(field: string, message: string);
}

export function authorizeIntegrationAction(
  contract: Record<string, unknown>,
  input: Record<string, unknown>,
): any;

export function evaluateConnectionHealth(
  connection: Record<string, unknown>,
  contract: Record<string, unknown>,
  now: string,
): any;

export function assertAutomaticImportAllowed(
  connectionHealth: Record<string, unknown>,
): true;

export function normalizeSalesPayload(
  payload: Record<string, unknown>,
  registry: Record<string, unknown>,
): any;

export function createImportState(): {
  stateVersion: "PTT_POS_DATA_INTEGRATIONS_12_2_0";
  batchesByIdempotencyKey: Record<string, unknown>;
};

export function ingestSalesBatch(
  state: Record<string, unknown>,
  payload: Record<string, unknown>,
  registry: Record<string, unknown>,
): any;

export function mapSalesBatch(
  batch: Record<string, unknown>,
  mappings: Array<Record<string, unknown>>,
): any;

export function reconcileSalesBatch(
  batch: Record<string, unknown>,
  contract: Record<string, unknown>,
  input: Record<string, unknown>,
): any;

export function buildDailySalesSummary(
  batch: Record<string, unknown>,
): any;

export function compareActualSalesToForecast(
  summary: Record<string, unknown>,
  forecast: Record<string, unknown>,
): any;

export function createForecastLearningInput(
  batch: Record<string, unknown>,
  summary: Record<string, unknown>,
  forecast: Record<string, unknown>,
): any;

export function scheduleFailedBatchRetry(
  batch: Record<string, unknown>,
  contract: Record<string, unknown>,
  input: Record<string, unknown>,
): any;

export function createManualSalesBatch(
  payload: Record<string, unknown>,
  registry: Record<string, unknown>,
  mappings: Array<Record<string, unknown>>,
  contract: Record<string, unknown>,
  existingBatches?: Array<Record<string, unknown>>,
): any;

export function createSupplierCostSnapshot(
  rows: Array<Record<string, unknown>>,
  priorCosts: Array<Record<string, unknown>>,
  contract: Record<string, unknown>,
): any;

export function consolidateLocationSalesSummaries(
  summaries: Array<Record<string, unknown>>,
  tenantId: string,
): any;

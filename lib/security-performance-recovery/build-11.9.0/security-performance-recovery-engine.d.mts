export type HardeningRole =
  | "ADMIN"
  | "OWNER"
  | "KM"
  | "PITMASTER"
  | "KC"
  | "VIEWER";

export interface HardeningControl {
  control: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
  message: string;
  warning: boolean;
}

export interface HardeningAssessment {
  status: "PASS" | "FAIL";
  passed: boolean;
  controls: HardeningControl[];
  failures: HardeningControl[];
  warnings: HardeningControl[];
  [key: string]: unknown;
}

export const SECURITY_PERFORMANCE_RECOVERY_VERSION:
  "PTT_SECURITY_PERFORMANCE_RECOVERY_11_9_0";
export const HARDENING_ROLES: ReadonlyArray<HardeningRole>;
export const REQUIRED_SECURITY_HEADERS: ReadonlyArray<string>;
export const RATE_LIMIT_CATEGORIES: ReadonlyArray<string>;

export class HardeningValidationError extends Error {
  field: string;
  constructor(field: string, message: string);
}

export function evaluateSessionPolicy(
  config: Record<string, unknown>,
  policy: Record<string, unknown>,
): HardeningAssessment;

export function authorizeRequest(input: {
  actor: { role: HardeningRole; tenantId: string };
  resourceTenantId: string;
  action: string;
  policy: Record<HardeningRole, string[]>;
}): {
  allowed: boolean;
  reason: string;
  role: HardeningRole;
  action: string;
};

export function evaluateRequestSecurity(
  request: Record<string, unknown>,
  config: Record<string, unknown>,
): {
  status: "ACCEPTED" | "REJECTED";
  accepted: boolean;
  method: string;
  controls: HardeningControl[];
  failures: HardeningControl[];
};

export function createRateLimitState(): {
  version: "PTT_SECURITY_PERFORMANCE_RECOVERY_11_9_0";
  buckets: Record<string, number[]>;
};

export function consumeRateLimit(
  state: Record<string, unknown>,
  input: {
    category: string;
    key: string;
    occurredAt: string;
  },
  policies: Record<string, { limit: number; windowSeconds: number }>,
): {
  state: Record<string, unknown>;
  result: {
    category: string;
    key: string;
    allowed: boolean;
    remaining: number;
    limit: number;
    windowSeconds: number;
    retryAfterSeconds: number;
  };
};

export function appendAuditEvent(
  chain: Array<Record<string, unknown>>,
  input: Record<string, unknown>,
): Array<Record<string, unknown>>;

export function verifyAuditChain(
  chain: Array<Record<string, unknown>>,
): {
  valid: boolean;
  eventCount: number;
  headHash: string;
  failures: Array<Record<string, unknown>>;
};

export function evaluatePerformanceRun(
  input: Record<string, unknown>,
  budgets: Record<string, number>,
): HardeningAssessment;

export function evaluateDatabaseHealth(
  snapshot: Record<string, unknown>,
  policy: Record<string, unknown>,
): HardeningAssessment;

export function evaluateRecoveryReadiness(
  snapshot: Record<string, unknown>,
  policy: Record<string, unknown>,
): HardeningAssessment;

export function sanitizeHardeningData(
  value: unknown,
  patterns: string[],
): unknown;

export function findSecretLeaks(
  value: unknown,
  patterns: string[],
): Array<Record<string, unknown>>;

export function createSanitizedHardeningBundle(
  input: Record<string, unknown>,
  patterns: string[],
): {
  bundle: Record<string, unknown>;
  secretLeaks: Array<Record<string, unknown>>;
};

export function generateReleaseGateReport(
  input: Record<string, unknown>,
): {
  gateVersion: "PTT_RELEASE_GATE_11_9_0";
  gateId: string;
  decision: "GO" | "HOLD";
  passed: boolean;
  generatedAt: string;
  controls: HardeningControl[];
  failures: HardeningControl[];
  evidence: Record<string, unknown>;
};

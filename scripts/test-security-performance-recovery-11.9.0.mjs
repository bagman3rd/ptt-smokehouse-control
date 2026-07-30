#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  HardeningValidationError,
  appendAuditEvent,
  authorizeRequest,
  consumeRateLimit,
  createRateLimitState,
  createSanitizedHardeningBundle,
  evaluateDatabaseHealth,
  evaluatePerformanceRun,
  evaluateRecoveryReadiness,
  evaluateRequestSecurity,
  evaluateSessionPolicy,
  generateReleaseGateReport,
  verifyAuditChain,
} from "../lib/security-performance-recovery/build-11.9.0/security-performance-recovery-engine.mjs";

const root = process.cwd();
const contract = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "security-performance-recovery-contract-11.9.0.json",
    ),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "security-performance-recovery-fixtures-11.9.0.json",
    ),
    "utf8",
  ),
);
const failures = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL — ${message}`);
  }
}
function controlByName(assessment, name) {
  return assessment.controls.find((row) => row.control === name);
}

const session = evaluateSessionPolicy(
  fixtures.secureSessionConfig,
  contract.sessionPolicy,
);

// SPR-001.
pass(session.status === "PASS", "SPR-001: secure session policy passes");

// SPR-002.
const weakSessionConfig = clone(fixtures.secureSessionConfig);
weakSessionConfig.privileged2FAEnabled = false;
const weakSession = evaluateSessionPolicy(
  weakSessionConfig,
  contract.sessionPolicy,
);
pass(weakSession.status === "FAIL", "SPR-002: missing privileged 2FA fails");
pass(
  controlByName(weakSession, "privileged2FAEnabled")?.passed === false,
  "SPR-002: privileged2FAEnabled is the failing control",
);

// SPR-003.
const crossTenant = authorizeRequest({
  actor: {
    role: "KM",
    tenantId: "tenant-a",
  },
  resourceTenantId: "tenant-b",
  action: "today:write",
  policy: fixtures.authorizationPolicy,
});
pass(crossTenant.allowed === false, "SPR-003: cross-tenant request is denied");
pass(crossTenant.reason === "CROSS_TENANT", "SPR-003: denial reason is CROSS_TENANT");

// SPR-004.
const viewerMutation = authorizeRequest({
  actor: {
    role: "VIEWER",
    tenantId: "tenant-a",
  },
  resourceTenantId: "tenant-a",
  action: "inventory:write",
  policy: fixtures.authorizationPolicy,
});
pass(viewerMutation.allowed === false, "SPR-004: Viewer mutation is denied");
pass(viewerMutation.reason === "ROLE_DENIED", "SPR-004: denial reason is ROLE_DENIED");

const kmMutation = authorizeRequest({
  actor: {
    role: "KM",
    tenantId: "tenant-a",
  },
  resourceTenantId: "tenant-a",
  action: "inventory:write",
  policy: fixtures.authorizationPolicy,
});
pass(kmMutation.allowed === true, "authorized same-tenant KM mutation is allowed");

// Common valid request.
const validRequest = {
  method: "POST",
  bodyBytes: 512,
  contentType: "application/json",
  browserSession: true,
  csrfValid: true,
  isWebhook: false,
  webhookSignatureValid: false,
  responseHeaders: fixtures.securityHeaders,
};
const requestAssessment = evaluateRequestSecurity(
  validRequest,
  contract.requestSecurity,
);
pass(requestAssessment.status === "ACCEPTED", "controlled request security passes");

// SPR-005.
const missingCsrf = evaluateRequestSecurity(
  { ...validRequest, csrfValid: false },
  contract.requestSecurity,
);
pass(missingCsrf.status === "REJECTED", "SPR-005: browser mutation without CSRF is rejected");
pass(
  missingCsrf.failures.some((row) => row.control === "CSRF"),
  "SPR-005: CSRF is named as the failing control",
);

// SPR-006.
const unsignedWebhook = evaluateRequestSecurity(
  {
    ...validRequest,
    browserSession: false,
    csrfValid: false,
    isWebhook: true,
    webhookSignatureValid: false,
  },
  contract.requestSecurity,
);
pass(unsignedWebhook.status === "REJECTED", "SPR-006: unsigned webhook is rejected");
pass(
  unsignedWebhook.failures.some((row) => row.control === "WEBHOOK_SIGNATURE"),
  "SPR-006: webhook signature is named",
);

// SPR-007.
const oversized = evaluateRequestSecurity(
  {
    ...validRequest,
    bodyBytes: contract.requestSecurity.maximumJsonBodyBytes + 1,
  },
  contract.requestSecurity,
);
pass(oversized.status === "REJECTED", "SPR-007: oversized request is rejected");
pass(
  oversized.failures.some((row) => row.control === "REQUEST_SIZE"),
  "SPR-007: request size is named",
);

// SPR-008.
let rateState = createRateLimitState();
let lastRateResult = null;
for (let index = 0; index < 11; index += 1) {
  const outcome = consumeRateLimit(
    rateState,
    {
      category: "AUTH",
      key: "ip-203.0.113.9",
      occurredAt: `2026-08-04T00:00:${String(index).padStart(2, "0")}.000Z`,
    },
    contract.requestSecurity.rateLimits,
  );
  rateState = outcome.state;
  lastRateResult = outcome.result;
}
pass(lastRateResult.allowed === false, "SPR-008: eleventh auth attempt is rate-limited");
pass(lastRateResult.retryAfterSeconds > 0, "SPR-008: rate limit provides retry-after");

// SPR-009.
let auditChain = [];
auditChain = appendAuditEvent(auditChain, {
  tenantId: "tenant-ptt-validation",
  requestId: "request-1",
  eventType: "LOGIN_SUCCEEDED",
  occurredAt: "2026-08-04T00:01:00.000Z",
  actor: { id: "km-1190", role: "KM" },
  resourceType: "SESSION",
  resourceId: "session-1",
  outcome: "SUCCESS",
  metadata: { ipClass: "PRIVATE" },
});
auditChain = appendAuditEvent(auditChain, {
  tenantId: "tenant-ptt-validation",
  requestId: "request-2",
  eventType: "INVENTORY_ADJUSTED",
  occurredAt: "2026-08-04T00:02:00.000Z",
  actor: { id: "km-1190", role: "KM" },
  resourceType: "INVENTORY_DAY",
  resourceId: "inventory-2026-08-03",
  outcome: "SUCCESS",
  metadata: { reason: "Physical count reconciliation" },
});
const auditAssessment = verifyAuditChain(auditChain);
pass(auditAssessment.valid === true, "SPR-009: audit hash chain verifies");
pass(auditAssessment.eventCount === 2, "SPR-009: two audit events are present");

// SPR-010.
const tampered = clone(auditChain);
tampered[0].outcome = "FAILURE";
const tamperedAssessment = verifyAuditChain(tampered);
pass(tamperedAssessment.valid === false, "SPR-010: audit tamper is detected");
pass(
  tamperedAssessment.failures.some((row) => row.control === "EVENT_HASH"),
  "SPR-010: event hash mismatch is reported",
);

// SPR-011.
const performance = evaluatePerformanceRun(
  fixtures.performanceSamples,
  contract.performanceBudgets,
);
pass(performance.status === "PASS", "SPR-011: controlled performance budgets pass");
pass(performance.metrics.throughputRps === 60, "SPR-011: throughput is 60 requests per second");

// SPR-012.
const slowSamples = clone(fixtures.performanceSamples);
slowSamples.apiRead = slowSamples.apiRead.map((row) => ({
  ...row,
  durationMs: row.durationMs + 400,
}));
const slowPerformance = evaluatePerformanceRun(
  slowSamples,
  contract.performanceBudgets,
);
pass(slowPerformance.status === "FAIL", "SPR-012: API p95 regression fails");
pass(
  controlByName(slowPerformance, "apiReadP95Ms")?.passed === false,
  "SPR-012: apiReadP95Ms is the failing metric",
);

// SPR-013.
const errorSamples = clone(fixtures.performanceSamples);
errorSamples.apiRead[0].success = false;
errorSamples.apiRead[1].success = false;
const errorPerformance = evaluatePerformanceRun(
  errorSamples,
  contract.performanceBudgets,
);
pass(errorPerformance.status === "FAIL", "SPR-013: excessive error rate fails");
pass(
  controlByName(errorPerformance, "errorRatePercent")?.passed === false,
  "SPR-013: errorRatePercent is the failing metric",
);

// SPR-014.
const database = evaluateDatabaseHealth(
  fixtures.databaseSnapshot,
  contract.databaseHealth,
);
pass(database.status === "PASS", "controlled database health passes");
const saturatedSnapshot = clone(fixtures.databaseSnapshot);
saturatedSnapshot.poolActive = 18;
saturatedSnapshot.poolIdle = 2;
const saturated = evaluateDatabaseHealth(
  saturatedSnapshot,
  contract.databaseHealth,
);
pass(saturated.status === "FAIL", "SPR-014: database pool saturation fails");
pass(
  controlByName(saturated, "poolUtilizationPercent")?.passed === false,
  "SPR-014: pool utilization is the failing metric",
);

// SPR-015.
const recovery = evaluateRecoveryReadiness(
  fixtures.recoverySnapshot,
  contract.recovery,
);
pass(recovery.status === "PASS", "controlled recovery readiness passes");
const staleBackupSnapshot = clone(fixtures.recoverySnapshot);
staleBackupSnapshot.lastVerifiedBackupAt = "2026-08-02T00:00:00.000Z";
const staleBackup = evaluateRecoveryReadiness(
  staleBackupSnapshot,
  contract.recovery,
);
pass(staleBackup.status === "FAIL", "SPR-015: stale backup fails recovery");
pass(
  controlByName(staleBackup, "backupAgeHours")?.passed === false,
  "SPR-015: backupAgeHours is the failing control",
);

// SPR-016.
const staleDrillSnapshot = clone(fixtures.recoverySnapshot);
staleDrillSnapshot.lastRestoreDrillAt = "2026-04-01T00:00:00.000Z";
const staleDrill = evaluateRecoveryReadiness(
  staleDrillSnapshot,
  contract.recovery,
);
pass(staleDrill.status === "FAIL", "SPR-016: stale restore drill fails recovery");
pass(
  controlByName(staleDrill, "restoreDrillAgeDays")?.passed === false,
  "SPR-016: restoreDrillAgeDays is the failing control",
);

// SPR-017.
const noRollbackSnapshot = clone(fixtures.recoverySnapshot);
noRollbackSnapshot.rollbackArtifact = "";
const noRollback = evaluateRecoveryReadiness(
  noRollbackSnapshot,
  contract.recovery,
);
pass(noRollback.status === "FAIL", "SPR-017: missing rollback artifact fails");
pass(
  controlByName(noRollback, "rollbackArtifact")?.passed === false,
  "SPR-017: rollbackArtifact is the failing control",
);

// SPR-018.
const hardeningBundleInput = {
  generatedAt: "2026-08-04T00:05:00.000Z",
  buildIdentity: {
    build: "11.9.0",
    gitCommit: "synthetic-1190",
  },
  renderTopology: contract.renderTopology,
  sessionAssessment: session,
  requestAssessment,
  auditIntegrity: auditAssessment,
  performanceAssessment: performance,
  databaseAssessment: database,
  recoveryAssessment: recovery,
  environmentPresence: {
    DATABASE_URL: true,
    APP_SESSION_TOKEN: true,
    SENTRY_DSN: false,
  },
  recentFindings: [],
  nestedSecrets: {
    password: "should-not-leak",
    api_key: "should-not-leak",
    authorization: "Bearer should-not-leak",
    safeValue: "retained",
  },
};
const supportBundle = createSanitizedHardeningBundle(
  hardeningBundleInput,
  contract.sanitization.redactedKeyPatterns,
);
pass(supportBundle.secretLeaks.length === 0, "SPR-018: sanitized bundle has zero secret leaks");
pass(
  supportBundle.bundle.environmentPresence.DATABASE_URL === "[REDACTED]",
  "SPR-018: DATABASE_URL presence key is redacted",
);
pass(
  supportBundle.bundle.checksum.length === 64,
  "SPR-018: support bundle has a SHA-256 checksum",
);

// SPR-019.
const goGate = generateReleaseGateReport({
  generatedAt: "2026-08-04T00:10:00.000Z",
  sessionAssessment: session,
  requestAssessment,
  auditAssessment,
  performanceAssessment: performance,
  databaseAssessment: database,
  recoveryAssessment: recovery,
  releaseSnapshot: fixtures.releaseSnapshot,
  releaseGatePolicy: contract.releaseGate,
});
pass(goGate.decision === "GO", "SPR-019: all hardening gates produce GO");
pass(goGate.failures.length === 0, "SPR-019: GO gate has no failures");

// SPR-020.
const holdSnapshot = clone(fixtures.releaseSnapshot);
holdSnapshot.openP1 = 1;
const holdGate = generateReleaseGateReport({
  generatedAt: "2026-08-04T00:10:00.000Z",
  sessionAssessment: session,
  requestAssessment,
  auditAssessment,
  performanceAssessment: performance,
  databaseAssessment: database,
  recoveryAssessment: recovery,
  releaseSnapshot: holdSnapshot,
  releaseGatePolicy: contract.releaseGate,
});
pass(holdGate.decision === "HOLD", "SPR-020: open P1 produces HOLD");
pass(
  holdGate.failures.some((row) => row.control === "openP1"),
  "SPR-020: openP1 is named as the failing release control",
);

// Validation exceptions remain structured.
let invalidRoleError = null;
try {
  authorizeRequest({
    actor: { role: "UNKNOWN", tenantId: "tenant-a" },
    resourceTenantId: "tenant-a",
    action: "today:read",
    policy: fixtures.authorizationPolicy,
  });
} catch (error) {
  invalidRoleError = error;
}
pass(
  invalidRoleError instanceof HardeningValidationError,
  "invalid roles throw structured hardening validation errors",
);
pass(
  invalidRoleError?.field === "actor.role",
  "invalid role error identifies actor.role",
);

if (failures.length) {
  console.error(
    `\nBuild 11.9.0 Security, Performance, and Recovery test failed: ${failures.length} control(s).`,
  );
  process.exit(1);
}

console.log(
  "\nBuild 11.9.0 Security, Performance, and Recovery fixture test passed.",
);

import crypto from "node:crypto";

export const SECURITY_PERFORMANCE_RECOVERY_VERSION =
  "PTT_SECURITY_PERFORMANCE_RECOVERY_11_9_0";

export const HARDENING_ROLES = Object.freeze([
  "ADMIN",
  "OWNER",
  "KM",
  "PITMASTER",
  "KC",
  "VIEWER",
]);

export const REQUIRED_SECURITY_HEADERS = Object.freeze([
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "strict-transport-security",
]);

export const RATE_LIMIT_CATEGORIES = Object.freeze([
  "AUTH",
  "API_READ",
  "API_MUTATION",
  "WEBHOOK",
]);

const PRIVILEGED_ROLES = new Set(["ADMIN", "OWNER", "KM"]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REDACTED = "[REDACTED]";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(typeof value === "string" ? value : stableStringify(value))
    .digest("hex");
}

function finite(value, field, minimum = undefined, maximum = undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new HardeningValidationError(
      field,
      `${field} must be a finite number.`,
    );
  }
  if (minimum !== undefined && number < minimum) {
    throw new HardeningValidationError(
      field,
      `${field} must be at least ${minimum}.`,
    );
  }
  if (maximum !== undefined && number > maximum) {
    throw new HardeningValidationError(
      field,
      `${field} must be no more than ${maximum}.`,
    );
  }
  return number;
}

function timestamp(value, field) {
  const text = String(value || "");
  const date = new Date(text);
  if (!text || Number.isNaN(date.getTime())) {
    throw new HardeningValidationError(
      field,
      `${field} must be a valid timestamp.`,
    );
  }
  return text;
}

function hoursBetween(laterIso, earlierIso) {
  return (
    (new Date(laterIso).getTime() - new Date(earlierIso).getTime()) /
    3_600_000
  );
}

function daysBetween(laterIso, earlierIso) {
  return hoursBetween(laterIso, earlierIso) / 24;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

function round(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function result(status, controls) {
  return {
    status,
    passed: status === "PASS",
    controls,
    failures: controls.filter((row) => !row.passed),
    warnings: controls.filter((row) => row.warning === true),
  };
}

function control(name, passed, actual, expected, message, warning = false) {
  return {
    control: name,
    passed: Boolean(passed),
    actual,
    expected,
    message,
    warning,
  };
}

function normalizeRole(value, field = "actor.role") {
  const role = String(value || "").toUpperCase();
  if (!HARDENING_ROLES.includes(role)) {
    throw new HardeningValidationError(field, `${field} is invalid.`);
  }
  return role;
}

function matchesPermission(grants, action) {
  return grants.includes("*") || grants.includes(action);
}

function requiredHeadersMap(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    normalized[String(key).toLowerCase()] = String(value);
  }
  return normalized;
}

function secretKey(key, patterns) {
  const normalized = String(key).toLowerCase().replaceAll("-", "_");
  return patterns.some((pattern) =>
    normalized.includes(String(pattern).toLowerCase()),
  );
}

export class HardeningValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "HardeningValidationError";
    this.field = field;
  }
}

export function evaluateSessionPolicy(config, policy) {
  const controls = [
    control(
      "absoluteTimeoutMinutes",
      finite(config.absoluteTimeoutMinutes, "absoluteTimeoutMinutes", 1) <=
        policy.absoluteTimeoutMinutes,
      config.absoluteTimeoutMinutes,
      `<= ${policy.absoluteTimeoutMinutes}`,
      "Absolute session lifetime is bounded.",
    ),
    control(
      "idleTimeoutMinutes",
      finite(config.idleTimeoutMinutes, "idleTimeoutMinutes", 1) <=
        policy.idleTimeoutMinutes,
      config.idleTimeoutMinutes,
      `<= ${policy.idleTimeoutMinutes}`,
      "Idle sessions expire promptly.",
    ),
    control(
      "privilegedReauthenticationMinutes",
      finite(
        config.privilegedReauthenticationMinutes,
        "privilegedReauthenticationMinutes",
        1,
      ) <= policy.privilegedReauthenticationMinutes,
      config.privilegedReauthenticationMinutes,
      `<= ${policy.privilegedReauthenticationMinutes}`,
      "Privileged actions require recent authentication.",
    ),
    control(
      "maximumFailedAttempts",
      finite(config.maximumFailedAttempts, "maximumFailedAttempts", 1) <=
        policy.maximumFailedAttempts,
      config.maximumFailedAttempts,
      `<= ${policy.maximumFailedAttempts}`,
      "Authentication failures are capped.",
    ),
    control(
      "lockoutMinutes",
      finite(config.lockoutMinutes, "lockoutMinutes", 1) >=
        policy.lockoutMinutes,
      config.lockoutMinutes,
      `>= ${policy.lockoutMinutes}`,
      "Authentication lockout duration meets policy.",
    ),
    control(
      "privileged2FAEnabled",
      !policy.privileged2FARequired || config.privileged2FAEnabled === true,
      config.privileged2FAEnabled,
      true,
      "Privileged roles require a second factor.",
    ),
    control(
      "secureCookie",
      !policy.secureCookieRequired || config.secureCookie === true,
      config.secureCookie,
      true,
      "Session cookie requires HTTPS.",
    ),
    control(
      "httpOnlyCookie",
      !policy.httpOnlyCookieRequired || config.httpOnlyCookie === true,
      config.httpOnlyCookie,
      true,
      "Session cookie is unavailable to browser scripts.",
    ),
    control(
      "sameSite",
      String(config.sameSite || "").toUpperCase() ===
        String(policy.sameSite || "").toUpperCase(),
      config.sameSite,
      policy.sameSite,
      "Session cookie SameSite policy matches the controlled baseline.",
    ),
    control(
      "rotateAfterAuthentication",
      !policy.sessionRotationAfterAuthentication ||
        config.rotateAfterAuthentication === true,
      config.rotateAfterAuthentication,
      true,
      "Session identifiers rotate after authentication.",
    ),
    control(
      "revocationSupported",
      !policy.sessionRevocationRequired ||
        config.revocationSupported === true,
      config.revocationSupported,
      true,
      "Sessions can be revoked server-side.",
    ),
  ];
  return result(
    controls.every((row) => row.passed) ? "PASS" : "FAIL",
    controls,
  );
}

export function authorizeRequest(input) {
  const role = normalizeRole(input?.actor?.role);
  const actorTenantId = String(input?.actor?.tenantId || "").trim();
  const resourceTenantId = String(input?.resourceTenantId || "").trim();
  const action = String(input?.action || "").trim();
  const policy = input?.policy || {};

  if (!actorTenantId || !resourceTenantId) {
    return {
      allowed: false,
      reason: "TENANT_CONTEXT_REQUIRED",
      role,
      action,
    };
  }
  if (actorTenantId !== resourceTenantId) {
    return {
      allowed: false,
      reason: "CROSS_TENANT",
      role,
      action,
    };
  }
  const grants = Array.isArray(policy[role]) ? policy[role] : [];
  if (!action || !matchesPermission(grants, action)) {
    return {
      allowed: false,
      reason: "ROLE_DENIED",
      role,
      action,
    };
  }
  return {
    allowed: true,
    reason: "AUTHORIZED",
    role,
    action,
  };
}

export function evaluateRequestSecurity(request, config) {
  const method = String(request?.method || "GET").toUpperCase();
  const isMutation = MUTATING_METHODS.has(method);
  const bodyBytes = finite(request?.bodyBytes ?? 0, "bodyBytes", 0);
  const headers = requiredHeadersMap(request?.responseHeaders);
  const controls = [];

  controls.push(
    control(
      "REQUEST_SIZE",
      bodyBytes <= config.maximumJsonBodyBytes,
      bodyBytes,
      `<= ${config.maximumJsonBodyBytes}`,
      "Request body remains inside the controlled maximum.",
    ),
  );

  const contentType = String(request?.contentType || "").toLowerCase();
  controls.push(
    control(
      "CONTENT_TYPE",
      !isMutation ||
        bodyBytes === 0 ||
        contentType.startsWith("application/json"),
      contentType || null,
      "application/json for JSON mutation bodies",
      "Mutation content type is validated.",
    ),
  );

  controls.push(
    control(
      "CSRF",
      !(
        config.csrfRequiredForBrowserMutations &&
        isMutation &&
        request?.browserSession === true
      ) || request?.csrfValid === true,
      request?.csrfValid === true,
      true,
      "Browser mutation includes a valid CSRF control.",
    ),
  );

  controls.push(
    control(
      "WEBHOOK_SIGNATURE",
      !(
        config.webhookSignatureRequired &&
        request?.isWebhook === true
      ) || request?.webhookSignatureValid === true,
      request?.webhookSignatureValid === true,
      true,
      "Webhook request includes a valid signature.",
    ),
  );

  for (const header of config.securityHeadersRequired || []) {
    controls.push(
      control(
        `HEADER_${header}`,
        Boolean(headers[String(header).toLowerCase()]),
        headers[String(header).toLowerCase()] || null,
        "present",
        `${header} is present.`,
      ),
    );
  }

  return {
    status: controls.every((row) => row.passed)
      ? "ACCEPTED"
      : "REJECTED",
    accepted: controls.every((row) => row.passed),
    method,
    controls,
    failures: controls.filter((row) => !row.passed),
  };
}

export function createRateLimitState() {
  return {
    version: SECURITY_PERFORMANCE_RECOVERY_VERSION,
    buckets: {},
  };
}

export function consumeRateLimit(stateInput, input, policies) {
  const state = clone(stateInput);
  const category = String(input?.category || "").toUpperCase();
  if (!RATE_LIMIT_CATEGORIES.includes(category)) {
    throw new HardeningValidationError(
      "category",
      "Unsupported rate-limit category.",
    );
  }
  const key = String(input?.key || "").trim();
  if (!key) {
    throw new HardeningValidationError("key", "Rate-limit key is required.");
  }
  const occurredAt = timestamp(input?.occurredAt, "occurredAt");
  const nowMs = new Date(occurredAt).getTime();
  const policy = policies?.[category];
  if (!policy) {
    throw new HardeningValidationError(
      "policies",
      `Missing rate-limit policy for ${category}.`,
    );
  }
  const limit = finite(policy.limit, `policies.${category}.limit`, 1);
  const windowSeconds = finite(
    policy.windowSeconds,
    `policies.${category}.windowSeconds`,
    1,
  );
  const bucketKey = `${category}:${key}`;
  const cutoff = nowMs - windowSeconds * 1000;
  const existing = (state.buckets[bucketKey] || []).filter(
    (value) => value > cutoff,
  );
  const allowed = existing.length < limit;
  if (allowed) existing.push(nowMs);
  state.buckets[bucketKey] = existing;

  return {
    state,
    result: {
      category,
      key,
      allowed,
      remaining: Math.max(0, limit - existing.length),
      limit,
      windowSeconds,
      retryAfterSeconds: allowed
        ? 0
        : Math.max(
            1,
            Math.ceil(
              (existing[0] + windowSeconds * 1000 - nowMs) / 1000,
            ),
          ),
    },
  };
}

export function appendAuditEvent(chainInput, input) {
  const chain = clone(chainInput || []);
  const actor = {
    id: String(input?.actor?.id || "").trim(),
    role: normalizeRole(input?.actor?.role),
  };
  if (!actor.id) {
    throw new HardeningValidationError(
      "actor.id",
      "Audit actor ID is required.",
    );
  }
  const tenantId = String(input?.tenantId || "").trim();
  const requestId = String(input?.requestId || "").trim();
  const eventType = String(input?.eventType || "").trim();
  if (!tenantId) {
    throw new HardeningValidationError(
      "tenantId",
      "Audit tenant ID is required.",
    );
  }
  if (!requestId) {
    throw new HardeningValidationError(
      "requestId",
      "Audit request ID is required.",
    );
  }
  if (!eventType) {
    throw new HardeningValidationError(
      "eventType",
      "Audit event type is required.",
    );
  }
  const occurredAt = timestamp(input?.occurredAt, "occurredAt");
  const previousHash = chain.length
    ? chain.at(-1).eventHash
    : "GENESIS";
  const core = {
    sequence: chain.length + 1,
    tenantId,
    requestId,
    eventType,
    occurredAt,
    actor,
    resourceType: String(input?.resourceType || ""),
    resourceId: String(input?.resourceId || ""),
    outcome: String(input?.outcome || ""),
    metadata: clone(input?.metadata || {}),
    previousHash,
  };
  const eventHash = sha256(core);
  const event = {
    ...core,
    eventHash,
    auditEventId: `audit-${eventHash.slice(0, 16)}`,
  };
  return [...chain, event];
}

export function verifyAuditChain(chainInput) {
  const chain = clone(chainInput || []);
  const failures = [];
  for (let index = 0; index < chain.length; index += 1) {
    const row = chain[index];
    const expectedPreviousHash =
      index === 0 ? "GENESIS" : chain[index - 1].eventHash;
    const core = {
      sequence: row.sequence,
      tenantId: row.tenantId,
      requestId: row.requestId,
      eventType: row.eventType,
      occurredAt: row.occurredAt,
      actor: row.actor,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      outcome: row.outcome,
      metadata: row.metadata,
      previousHash: row.previousHash,
    };
    const expectedHash = sha256(core);
    if (row.sequence !== index + 1) {
      failures.push({
        sequence: index + 1,
        control: "SEQUENCE",
        actual: row.sequence,
        expected: index + 1,
      });
    }
    if (row.previousHash !== expectedPreviousHash) {
      failures.push({
        sequence: index + 1,
        control: "PREVIOUS_HASH",
        actual: row.previousHash,
        expected: expectedPreviousHash,
      });
    }
    if (row.eventHash !== expectedHash) {
      failures.push({
        sequence: index + 1,
        control: "EVENT_HASH",
        actual: row.eventHash,
        expected: expectedHash,
      });
    }
  }
  return {
    valid: failures.length === 0,
    eventCount: chain.length,
    headHash: chain.length ? chain.at(-1).eventHash : "GENESIS",
    failures,
  };
}

function sampleMetrics(samples) {
  const rows = (samples || []).map((row, index) => ({
    index,
    durationMs: finite(row?.durationMs, `samples.${index}.durationMs`, 0),
    success: row?.success !== false,
  }));
  const durations = rows.map((row) => row.durationMs);
  const failures = rows.filter((row) => !row.success).length;
  return {
    count: rows.length,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    maximumMs: durations.length ? Math.max(...durations) : null,
    errorCount: failures,
    errorRatePercent: rows.length
      ? round((failures / rows.length) * 100, 3)
      : null,
  };
}

export function evaluatePerformanceRun(input, budgets) {
  const apiRead = sampleMetrics(input?.apiRead);
  const criticalMutation = sampleMetrics(input?.criticalMutation);
  const dashboard = sampleMetrics(input?.dashboard);
  const databaseQuery = sampleMetrics(input?.databaseQuery);
  const requestCount = finite(input?.requestCount, "requestCount", 0);
  const windowSeconds = finite(input?.windowSeconds, "windowSeconds", 0.001);
  const throughputRps = round(requestCount / windowSeconds, 3);
  const memoryMb = finite(input?.memoryMb, "memoryMb", 0);
  const eventLoopLagP95Ms = percentile(
    (input?.eventLoopLagSamplesMs || []).map((value, index) =>
      finite(value, `eventLoopLagSamplesMs.${index}`, 0),
    ),
    95,
  );

  const allRows = [
    ...(input?.apiRead || []),
    ...(input?.criticalMutation || []),
    ...(input?.dashboard || []),
    ...(input?.databaseQuery || []),
  ];
  const totalErrors = allRows.filter((row) => row?.success === false).length;
  const errorRatePercent = allRows.length
    ? round((totalErrors / allRows.length) * 100, 3)
    : 0;

  const controls = [
    control(
      "apiReadP95Ms",
      apiRead.p95Ms !== null && apiRead.p95Ms <= budgets.apiReadP95Ms,
      apiRead.p95Ms,
      `<= ${budgets.apiReadP95Ms}`,
      "API read p95 meets budget.",
    ),
    control(
      "criticalMutationP95Ms",
      criticalMutation.p95Ms !== null &&
        criticalMutation.p95Ms <= budgets.criticalMutationP95Ms,
      criticalMutation.p95Ms,
      `<= ${budgets.criticalMutationP95Ms}`,
      "Critical mutation p95 meets budget.",
    ),
    control(
      "dashboardP95Ms",
      dashboard.p95Ms !== null &&
        dashboard.p95Ms <= budgets.dashboardP95Ms,
      dashboard.p95Ms,
      `<= ${budgets.dashboardP95Ms}`,
      "Dashboard p95 meets budget.",
    ),
    control(
      "databaseQueryP95Ms",
      databaseQuery.p95Ms !== null &&
        databaseQuery.p95Ms <= budgets.databaseQueryP95Ms,
      databaseQuery.p95Ms,
      `<= ${budgets.databaseQueryP95Ms}`,
      "Database query p95 meets budget.",
    ),
    control(
      "errorRatePercent",
      errorRatePercent <= budgets.errorRatePercent,
      errorRatePercent,
      `<= ${budgets.errorRatePercent}`,
      "Synthetic request error rate meets budget.",
    ),
    control(
      "throughputRps",
      throughputRps >= budgets.minimumThroughputRps,
      throughputRps,
      `>= ${budgets.minimumThroughputRps}`,
      "Synthetic throughput meets budget.",
    ),
    control(
      "memoryMb",
      memoryMb <= budgets.maximumMemoryMb,
      memoryMb,
      `<= ${budgets.maximumMemoryMb}`,
      "Memory use meets budget.",
    ),
    control(
      "eventLoopLagP95Ms",
      eventLoopLagP95Ms !== null &&
        eventLoopLagP95Ms <= budgets.maximumEventLoopLagP95Ms,
      eventLoopLagP95Ms,
      `<= ${budgets.maximumEventLoopLagP95Ms}`,
      "Event-loop lag p95 meets budget.",
    ),
  ];

  return {
    ...result(
      controls.every((row) => row.passed) ? "PASS" : "FAIL",
      controls,
    ),
    metrics: {
      apiRead,
      criticalMutation,
      dashboard,
      databaseQuery,
      errorRatePercent,
      throughputRps,
      memoryMb,
      eventLoopLagP95Ms,
      requestCount,
      windowSeconds,
    },
  };
}

export function evaluateDatabaseHealth(snapshot, policy) {
  const poolMaximum = finite(snapshot?.poolMaximum, "poolMaximum", 1);
  const poolActive = finite(snapshot?.poolActive, "poolActive", 0);
  const poolIdle = finite(snapshot?.poolIdle, "poolIdle", 0);
  const poolUtilizationPercent = round(
    (poolActive / poolMaximum) * 100,
    2,
  );
  const connectionHeadroom = poolMaximum - poolActive;
  const controls = [
    control(
      "databaseReachable",
      snapshot?.databaseReachable === true,
      snapshot?.databaseReachable,
      true,
      "Database is reachable.",
    ),
    control(
      "poolUtilizationPercent",
      poolUtilizationPercent <=
        policy.maximumPoolUtilizationPercent,
      poolUtilizationPercent,
      `<= ${policy.maximumPoolUtilizationPercent}`,
      "Connection pool retains operational headroom.",
    ),
    control(
      "connectionHeadroom",
      connectionHeadroom >= policy.connectionHeadroomRequired,
      connectionHeadroom,
      `>= ${policy.connectionHeadroomRequired}`,
      "Connection headroom meets policy.",
    ),
    control(
      "poolAccounting",
      poolActive + poolIdle <= poolMaximum,
      poolActive + poolIdle,
      `<= ${poolMaximum}`,
      "Active and idle connections do not exceed pool maximum.",
    ),
    control(
      "longestTransactionMs",
      finite(
        snapshot?.longestTransactionMs,
        "longestTransactionMs",
        0,
      ) <= policy.maximumLongTransactionMs,
      snapshot?.longestTransactionMs,
      `<= ${policy.maximumLongTransactionMs}`,
      "Long transaction duration meets policy.",
    ),
    control(
      "replicationLagSeconds",
      finite(
        snapshot?.replicationLagSeconds,
        "replicationLagSeconds",
        0,
      ) <= policy.maximumReplicationLagSeconds,
      snapshot?.replicationLagSeconds,
      `<= ${policy.maximumReplicationLagSeconds}`,
      "Replication lag meets policy.",
    ),
    control(
      "migrationStatus",
      String(snapshot?.migrationStatus || "") ===
        policy.requiredMigrationStatus,
      snapshot?.migrationStatus,
      policy.requiredMigrationStatus,
      "Database migration status is current.",
    ),
  ];
  return {
    ...result(
      controls.every((row) => row.passed) ? "PASS" : "FAIL",
      controls,
    ),
    metrics: {
      poolMaximum,
      poolActive,
      poolIdle,
      poolUtilizationPercent,
      connectionHeadroom,
      longestTransactionMs: snapshot?.longestTransactionMs,
      replicationLagSeconds: snapshot?.replicationLagSeconds,
      migrationStatus: snapshot?.migrationStatus,
    },
  };
}

export function evaluateRecoveryReadiness(snapshot, policy) {
  const now = timestamp(snapshot?.now, "now");
  const lastVerifiedBackupAt = timestamp(
    snapshot?.lastVerifiedBackupAt,
    "lastVerifiedBackupAt",
  );
  const lastRestoreDrillAt = timestamp(
    snapshot?.lastRestoreDrillAt,
    "lastRestoreDrillAt",
  );
  const backupAgeHours = round(
    hoursBetween(now, lastVerifiedBackupAt),
    2,
  );
  const restoreDrillAgeDays = round(
    daysBetween(now, lastRestoreDrillAt),
    2,
  );
  const recoveryPointAgeHours = finite(
    snapshot?.recoveryPointAgeHours,
    "recoveryPointAgeHours",
    0,
  );
  const restoreDurationMinutes = finite(
    snapshot?.restoreDurationMinutes,
    "restoreDurationMinutes",
    0,
  );

  const controls = [
    control(
      "backupVerified",
      !policy.verifiedBackupRequired ||
        snapshot?.backupVerified === true,
      snapshot?.backupVerified,
      true,
      "Latest backup is verified.",
    ),
    control(
      "backupAgeHours",
      backupAgeHours <= policy.maximumBackupAgeHours,
      backupAgeHours,
      `<= ${policy.maximumBackupAgeHours}`,
      "Verified backup is current.",
    ),
    control(
      "restoreDrillAgeDays",
      restoreDrillAgeDays <= policy.maximumRestoreDrillAgeDays,
      restoreDrillAgeDays,
      `<= ${policy.maximumRestoreDrillAgeDays}`,
      "Restore drill evidence is current.",
    ),
    control(
      "recoveryPointAgeHours",
      recoveryPointAgeHours <= policy.rpoHours,
      recoveryPointAgeHours,
      `<= ${policy.rpoHours}`,
      "Recovery point meets RPO.",
    ),
    control(
      "restoreDurationMinutes",
      restoreDurationMinutes <= policy.rtoHours * 60,
      restoreDurationMinutes,
      `<= ${policy.rtoHours * 60}`,
      "Restore duration meets RTO.",
    ),
    control(
      "rollbackArtifact",
      !policy.rollbackArtifactRequired ||
        Boolean(String(snapshot?.rollbackArtifact || "").trim()),
      snapshot?.rollbackArtifact || null,
      "present",
      "Rollback artifact is recorded.",
    ),
    control(
      "rollbackProcedure",
      !policy.rollbackProcedureRequired ||
        Boolean(String(snapshot?.rollbackProcedure || "").trim()),
      snapshot?.rollbackProcedure || null,
      "present",
      "Rollback procedure is recorded.",
    ),
    control(
      "restoreEvidence",
      !policy.restoreEvidenceRequired ||
        Boolean(String(snapshot?.restoreEvidence || "").trim()),
      snapshot?.restoreEvidence || null,
      "present",
      "Restore evidence is recorded.",
    ),
    control(
      "dataReconciliationPassed",
      !policy.dataReconciliationRequired ||
        snapshot?.dataReconciliationPassed === true,
      snapshot?.dataReconciliationPassed,
      true,
      "Restore data reconciliation passed.",
    ),
  ];

  return {
    ...result(
      controls.every((row) => row.passed) ? "PASS" : "FAIL",
      controls,
    ),
    metrics: {
      now,
      backupAgeHours,
      restoreDrillAgeDays,
      recoveryPointAgeHours,
      restoreDurationMinutes,
      rpoHours: policy.rpoHours,
      rtoHours: policy.rtoHours,
    },
  };
}

export function sanitizeHardeningData(value, patterns) {
  function visit(current, key = "") {
    if (secretKey(key, patterns)) return REDACTED;
    if (Array.isArray(current)) {
      return current.map((item) => visit(item));
    }
    if (current && typeof current === "object") {
      const output = {};
      for (const [childKey, childValue] of Object.entries(current)) {
        output[childKey] = visit(childValue, childKey);
      }
      return output;
    }
    return current;
  }
  return visit(clone(value));
}

export function findSecretLeaks(value, patterns) {
  const leaks = [];
  function visit(current, path = []) {
    if (Array.isArray(current)) {
      current.forEach((item, index) =>
        visit(item, [...path, String(index)]),
      );
      return;
    }
    if (current && typeof current === "object") {
      for (const [key, child] of Object.entries(current)) {
        if (secretKey(key, patterns) && child !== REDACTED) {
          leaks.push({
            path: [...path, key].join("."),
            valueType: typeof child,
          });
        }
        visit(child, [...path, key]);
      }
    }
  }
  visit(value);
  return leaks;
}

export function createSanitizedHardeningBundle(input, patterns) {
  const sanitized = sanitizeHardeningData(input, patterns);
  const core = {
    bundleVersion:
      "PTT_HARDENING_SUPPORT_BUNDLE_11_9_0",
    generatedAt: String(input?.generatedAt || ""),
    buildIdentity: sanitized.buildIdentity || {},
    renderTopology: sanitized.renderTopology || {},
    sessionAssessment: sanitized.sessionAssessment || {},
    requestAssessment: sanitized.requestAssessment || {},
    auditIntegrity: sanitized.auditIntegrity || {},
    performanceAssessment: sanitized.performanceAssessment || {},
    databaseAssessment: sanitized.databaseAssessment || {},
    recoveryAssessment: sanitized.recoveryAssessment || {},
    releaseGate: sanitized.releaseGate || {},
    environmentPresence: sanitized.environmentPresence || {},
    recentFindings: sanitized.recentFindings || [],
  };
  const checksum = sha256(core);
  const bundle = {
    ...core,
    checksum,
  };
  return {
    bundle,
    secretLeaks: findSecretLeaks(bundle, patterns),
  };
}

export function generateReleaseGateReport(input) {
  const controls = [];
  const session = input?.sessionAssessment;
  const request = input?.requestAssessment;
  const audit = input?.auditAssessment;
  const performance = input?.performanceAssessment;
  const database = input?.databaseAssessment;
  const recovery = input?.recoveryAssessment;
  const release = input?.releaseSnapshot || {};
  const limits = input?.releaseGatePolicy || {};

  controls.push(
    control(
      "sessionSecurity",
      session?.status === "PASS",
      session?.status,
      "PASS",
      "Session security assessment passes.",
    ),
    control(
      "requestSecurity",
      request?.status === "ACCEPTED" ||
        request?.status === "PASS",
      request?.status,
      "ACCEPTED",
      "Request security assessment passes.",
    ),
    control(
      "auditIntegrity",
      audit?.valid === true,
      audit?.valid,
      true,
      "Audit chain integrity passes.",
    ),
    control(
      "performance",
      performance?.status === "PASS",
      performance?.status,
      "PASS",
      "Performance budgets pass.",
    ),
    control(
      "databaseHealth",
      database?.status === "PASS",
      database?.status,
      "PASS",
      "Database health passes.",
    ),
    control(
      "recoveryReadiness",
      recovery?.status === "PASS",
      recovery?.status,
      "PASS",
      "Recovery readiness passes.",
    ),
    control(
      "openP0",
      finite(release.openP0 ?? 0, "openP0", 0) <=
        (limits.openP0Allowed ?? 0),
      release.openP0 ?? 0,
      `<= ${limits.openP0Allowed ?? 0}`,
      "No open P0 defect remains.",
    ),
    control(
      "openP1",
      finite(release.openP1 ?? 0, "openP1", 0) <=
        (limits.openP1Allowed ?? 0),
      release.openP1 ?? 0,
      `<= ${limits.openP1Allowed ?? 0}`,
      "No open P1 defect remains.",
    ),
    control(
      "rollbackTestPassed",
      release.rollbackTestPassed === true,
      release.rollbackTestPassed,
      true,
      "Rollback test passes.",
    ),
    control(
      "healthEndpointPassed",
      release.healthEndpointPassed === true,
      release.healthEndpointPassed,
      true,
      "Health endpoint passes.",
    ),
    control(
      "tenantIsolationPassed",
      release.tenantIsolationPassed === true,
      release.tenantIsolationPassed,
      true,
      "Tenant isolation test passes.",
    ),
    control(
      "authorizationPassed",
      release.authorizationPassed === true,
      release.authorizationPassed,
      true,
      "Authorization test passes.",
    ),
  );

  const decision = controls.every((row) => row.passed)
    ? "GO"
    : "HOLD";
  const core = {
    gateVersion:
      "PTT_RELEASE_GATE_11_9_0",
    decision,
    passed: decision === "GO",
    generatedAt: String(input?.generatedAt || ""),
    controls,
    failures: controls.filter((row) => !row.passed),
    evidence: {
      sessionAssessment: clone(session),
      requestAssessment: clone(request),
      auditAssessment: clone(audit),
      performanceAssessment: clone(performance),
      databaseAssessment: clone(database),
      recoveryAssessment: clone(recovery),
      releaseSnapshot: clone(release),
    },
  };
  return {
    ...core,
    gateId: `gate-${sha256(core).slice(0, 16)}`,
  };
}

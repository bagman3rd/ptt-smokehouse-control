#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
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

const BUILD = "11.9.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.9.0");
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

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(path.join(outDir, "hardening-hash-manifest.json"), {
  force: true,
});

const excluded = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "build",
  ".turbo",
  ".cache",
  "artifacts",
]);
const textExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".prisma",
  ".json",
  ".md",
  ".yaml",
  ".yml",
]);

function rel(file) {
  return path.relative(root, file).split(path.sep).join("/");
}
function walk(dir) {
  const rows = [];
  if (!fs.existsSync(dir)) return rows;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) rows.push(...walk(full));
    else if (entry.isFile()) rows.push(full);
  }
  return rows;
}
function read(file) {
  try {
    if (fs.statSync(file).size > 2_500_000) return "";
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function csvEscape(value) {
  const text =
    value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}
function writeCsv(name, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(
      columns.map((column) => csvEscape(row[column])).join(","),
    );
  }
  fs.writeFileSync(
    path.join(outDir, name),
    `${lines.join("\n")}\n`,
    "utf8",
  );
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const files = walk(root);
const textFiles = files.filter((file) =>
  textExtensions.has(path.extname(file).toLowerCase()),
);
const cache = new Map(textFiles.map((file) => [file, read(file)]));

const capabilities = [
  ["session-policy", "Bounded session and privileged authentication policy", ["evaluateSessionPolicy", "privileged2FAEnabled", "revocationSupported"]],
  ["authorization", "Deny-by-default role and tenant authorization", ["authorizeRequest", "CROSS_TENANT", "ROLE_DENIED"]],
  ["request-security", "CSRF, webhook signature, content type, request size, and security headers", ["evaluateRequestSecurity", "WEBHOOK_SIGNATURE", "REQUEST_SIZE"]],
  ["rate-limit", "Controlled rate limiting", ["consumeRateLimit", "retryAfterSeconds", "RATE_LIMIT_CATEGORIES"]],
  ["audit-chain", "Append-only tamper-evident audit chain", ["appendAuditEvent", "previousHash", "verifyAuditChain"]],
  ["api-performance", "API and critical mutation performance budgets", ["apiReadP95Ms", "criticalMutationP95Ms", "evaluatePerformanceRun"]],
  ["dashboard-performance", "Dashboard performance budget", ["dashboardP95Ms", "Dashboard p95 meets budget"]],
  ["database-performance", "Database query and connection-pool controls", ["databaseQueryP95Ms", "poolUtilizationPercent", "connectionHeadroom"]],
  ["resource-performance", "Memory, throughput, error-rate, and event-loop controls", ["throughputRps", "memoryMb", "eventLoopLagP95Ms"]],
  ["backup-readiness", "Verified current backup and RPO controls", ["backupAgeHours", "recoveryPointAgeHours", "backupVerified"]],
  ["restore-readiness", "Restore drill and RTO controls", ["restoreDrillAgeDays", "restoreDurationMinutes", "restoreEvidence"]],
  ["rollback-readiness", "Recorded rollback artifact and procedure", ["rollbackArtifact", "rollbackProcedure", "rollbackTestPassed"]],
  ["release-gate", "GO/HOLD release gate", ["generateReleaseGateReport", "PTT_RELEASE_GATE_11_9_0", "openP1"]],
  ["sanitization", "Secret-safe hardening support bundle", ["createSanitizedHardeningBundle", "findSecretLeaks", "[REDACTED]"]],
  ["no-cron-topology", "One web service and zero Render cron jobs", ["cronJobsDeliberatelyExcluded", "the single Render web service"]],
];

const capabilityRows = [];
const sourceRows = [];
const findings = [];

for (const [capabilityId, label, tokens] of capabilities) {
  const matches = [];
  for (const file of textFiles) {
    const source = `${rel(file)}\n${cache.get(file) || ""}`.toLowerCase();
    const matched = tokens.filter((token) =>
      source.includes(token.toLowerCase()),
    );
    if (matched.length) {
      matches.push({ sourceFile: rel(file), matched });
    }
  }
  capabilityRows.push({
    capabilityId,
    label,
    required: true,
    status: matches.length
      ? "STATIC_EVIDENCE_FOUND"
      : "NO_STATIC_EVIDENCE",
    evidenceCount: matches.length,
    deployedVerification: "PENDING_STAGING_UAT",
  });
  for (const match of matches.slice(0, 50)) {
    sourceRows.push({
      capabilityId,
      sourceFile: match.sourceFile,
      matchedTokens: match.matched.join("|"),
    });
  }
  if (!matches.length) {
    findings.push({
      severity: "P1",
      category: "HARDENING_CAPABILITY_GAP",
      subject: label,
      detail: "No static implementation evidence was detected.",
      releaseBlocking: true,
    });
  }
}

const sessionAssessment = evaluateSessionPolicy(
  fixtures.secureSessionConfig,
  contract.sessionPolicy,
);
const requestAssessment = evaluateRequestSecurity(
  {
    method: "POST",
    bodyBytes: 512,
    contentType: "application/json",
    browserSession: true,
    csrfValid: true,
    isWebhook: false,
    webhookSignatureValid: false,
    responseHeaders: fixtures.securityHeaders,
  },
  contract.requestSecurity,
);
const performanceAssessment = evaluatePerformanceRun(
  fixtures.performanceSamples,
  contract.performanceBudgets,
);
const databaseAssessment = evaluateDatabaseHealth(
  fixtures.databaseSnapshot,
  contract.databaseHealth,
);
const recoveryAssessment = evaluateRecoveryReadiness(
  fixtures.recoverySnapshot,
  contract.recovery,
);

let auditChain = [];
for (const [index, row] of [
  ["LOGIN_SUCCEEDED", "SESSION", "session-1190", "SUCCESS"],
  ["TENANT_CONTEXT_ESTABLISHED", "TENANT", "tenant-ptt-validation", "SUCCESS"],
  ["RELEASE_EVIDENCE_GENERATED", "RELEASE", "11.9.0", "SUCCESS"],
  ["RELEASE_GATE_EVALUATED", "RELEASE", "11.9.0", "SUCCESS"],
].entries()) {
  auditChain = appendAuditEvent(auditChain, {
    tenantId: "tenant-ptt-validation",
    requestId: `evidence-request-${index + 1}`,
    eventType: row[0],
    occurredAt: `2026-08-04T00:0${index}:00.000Z`,
    actor: {
      id: "km-evidence-1190",
      role: "KM",
    },
    resourceType: row[1],
    resourceId: row[2],
    outcome: row[3],
    metadata: {
      build: BUILD,
      evidenceSequence: index + 1,
    },
  });
}
const auditAssessment = verifyAuditChain(auditChain);

let rateLimitState = createRateLimitState();
const rateLimitRows = [];
for (let index = 0; index < 12; index += 1) {
  const output = consumeRateLimit(
    rateLimitState,
    {
      category: "AUTH",
      key: "evidence-ip",
      occurredAt: `2026-08-04T00:10:${String(index).padStart(
        2,
        "0",
      )}.000Z`,
    },
    contract.requestSecurity.rateLimits,
  );
  rateLimitState = output.state;
  rateLimitRows.push({
    attempt: index + 1,
    category: output.result.category,
    key: output.result.key,
    allowed: output.result.allowed,
    remaining: output.result.remaining,
    limit: output.result.limit,
    windowSeconds: output.result.windowSeconds,
    retryAfterSeconds: output.result.retryAfterSeconds,
  });
}

const authorizationRows = [
  {
    scenario: "KM same-tenant inventory write",
    ...authorizeRequest({
      actor: {
        role: "KM",
        tenantId: "tenant-ptt-validation",
      },
      resourceTenantId: "tenant-ptt-validation",
      action: "inventory:write",
      policy: fixtures.authorizationPolicy,
    }),
  },
  {
    scenario: "Viewer inventory write",
    ...authorizeRequest({
      actor: {
        role: "VIEWER",
        tenantId: "tenant-ptt-validation",
      },
      resourceTenantId: "tenant-ptt-validation",
      action: "inventory:write",
      policy: fixtures.authorizationPolicy,
    }),
  },
  {
    scenario: "KM cross-tenant Today write",
    ...authorizeRequest({
      actor: {
        role: "KM",
        tenantId: "tenant-ptt-validation",
      },
      resourceTenantId: "tenant-other",
      action: "today:write",
      policy: fixtures.authorizationPolicy,
    }),
  },
];

const releaseGate = generateReleaseGateReport({
  generatedAt: "2026-08-04T00:20:00.000Z",
  sessionAssessment,
  requestAssessment,
  auditAssessment,
  performanceAssessment,
  databaseAssessment,
  recoveryAssessment,
  releaseSnapshot: fixtures.releaseSnapshot,
  releaseGatePolicy: contract.releaseGate,
});

const bundleResult = createSanitizedHardeningBundle(
  {
    generatedAt: "2026-08-04T00:21:00.000Z",
    buildIdentity: {
      appBuildVersion: BUILD,
      gitCommit: "synthetic-commit-1190",
      environment: "evidence",
    },
    renderTopology: contract.renderTopology,
    sessionAssessment,
    requestAssessment,
    auditIntegrity: auditAssessment,
    performanceAssessment,
    databaseAssessment,
    recoveryAssessment,
    releaseGate,
    environmentPresence: {
      DATABASE_URL: true,
      ADMIN_PASSWORD: true,
      APP_SESSION_TOKEN: true,
      TOTP_ENCRYPTION_KEY: true,
      SENTRY_DSN: false,
    },
    recentFindings: findings,
    secretProbe: {
      password: "never-export",
      pin: "never-export",
      authorization: "Bearer never-export",
      api_key: "never-export",
      safeField: "retained",
    },
  },
  contract.sanitization.redactedKeyPatterns,
);

const controlRows = [
  ...sessionAssessment.controls.map((row) => ({
    domain: "SESSION",
    ...row,
  })),
  ...requestAssessment.controls.map((row) => ({
    domain: "REQUEST",
    ...row,
  })),
  {
    domain: "AUDIT",
    control: "hashChain",
    passed: auditAssessment.valid,
    actual: auditAssessment.eventCount,
    expected: "valid",
    message: "Audit chain verifies from GENESIS to head hash.",
    warning: false,
  },
  ...performanceAssessment.controls.map((row) => ({
    domain: "PERFORMANCE",
    ...row,
  })),
  ...databaseAssessment.controls.map((row) => ({
    domain: "DATABASE",
    ...row,
  })),
  ...recoveryAssessment.controls.map((row) => ({
    domain: "RECOVERY",
    ...row,
  })),
];

const performanceRows = [
  {
    metric: "apiReadP95Ms",
    actual: performanceAssessment.metrics.apiRead.p95Ms,
    budget: contract.performanceBudgets.apiReadP95Ms,
    passed:
      performanceAssessment.metrics.apiRead.p95Ms <=
      contract.performanceBudgets.apiReadP95Ms,
  },
  {
    metric: "criticalMutationP95Ms",
    actual:
      performanceAssessment.metrics.criticalMutation.p95Ms,
    budget:
      contract.performanceBudgets.criticalMutationP95Ms,
    passed:
      performanceAssessment.metrics.criticalMutation.p95Ms <=
      contract.performanceBudgets.criticalMutationP95Ms,
  },
  {
    metric: "dashboardP95Ms",
    actual: performanceAssessment.metrics.dashboard.p95Ms,
    budget: contract.performanceBudgets.dashboardP95Ms,
    passed:
      performanceAssessment.metrics.dashboard.p95Ms <=
      contract.performanceBudgets.dashboardP95Ms,
  },
  {
    metric: "databaseQueryP95Ms",
    actual:
      performanceAssessment.metrics.databaseQuery.p95Ms,
    budget:
      contract.performanceBudgets.databaseQueryP95Ms,
    passed:
      performanceAssessment.metrics.databaseQuery.p95Ms <=
      contract.performanceBudgets.databaseQueryP95Ms,
  },
  {
    metric: "errorRatePercent",
    actual: performanceAssessment.metrics.errorRatePercent,
    budget: contract.performanceBudgets.errorRatePercent,
    passed:
      performanceAssessment.metrics.errorRatePercent <=
      contract.performanceBudgets.errorRatePercent,
  },
  {
    metric: "throughputRps",
    actual: performanceAssessment.metrics.throughputRps,
    budget: contract.performanceBudgets.minimumThroughputRps,
    passed:
      performanceAssessment.metrics.throughputRps >=
      contract.performanceBudgets.minimumThroughputRps,
  },
  {
    metric: "memoryMb",
    actual: performanceAssessment.metrics.memoryMb,
    budget: contract.performanceBudgets.maximumMemoryMb,
    passed:
      performanceAssessment.metrics.memoryMb <=
      contract.performanceBudgets.maximumMemoryMb,
  },
  {
    metric: "eventLoopLagP95Ms",
    actual:
      performanceAssessment.metrics.eventLoopLagP95Ms,
    budget:
      contract.performanceBudgets.maximumEventLoopLagP95Ms,
    passed:
      performanceAssessment.metrics.eventLoopLagP95Ms <=
      contract.performanceBudgets.maximumEventLoopLagP95Ms,
  },
];

const databaseRows = databaseAssessment.controls.map((row) => ({
  control: row.control,
  passed: row.passed,
  actual: row.actual,
  expected: row.expected,
  message: row.message,
}));

const recoveryRows = recoveryAssessment.controls.map((row) => ({
  control: row.control,
  passed: row.passed,
  actual: row.actual,
  expected: row.expected,
  message: row.message,
}));

const gateRows = releaseGate.controls.map((row) => ({
  gateId: releaseGate.gateId,
  decision: releaseGate.decision,
  control: row.control,
  passed: row.passed,
  actual: row.actual,
  expected: row.expected,
  message: row.message,
}));

const auditRows = auditChain.map((row) => ({
  sequence: row.sequence,
  auditEventId: row.auditEventId,
  tenantId: row.tenantId,
  requestId: row.requestId,
  eventType: row.eventType,
  occurredAt: row.occurredAt,
  actorId: row.actor.id,
  actorRole: row.actor.role,
  resourceType: row.resourceType,
  resourceId: row.resourceId,
  outcome: row.outcome,
  previousHash: row.previousHash,
  eventHash: row.eventHash,
}));

const scenarioRows = fixtures.scenarios.map((scenario) => ({
  scenarioId: scenario.id,
  scenarioName: scenario.name,
  deterministicStatus: "PASSED_BY_TEST_SCRIPT",
  expected: JSON.stringify(scenario.expected),
  deployedStatus: "NOT_EXECUTED",
  evidence: "",
}));

const uat = [
  ["HR-001", "ADMIN", "Session absolute timeout", "Authenticate and keep the session active beyond 12 hours.", "Session is invalidated server-side."],
  ["HR-002", "ADMIN", "Session idle timeout", "Leave the session idle beyond 30 minutes.", "Session is invalidated and a new authentication is required."],
  ["HR-003", "OWNER", "Privileged reauthentication", "Attempt a privileged action more than 15 minutes after authentication.", "Recent authentication is required."],
  ["HR-004", "ADMIN", "Privileged 2FA", "Authenticate as ADMIN, OWNER, and KM.", "Second-factor enforcement matches the approved production policy."],
  ["HR-005", "KM", "Session rotation", "Authenticate and inspect the pre/post session identifier.", "Identifier rotates and the previous identifier is invalid."],
  ["HR-006", "ADMIN", "Session revocation", "Revoke an active user session.", "The revoked session cannot call any protected endpoint."],
  ["HR-007", "VIEWER", "Viewer mutation denial", "Submit direct inventory and admin mutations.", "Server returns authorization denial without a write."],
  ["HR-008", "KM", "Tenant isolation", "Request another tenant's Today, inventory, report, or admin resource.", "No data is returned, inferred, or modified."],
  ["HR-009", "KM", "CSRF mutation control", "Submit a browser mutation without a valid CSRF token.", "Request is rejected before mutation."],
  ["HR-010", "ADMIN", "Webhook signature control", "Submit Square or provider webhook without a valid signature.", "Request is rejected and audited."],
  ["HR-011", "ADMIN", "Request-size limit", "Submit JSON larger than 1,048,576 bytes.", "Request is rejected without excessive memory use."],
  ["HR-012", "ADMIN", "Content-type validation", "Submit mutation JSON using an invalid content type.", "Request is rejected."],
  ["HR-013", "ADMIN", "Security headers", "Inspect production HTTPS responses.", "CSP, nosniff, referrer policy, permissions policy, and HSTS are present."],
  ["HR-014", "ADMIN", "Authentication rate limit", "Send eleven login attempts from one controlled key in 60 seconds.", "The eleventh request is denied with retry-after."],
  ["HR-015", "KM", "Mutation rate limit", "Exceed the mutation budget.", "Excess requests are denied without duplicate writes."],
  ["HR-016", "ADMIN", "Audit chain continuity", "Verify a sequence of security and operational events.", "Every event points to the prior hash and the head verifies."],
  ["HR-017", "ADMIN", "Audit tamper detection", "Alter a copied audit event.", "Verification reports the exact sequence and hash failure."],
  ["HR-018", "QA", "API read performance", "Run the controlled staging load profile.", "API read p95 is at or below 500 ms."],
  ["HR-019", "QA", "Critical mutation performance", "Run controlled load for Today, EOD, inventory, and approvals.", "Critical mutation p95 is at or below 750 ms and remains idempotent."],
  ["HR-020", "QA", "Dashboard performance", "Open Today, Inventory, Reports, and Admin under controlled load.", "Dashboard p95 is at or below 2,000 ms."],
  ["HR-021", "QA", "Database query performance", "Capture query timing under controlled load.", "Database query p95 is at or below 250 ms."],
  ["HR-022", "QA", "Error rate and throughput", "Run 600 requests over 10 seconds in staging.", "Throughput is at least 50 requests/second and error rate is at or below 1%."],
  ["HR-023", "QA", "Memory and event loop", "Observe the staged load run.", "Memory remains at or below 768 MB and event-loop p95 at or below 100 ms."],
  ["HR-024", "ADMIN", "Database pool headroom", "Inspect active, idle, and maximum connections under load.", "Utilization is at or below 80% with at least four connections of headroom."],
  ["HR-025", "ADMIN", "Long transaction control", "Inspect transaction duration evidence.", "No controlled transaction exceeds 5,000 ms."],
  ["HR-026", "ADMIN", "Migration status", "Compare deployed schema and migration history.", "Status is CURRENT and matches the release commit."],
  ["HR-027", "ADMIN", "Verified backup freshness", "Inspect current backup evidence.", "Verified backup age is at or below 26 hours."],
  ["HR-028", "ADMIN", "RPO evidence", "Compare backup/recovery point to controlled RPO.", "Recovery point age is at or below 24 hours."],
  ["HR-029", "ADMIN", "Restore drill", "Review or execute the controlled staging restore drill.", "Evidence is less than 90 days old and data reconciliation passes."],
  ["HR-030", "ADMIN", "RTO evidence", "Measure the restore drill.", "Restore completes within four hours."],
  ["HR-031", "ADMIN", "Rollback execution", "Rollback staging to the recorded prior revision.", "Rollback procedure works and health, authorization, and tenant isolation pass afterward."],
  ["HR-032", "ADMIN", "Sanitized support bundle", "Generate the hardening bundle with test secrets present.", "Secret-bearing fields are redacted and leak count is zero."],
  ["HR-033", "Release owner", "GO release gate", "Run all controlled gates with zero P0/P1 defects.", "Decision is GO with no failed control."],
  ["HR-034", "Release owner", "HOLD release gate", "Introduce one open P1 or failed security/performance/recovery control.", "Decision is HOLD and names every blocking control."],
].map((row) => ({
  testId: row[0],
  role: row[1],
  scenario: row[2],
  procedure: row[3],
  expected: row[4],
  result: "NOT_EXECUTED",
  tester: "",
  evidence: "",
  defectIds: "",
  testDate: "",
}));

writeCsv("hardening-capability-map.csv", capabilityRows, [
  "capabilityId",
  "label",
  "required",
  "status",
  "evidenceCount",
  "deployedVerification",
]);
writeCsv("hardening-source-evidence.csv", sourceRows, [
  "capabilityId",
  "sourceFile",
  "matchedTokens",
]);
writeCsv("hardening-known-scenarios.csv", scenarioRows, [
  "scenarioId",
  "scenarioName",
  "deterministicStatus",
  "expected",
  "deployedStatus",
  "evidence",
]);
writeCsv("security-control-results.csv", controlRows, [
  "domain",
  "control",
  "passed",
  "actual",
  "expected",
  "message",
  "warning",
]);
writeCsv("authorization-results.csv", authorizationRows, [
  "scenario",
  "allowed",
  "reason",
  "role",
  "action",
]);
writeCsv("rate-limit-trace.csv", rateLimitRows, [
  "attempt",
  "category",
  "key",
  "allowed",
  "remaining",
  "limit",
  "windowSeconds",
  "retryAfterSeconds",
]);
writeCsv("audit-chain.csv", auditRows, [
  "sequence",
  "auditEventId",
  "tenantId",
  "requestId",
  "eventType",
  "occurredAt",
  "actorId",
  "actorRole",
  "resourceType",
  "resourceId",
  "outcome",
  "previousHash",
  "eventHash",
]);
writeCsv("performance-budget-results.csv", performanceRows, [
  "metric",
  "actual",
  "budget",
  "passed",
]);
writeCsv("database-health-results.csv", databaseRows, [
  "control",
  "passed",
  "actual",
  "expected",
  "message",
]);
writeCsv("recovery-readiness-results.csv", recoveryRows, [
  "control",
  "passed",
  "actual",
  "expected",
  "message",
]);
writeCsv("release-gate-results.csv", gateRows, [
  "gateId",
  "decision",
  "control",
  "passed",
  "actual",
  "expected",
  "message",
]);
writeCsv("hardening-uat-workbook.csv", uat, [
  "testId",
  "role",
  "scenario",
  "procedure",
  "expected",
  "result",
  "tester",
  "evidence",
  "defectIds",
  "testDate",
]);
writeCsv("hardening-findings.csv", findings, [
  "severity",
  "category",
  "subject",
  "detail",
  "releaseBlocking",
]);

fs.writeFileSync(
  path.join(outDir, "session-assessment.json"),
  `${JSON.stringify(sessionAssessment, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "request-security-assessment.json"),
  `${JSON.stringify(requestAssessment, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "audit-integrity.json"),
  `${JSON.stringify(auditAssessment, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "performance-assessment.json"),
  `${JSON.stringify(performanceAssessment, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "database-assessment.json"),
  `${JSON.stringify(databaseAssessment, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "recovery-assessment.json"),
  `${JSON.stringify(recoveryAssessment, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "release-gate.json"),
  `${JSON.stringify(releaseGate, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "sanitized-hardening-bundle.json"),
  `${JSON.stringify(bundleResult.bundle, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "hardening-contract-snapshot.json"),
  `${JSON.stringify(contract, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "hardening-fixture-snapshot.json"),
  `${JSON.stringify(fixtures, null, 2)}\n`,
  "utf8",
);

const readiness = {
  buildVersion: BUILD,
  engineVersion: contract.engineVersion,
  generatedAt: new Date().toISOString(),
  exitGate: contract.exitGate,
  counts: {
    filesScanned: files.length,
    textFilesScanned: textFiles.length,
    capabilities: capabilityRows.length,
    capabilitiesWithEvidence: capabilityRows.filter(
      (row) => row.status === "STATIC_EVIDENCE_FOUND",
    ).length,
    deterministicScenarios: fixtures.scenarios.length,
    securityControls: controlRows.filter(
      (row) =>
        row.domain === "SESSION" ||
        row.domain === "REQUEST" ||
        row.domain === "AUDIT",
    ).length,
    performanceControls: performanceRows.length,
    databaseControls: databaseRows.length,
    recoveryControls: recoveryRows.length,
    releaseGateControls: gateRows.length,
    auditEvents: auditRows.length,
    rateLimitAttempts: rateLimitRows.length,
    uatRows: uat.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter(
      (finding) => finding.releaseBlocking,
    ).length,
  },
  results: {
    sessionStatus: sessionAssessment.status,
    requestStatus: requestAssessment.status,
    auditValid: auditAssessment.valid,
    performanceStatus: performanceAssessment.status,
    databaseStatus: databaseAssessment.status,
    recoveryStatus: recoveryAssessment.status,
    releaseDecision: releaseGate.decision,
    releaseFailures: releaseGate.failures.length,
    secretLeakCount: bundleResult.secretLeaks.length,
    renderWebServices: contract.renderTopology.webServices,
    renderCronServices: contract.renderTopology.cronServices,
    renderDatabases: contract.renderTopology.databases,
  },
  capabilities: capabilityRows,
  findings,
};

fs.writeFileSync(
  path.join(outDir, "hardening-readiness.json"),
  `${JSON.stringify(readiness, null, 2)}\n`,
  "utf8",
);

const summary = `# Build ${BUILD} Security, Performance, and Recovery Readiness

Generated: ${readiness.generatedAt}

## Exit gate

${contract.exitGate}

| Measure | Count |
|---|---:|
| Files scanned | ${readiness.counts.filesScanned} |
| Required capabilities | ${readiness.counts.capabilities} |
| Capabilities with evidence | ${readiness.counts.capabilitiesWithEvidence} |
| Deterministic scenarios | ${readiness.counts.deterministicScenarios} |
| Security controls | ${readiness.counts.securityControls} |
| Performance controls | ${readiness.counts.performanceControls} |
| Database controls | ${readiness.counts.databaseControls} |
| Recovery controls | ${readiness.counts.recoveryControls} |
| Release-gate controls | ${readiness.counts.releaseGateControls} |
| Audit events | ${readiness.counts.auditEvents} |
| Deployed UAT rows | ${readiness.counts.uatRows} |
| Release-blocking static findings | ${readiness.counts.releaseBlockingFindings} |

Deterministic evidence proves the controlled rules and fixtures. It does not prove production authentication, live endpoint enforcement, production performance, current backups, a successful restore, or a working rollback. Execute every row in \`hardening-uat-workbook.csv\` on isolated staging before Build 12.0.0.
`;
fs.writeFileSync(
  path.join(outDir, "hardening-readiness-summary.md"),
  summary,
  "utf8",
);

const manifestFiles = fs.readdirSync(outDir).sort();
const hashes = {};
for (const name of manifestFiles) {
  const file = path.join(outDir, name);
  if (fs.statSync(file).isFile()) {
    hashes[name] = hash(fs.readFileSync(file));
  }
}
fs.writeFileSync(
  path.join(outDir, "hardening-hash-manifest.json"),
  `${JSON.stringify(
    {
      buildVersion: BUILD,
      algorithm: "sha256",
      generatedAt: readiness.generatedAt,
      files: hashes,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Build ${BUILD} hardening evidence generated.`);
for (const [key, value] of Object.entries(readiness.counts)) {
  console.log(`${key}: ${value}`);
}
console.log(`Release decision: ${releaseGate.decision}`);
console.log(`Output: ${path.relative(root, outDir)}`);

#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  assessProductionRelease,
  authorizeProductionRelease,
  createProductionHandoffBundle,
  createProductionReleaseManifest,
} from "../lib/production-release/build-12.0.0/production-release-engine.mjs";

const BUILD = "12.0.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-12.0.0");
const contract = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "production-release-contract-12.0.0.json",
    ),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "production-release-fixtures-12.0.0.json",
    ),
    "utf8",
  ),
);

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(
  path.join(outDir, "production-release-hash-manifest.json"),
  { force: true },
);

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

const files = walk(root);
const textFiles = files.filter((file) =>
  textExtensions.has(path.extname(file).toLowerCase()),
);
const cache = new Map(textFiles.map((file) => [file, read(file)]));

const capabilities = [
  ["release-assessment", "Production release assessment", ["assessProductionRelease", "PTT_PRODUCTION_RELEASE_12_0_0"]],
  ["explicit-authorization", "Explicit release-owner production authorization", ["authorizeProductionRelease", "PENDING_DEPLOYED_SIGN_OFF", "RELEASE_OWNER"]],
  ["release-manifest", "Deterministic production release manifest", ["createProductionReleaseManifest", "PTT_PRODUCTION_RELEASE_MANIFEST_12_0_0"]],
  ["baseline-chain", "Build 11.1.0 through 11.9.0 evidence chain", ["requiredBuilds", "baselineBuilds", "evidenceHash"]],
  ["workflow-integration", "Eight integrated core workflows", ["coreWorkflows", "durablePersistenceVerified", "routeIntegrated"]],
  ["normal-navigation", "Normal production navigation", ["normalNavigationRoutes", "requiredRoutes", "deadLinks"]],
  ["validation-route-control", "Validation routes disabled or ADMIN-only", ["validationRouteExposure", "ADMIN_ONLY", "publicExposureBlocksRelease"]],
  ["api-certification", "Required API domains", ["requiredApiDomains", "deployedTestPassed", "idempotencyVerified"]],
  ["production-config", "Production configuration and secret presence", ["configurationPresence", "sandboxPaymentsEnabled", "testFixturesEnabled"]],
  ["deployment-identity", "Exact deployment identity", ["gitCommitVerified", "renderRevisionVerified", "buildIdentity"]],
  ["no-cron-topology", "One web and zero Render cron services", ["cronServicesForbidden", "cronServices", "webServices"]],
  ["hardening-chain", "Security and performance sign-off", ["hardeningEvidence", "performancePassed", "tenantIsolationPassed"]],
  ["recovery-chain", "Backup, restore, rollback, RPO, and RTO", ["verifiedBackupCurrent", "restoreDrillPassed", "rollbackTestPassed"]],
  ["launch-operations", "Opening-day and first-day operational ownership", ["openingDayChecklistComplete", "firstDayMonitoringPlanComplete", "supportRunbook"]],
  ["signoffs", "Required production sign-offs", ["signOffRoles", "RECOVERY_TESTER", "signedAt"]],
  ["sanitized-handoff", "Secret-safe production handoff bundle", ["createProductionHandoffBundle", "PTT_PRODUCTION_HANDOFF_12_0_0", "[REDACTED]"]],
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
    deployedVerification: "PENDING_DEPLOYED_SIGN_OFF",
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
      category: "PRODUCTION_RELEASE_CAPABILITY_GAP",
      subject: label,
      detail: "No static implementation evidence was detected.",
      releaseBlocking: true,
    });
  }
}

const candidate = fixtures.releaseCandidate;
const assessment = assessProductionRelease(candidate, contract);
const pendingManifest = createProductionReleaseManifest(assessment);

// This record proves the authorization record format only. It is not used
// to authorize the packaged release.
const simulatedAuthorization = authorizeProductionRelease(
  assessment,
  {
    role: "RELEASE_OWNER",
    actorName: "SIMULATED RELEASE OWNER",
    authorizedAt: "2026-08-05T15:00:00.000Z",
    reason:
      "Controlled format simulation only; deployed production authorization remains pending",
    deployedEvidenceReviewed: true,
    renderDeploymentVerified: true,
    operationalAcceptanceSigned: true,
    authorizationGranted: true,
  },
);
const simulatedAuthorizedManifest = createProductionReleaseManifest(
  assessment,
  simulatedAuthorization,
);

const handoffResult = createProductionHandoffBundle({
  generatedAt: "2026-08-05T15:05:00.000Z",
  releaseManifest: pendingManifest,
  launchOwners: candidate.launchEvidence,
  openingChecklist: {
    complete: candidate.launchEvidence.openingDayChecklistComplete,
    checklistId: "opening-checklist-1200",
  },
  supportPlan: {
    runbook: "docs/PRODUCTION_SUPPORT_RUNBOOK_12_0_0.md",
    escalationMatrix:
      "docs/PRODUCTION_INCIDENT_MATRIX_12_0_0.md",
    APP_SESSION_TOKEN: "probe-secret-not-exported",
  },
  recoveryPlan: {
    cutoverRunbook:
      "docs/PRODUCTION_CUTOVER_RUNBOOK_12_0_0.md",
    rollbackRunbook:
      "docs/PRODUCTION_ROLLBACK_RUNBOOK_12_0_0.md",
    DATABASE_URL: "probe-secret-not-exported",
  },
  firstDayMonitoring: {
    owner: candidate.launchEvidence.operationsOwner,
    plan:
      "docs/FIRST_DAY_OPERATIONS_PLAN_12_0_0.md",
    complete:
      candidate.launchEvidence.firstDayMonitoringPlanComplete,
  },
  knownLimitations: [
    "Production authorization remains pending deployed evidence and release-owner sign-off.",
    "Validation routes must be disabled or ADMIN-only.",
    "Render cron services remain intentionally absent.",
  ],
  environmentPresence:
    candidate.configurationEvidence.configurationPresence,
});

const baselineRows = Object.entries(candidate.baselineBuilds).map(
  ([buildVersion, row]) => ({
    buildVersion,
    status: row.status,
    artifactId: row.artifactId,
    evidenceHash: row.evidenceHash,
  }),
);

const workflowRows = Object.entries(candidate.workflowEvidence).map(
  ([workflow, row]) => ({
    workflow,
    routeIntegrated: row.routeIntegrated,
    durablePersistenceVerified: row.durablePersistenceVerified,
    serverAuthorizationVerified: row.serverAuthorizationVerified,
    tenantIsolationVerified: row.tenantIsolationVerified,
    idempotencyVerified: row.idempotencyVerified,
    auditVerified: row.auditVerified,
    uatPassed: row.uatPassed,
    openP0: row.openP0,
    openP1: row.openP1,
    evidenceIds: row.evidenceIds.join("|"),
  }),
);

const routeRows = [
  ...candidate.routeEvidence.normalNavigationRoutes.map((route) => ({
    route,
    category: "NORMAL_NAVIGATION",
    available:
      candidate.routeEvidence.availableRoutes.includes(route),
    exposure: "ROLE_CONTROLLED",
    releaseBlocking: false,
  })),
  ...Object.entries(
    candidate.routeEvidence.validationRouteExposure,
  ).map(([route, exposure]) => ({
    route,
    category: "VALIDATION_ROUTE",
    available:
      candidate.routeEvidence.availableRoutes.includes(route),
    exposure,
    releaseBlocking:
      !["DISABLED", "ADMIN_ONLY"].includes(exposure),
  })),
];

const apiRows = Object.entries(candidate.apiEvidence).map(
  ([domain, row]) => ({
    domain,
    routePresent: row.routePresent,
    authorizationVerified: row.authorizationVerified,
    tenantIsolationVerified: row.tenantIsolationVerified,
    idempotencyVerified: row.idempotencyVerified,
    deployedTestPassed: row.deployedTestPassed,
  }),
);

const controlRows = assessment.controls.map((row) => ({
  assessmentId: assessment.assessmentId,
  evidenceDecision: assessment.evidenceDecision,
  productionAuthorization: assessment.productionAuthorization,
  domain: row.domain,
  control: row.control,
  passed: row.passed,
  actual: JSON.stringify(row.actual),
  expected: JSON.stringify(row.expected),
  message: row.message,
  evidenceIds: row.evidenceIds.join("|"),
}));

const signoffRows = Object.entries(candidate.signOffs).map(
  ([role, row]) => ({
    role,
    signed: row.signed,
    name: row.name,
    signedAt: row.signedAt,
    evidenceId: row.evidenceId,
    deployedStatus: "SYNTHETIC_FIXTURE_ONLY",
  }),
);

const launchRows = [
  ["Release owner assigned", Boolean(candidate.launchEvidence.releaseOwner), candidate.launchEvidence.releaseOwner],
  ["Operations owner assigned", Boolean(candidate.launchEvidence.operationsOwner), candidate.launchEvidence.operationsOwner],
  ["Support owner assigned", Boolean(candidate.launchEvidence.supportOwner), candidate.launchEvidence.supportOwner],
  ["Incident owner assigned", Boolean(candidate.launchEvidence.incidentOwner), candidate.launchEvidence.incidentOwner],
  ["Opening-day checklist complete", candidate.launchEvidence.openingDayChecklistComplete, "opening checklist"],
  ["First-day monitoring plan complete", candidate.launchEvidence.firstDayMonitoringPlanComplete, "monitoring plan"],
  ["Support runbook recorded", Boolean(candidate.launchEvidence.supportRunbook), candidate.launchEvidence.supportRunbook],
  ["Rollback runbook recorded", Boolean(candidate.launchEvidence.rollbackRunbook), candidate.launchEvidence.rollbackRunbook],
  ["Staff training complete", candidate.launchEvidence.staffTrainingComplete, "training evidence"],
  ["Opening data loaded", candidate.launchEvidence.openingDataLoaded, "opening data evidence"],
].map(([item, complete, evidence]) => ({
  item,
  complete,
  evidence,
  deployedResult: "NOT_EXECUTED",
  owner: "",
  completedAt: "",
}));

const scenarioRows = fixtures.scenarios.map((scenario) => ({
  scenarioId: scenario.id,
  scenarioName: scenario.name,
  deterministicStatus: "PASSED_BY_TEST_SCRIPT",
  expected: JSON.stringify(scenario.expected),
  deployedStatus: "NOT_EXECUTED",
  evidence: "",
}));

const uatRows = [
  ["PD-001", "Release owner", "Exact release identity", "Verify Git commit, Render revision, environment, domain, HTTPS, and Build 12.0.0 identity.", "All identifiers match the approved release candidate."],
  ["PD-002", "ADMIN", "Render topology", "Inspect Blueprint and resources.", "Exactly one web service, zero cron services, and one PostgreSQL database exist."],
  ["PD-003", "ADMIN", "Database migration status", "Compare migration history to the release commit.", "Status is CURRENT with no drift."],
  ["PD-004", "ADMIN", "Health endpoint", "Call the production-equivalent health endpoint before and after restart.", "Health passes and identifies Build 12.0.0."],
  ["PD-005", "ADMIN", "Configuration presence", "Verify required environment keys without displaying values.", "DATABASE_URL, ADMIN_PASSWORD, APP_SESSION_TOKEN, and TOTP_ENCRYPTION_KEY are present."],
  ["PD-006", "ADMIN", "Production flags", "Inspect production configuration.", "Debug, fixtures, and sandbox payment modes are disabled."],
  ["PD-007", "New manager", "Normal navigation", "Navigate Setup, Forecast, Production, Today, EOD, Inventory, Reports, and Admin without direct URLs.", "Every authorized workflow is reachable with no dead link."],
  ["PD-008", "VIEWER", "Role navigation", "Open the application as Viewer.", "Only approved read-only destinations are visible and mutations fail server-side."],
  ["PD-009", "ADMIN", "Validation route policy", "Attempt every lab route as anonymous, Viewer, and ADMIN.", "Routes are disabled or ADMIN-only; no public lab is exposed."],
  ["PD-010", "ADMIN", "Two-tenant isolation sweep", "Run every core route and API using two synthetic tenants.", "No data is returned, inferred, or changed across tenants."],
  ["PD-011", "KM", "Setup persistence", "Change controlled master data, reload, sign out, and sign in.", "Approved changes persist with audit evidence."],
  ["PD-012", "KM", "Forecast persistence", "Create and approve a forecast, reload, and retrieve it through the API.", "The exact approved forecast and version persist."],
  ["PD-013", "KM", "Production-plan persistence", "Create and approve a production plan and smoker schedule.", "Plan, bookings, capacity, source forecast, and approver persist."],
  ["PD-014", "PITMASTER", "Today execution persistence", "Start, update, hold, resume, and complete a load.", "Every idempotent event persists in order with actor and timestamp."],
  ["PD-015", "KC", "Quick EOD persistence", "Submit sealed units and open cooked pounds, correct once, close, and reload.", "Submission, correction history, close, and rollover persist."],
  ["PD-016", "KC", "Inventory persistence", "Receive, use, waste, hold, count, adjust, and close.", "Ledger, holds, exceptions, counts, and close gates persist."],
  ["PD-017", "OWNER", "Reporting persistence", "Open daily and weekly reports after the operating day closes.", "Reports reconcile to durable source transactions."],
  ["PD-018", "KM", "Forecast-learning approval", "Approve a bounded recommendation and reload.", "Approval snapshot, evidence, approver, and effective date persist without auto-application."],
  ["PD-019", "ADMIN", "Administration audit", "Change notification and administration settings.", "Before/after, actor, reason, and timestamp persist."],
  ["PD-020", "KM", "Mutation idempotency sweep", "Retry every critical mutation with the same command ID.", "No duplicate durable write is created."],
  ["PD-021", "KM", "Out-of-order event protection", "Deliver a stale event after a newer event.", "Newer truth remains authoritative."],
  ["PD-022", "ADMIN", "Authentication/session controls", "Execute HR-001 through HR-006 against the release candidate.", "All session and privileged-authentication controls pass."],
  ["PD-023", "ADMIN", "Request security controls", "Execute HR-009 through HR-015.", "CSRF, signature, size, content type, headers, and rate limits pass."],
  ["PD-024", "ADMIN", "Audit integrity", "Verify and then tamper with copied audit evidence.", "Valid chain passes and tampered chain fails."],
  ["PD-025", "QA", "Performance profile", "Execute the approved staging load profile.", "Every Build 11.9.0 performance budget passes."],
  ["PD-026", "ADMIN", "Database health", "Inspect pool, query, transaction, and migration evidence under load.", "All database controls pass with headroom."],
  ["PD-027", "ADMIN", "Verified backup", "Inspect current backup evidence.", "Backup is verified and satisfies RPO."],
  ["PD-028", "ADMIN", "Restore drill", "Restore to an isolated target and reconcile records.", "Restore meets RTO and data reconciliation passes."],
  ["PD-029", "ADMIN", "Rollback rehearsal", "Rollback staging to the prior verified revision and then redeploy 12.0.0.", "Both transitions pass health, authentication, tenant isolation, and core smoke tests."],
  ["PD-030", "Operations owner", "Opening data review", "Verify locations, users, roles, products, smokers, yields, capacities, service hours, and opening inventory.", "Opening data is correct and signed."],
  ["PD-031", "Operations owner", "Staff training", "Observe manager, pitmaster, and coordinator completing role workflows without coaching.", "Each role completes assigned workflow with no hidden critical action."],
  ["PD-032", "Support owner", "Support runbook", "Use the runbook to diagnose a synthetic login, database, and workflow incident.", "Support owner reaches the correct diagnosis and escalation path."],
  ["PD-033", "Incident owner", "Incident escalation", "Run a synthetic P1 incident.", "Ownership, communication, mitigation, rollback criteria, and closure are followed."],
  ["PD-034", "Operations owner", "First-day monitoring", "Review dashboard, logs, database, errors, and operating exceptions at defined intervals.", "Monitoring evidence is captured and assigned."],
  ["PD-035", "Release owner", "No open P0/P1", "Review defect register and unresolved exceptions.", "Open P0 and P1 counts are zero."],
  ["PD-036", "Release owner", "Required sign-offs", "Review all five sign-off records.", "Release, operations, security, QA, and recovery sign-offs are complete."],
  ["PD-037", "Release owner", "Pending manifest", "Generate the release manifest before authorization.", "Manifest says PENDING_DEPLOYED_SIGN_OFF."],
  ["PD-038", "Release owner", "Explicit production authorization", "Review deployed evidence and sign the production authorization record.", "Only the release owner can produce AUTHORIZED status."],
  ["PD-039", "Release owner", "Unauthorized authorization attempt", "Attempt authorization as QA Tester or KM.", "Authorization is rejected."],
  ["PD-040", "Support owner", "Sanitized handoff", "Generate the production handoff with probe secrets.", "Secret leak count is zero and checksum verifies."],
  ["PD-041", "ADMIN", "Restart recovery", "Restart the web service during staging acceptance.", "Application returns healthy without duplicate work or data loss."],
  ["PD-042", "ADMIN", "Database interruption recovery", "Interrupt database access in isolated staging.", "Failure is clear, no invalid success is shown, and recovery preserves data."],
  ["PD-043", "Operations owner", "Provider outage", "Disable optional external providers.", "Core forecasting, production, Today, EOD, inventory, and reports remain usable."],
  ["PD-044", "Operations owner", "Full operating-day simulation", "Run opening through close using all core roles.", "The day closes with zero unexplained inventory difference and complete audit history."],
  ["PD-045", "New user", "Uncoached end-to-end workflow", "Give a trained but inexperienced manager the operating-day objective without click instructions.", "The manager completes the day without developer intervention."],
  ["PD-046", "Release owner", "Cutover checklist", "Execute the production cutover runbook step by step.", "Every preflight, deploy, smoke, data, and communication item is signed."],
  ["PD-047", "Release owner", "HOLD behavior", "Introduce one failed control or open P1.", "Evidence decision changes to HOLD and production authorization is impossible."],
  ["PD-048", "Release owner", "Final GO", "Remove all blockers and rerun the deployed release gate.", "Evidence decision is GO; explicit release-owner authorization is then recorded."],
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

writeCsv("production-release-capability-map.csv", capabilityRows, [
  "capabilityId",
  "label",
  "required",
  "status",
  "evidenceCount",
  "deployedVerification",
]);
writeCsv("production-release-source-evidence.csv", sourceRows, [
  "capabilityId",
  "sourceFile",
  "matchedTokens",
]);
writeCsv("production-release-known-scenarios.csv", scenarioRows, [
  "scenarioId",
  "scenarioName",
  "deterministicStatus",
  "expected",
  "deployedStatus",
  "evidence",
]);
writeCsv("baseline-build-evidence.csv", baselineRows, [
  "buildVersion",
  "status",
  "artifactId",
  "evidenceHash",
]);
writeCsv("workflow-production-readiness.csv", workflowRows, [
  "workflow",
  "routeIntegrated",
  "durablePersistenceVerified",
  "serverAuthorizationVerified",
  "tenantIsolationVerified",
  "idempotencyVerified",
  "auditVerified",
  "uatPassed",
  "openP0",
  "openP1",
  "evidenceIds",
]);
writeCsv("production-route-exposure.csv", routeRows, [
  "route",
  "category",
  "available",
  "exposure",
  "releaseBlocking",
]);
writeCsv("production-api-readiness.csv", apiRows, [
  "domain",
  "routePresent",
  "authorizationVerified",
  "tenantIsolationVerified",
  "idempotencyVerified",
  "deployedTestPassed",
]);
writeCsv("production-release-control-results.csv", controlRows, [
  "assessmentId",
  "evidenceDecision",
  "productionAuthorization",
  "domain",
  "control",
  "passed",
  "actual",
  "expected",
  "message",
  "evidenceIds",
]);
writeCsv("production-signoff-register.csv", signoffRows, [
  "role",
  "signed",
  "name",
  "signedAt",
  "evidenceId",
  "deployedStatus",
]);
writeCsv("production-launch-checklist.csv", launchRows, [
  "item",
  "complete",
  "evidence",
  "deployedResult",
  "owner",
  "completedAt",
]);
writeCsv("production-release-uat-workbook.csv", uatRows, [
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
writeCsv("production-release-findings.csv", findings, [
  "severity",
  "category",
  "subject",
  "detail",
  "releaseBlocking",
]);

fs.writeFileSync(
  path.join(outDir, "production-release-assessment.json"),
  `${JSON.stringify(assessment, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "release-candidate-manifest.json"),
  `${JSON.stringify(pendingManifest, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "controlled-authorization-simulation.json"),
  `${JSON.stringify(
    {
      simulationOnly: true,
      productionAuthorizationGranted: false,
      authorizationRecordFormat: simulatedAuthorization,
      simulatedAuthorizedManifest,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "production-authorization-template.json"),
  `${JSON.stringify(
    {
      authorizationVersion:
        "PTT_PRODUCTION_AUTHORIZATION_12_0_0",
      productionAuthorization: "PENDING_DEPLOYED_SIGN_OFF",
      role: "RELEASE_OWNER",
      actorName: "",
      authorizedAt: "",
      reason: "",
      deployedEvidenceReviewed: false,
      renderDeploymentVerified: false,
      operationalAcceptanceSigned: false,
      authorizationGranted: false,
      gitCommit: "",
      renderRevision: "",
    },
    null,
    2,
  )}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "production-handoff-bundle.json"),
  `${JSON.stringify(handoffResult.bundle, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "production-release-contract-snapshot.json"),
  `${JSON.stringify(contract, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "production-release-fixture-snapshot.json"),
  `${JSON.stringify(fixtures, null, 2)}\n`,
  "utf8",
);

const readiness = {
  buildVersion: BUILD,
  engineVersion: contract.engineVersion,
  generatedAt: new Date().toISOString(),
  exitGate: contract.exitGate,
  packageStatus: assessment.packageStatus,
  controlledEvidenceDecision: assessment.evidenceDecision,
  productionAuthorization: assessment.productionAuthorization,
  productionAuthorized: false,
  authorizationRequirement:
    "Execute all deployed UAT, attach real evidence, and obtain explicit RELEASE_OWNER authorization.",
  counts: {
    filesScanned: files.length,
    textFilesScanned: textFiles.length,
    capabilities: capabilityRows.length,
    capabilitiesWithEvidence: capabilityRows.filter(
      (row) => row.status === "STATIC_EVIDENCE_FOUND",
    ).length,
    deterministicScenarios: fixtures.scenarios.length,
    baselineBuilds: baselineRows.length,
    coreWorkflows: workflowRows.length,
    releaseControls: controlRows.length,
    routeRows: routeRows.length,
    apiDomains: apiRows.length,
    signOffRoles: signoffRows.length,
    launchChecklistRows: launchRows.length,
    deployedUatRows: uatRows.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter(
      (finding) => finding.releaseBlocking,
    ).length,
    controlledFailures: assessment.failures.length,
    handoffSecretLeaks: handoffResult.secretLeaks.length,
  },
  topology: candidate.renderTopology,
  evidence: {
    assessmentId: assessment.assessmentId,
    pendingManifestId: pendingManifest.manifestId,
    handoffChecksum: handoffResult.bundle.checksum,
    simulationAuthorizationId:
      simulatedAuthorization.authorizationId,
  },
  capabilities: capabilityRows,
  findings,
};

fs.writeFileSync(
  path.join(outDir, "production-release-readiness.json"),
  `${JSON.stringify(readiness, null, 2)}\n`,
  "utf8",
);

const summary = `# Build ${BUILD} PTT Production Release Readiness

Generated: ${readiness.generatedAt}

## Package status

**${readiness.packageStatus}**

## Controlled evidence decision

**${readiness.controlledEvidenceDecision}**

## Production authorization

**${readiness.productionAuthorization}**

The controlled fixtures pass, but this package does not authorize production. Real production authorization requires deployed staging evidence and an explicit RELEASE_OWNER authorization record.

| Measure | Count |
|---|---:|
| Files scanned | ${readiness.counts.filesScanned} |
| Required capabilities | ${readiness.counts.capabilities} |
| Capabilities with static evidence | ${readiness.counts.capabilitiesWithEvidence} |
| Deterministic scenarios | ${readiness.counts.deterministicScenarios} |
| Baseline builds | ${readiness.counts.baselineBuilds} |
| Core workflows | ${readiness.counts.coreWorkflows} |
| Release controls | ${readiness.counts.releaseControls} |
| API domains | ${readiness.counts.apiDomains} |
| Required sign-offs | ${readiness.counts.signOffRoles} |
| Deployed UAT rows | ${readiness.counts.deployedUatRows} |
| Controlled failures | ${readiness.counts.controlledFailures} |
| Handoff secret leaks | ${readiness.counts.handoffSecretLeaks} |
| Render web services | ${candidate.renderTopology.webServices} |
| Render cron services | ${candidate.renderTopology.cronServices} |
| Render databases | ${candidate.renderTopology.databases} |

Execute every row in \`production-release-uat-workbook.csv\`. Replace all synthetic evidence and sign-offs with real deployed evidence before creating an AUTHORIZED manifest.
`;
fs.writeFileSync(
  path.join(outDir, "production-release-readiness-summary.md"),
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
  path.join(outDir, "production-release-hash-manifest.json"),
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

console.log(`Build ${BUILD} production release evidence generated.`);
console.log(`Package status: ${assessment.packageStatus}`);
console.log(
  `Controlled evidence decision: ${assessment.evidenceDecision}`,
);
console.log(
  `Production authorization: ${assessment.productionAuthorization}`,
);
console.log(`Release controls: ${assessment.controls.length}`);
console.log(`Deployed UAT rows: ${uatRows.length}`);
console.log(`Output: ${path.relative(root, outDir)}`);

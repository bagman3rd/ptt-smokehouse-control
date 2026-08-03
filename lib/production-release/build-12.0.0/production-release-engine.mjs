import crypto from "node:crypto";

export const PRODUCTION_RELEASE_VERSION =
  "PTT_PRODUCTION_RELEASE_12_0_0";

export const PRODUCTION_RELEASE_WORKFLOWS = Object.freeze([
  "SETUP_MASTER_DATA",
  "FORECAST_DEMAND",
  "PRODUCTION_SMOKER_SCHEDULING",
  "TODAY_OPERATIONS",
  "QUICK_EOD",
  "INVENTORY_WASTE_EXCEPTIONS",
  "REPORTING_FORECAST_LEARNING",
  "NOTIFICATIONS_ADMINISTRATION",
]);

export const PRODUCTION_SIGNOFF_ROLES = Object.freeze([
  "RELEASE_OWNER",
  "OPERATIONS_OWNER",
  "SECURITY_TESTER",
  "QA_TESTER",
  "RECOVERY_TESTER",
]);

const ALLOWED_LAB_EXPOSURE = new Set(["DISABLED", "ADMIN_ONLY"]);
const REDACTED = "[REDACTED]";
const SECRET_PATTERNS = [
  "password",
  "pin",
  "secret",
  "token",
  "authorization",
  "cookie",
  "api_key",
  "apikey",
  "private_key",
  "database_url",
];

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
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(value[key])}`,
    )
    .join(",")}}`;
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(
      typeof value === "string" ? value : stableStringify(value),
    )
    .digest("hex");
}

function text(value) {
  return String(value ?? "").trim();
}

function finite(value, field, minimum = undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ProductionReleaseValidationError(
      field,
      `${field} must be a finite number.`,
    );
  }
  if (minimum !== undefined && number < minimum) {
    throw new ProductionReleaseValidationError(
      field,
      `${field} must be at least ${minimum}.`,
    );
  }
  return number;
}

function control(
  domain,
  name,
  passed,
  actual,
  expected,
  message,
  evidenceIds = [],
) {
  return {
    domain,
    control: name,
    passed: Boolean(passed),
    actual,
    expected,
    message,
    evidenceIds: [...new Set((evidenceIds || []).filter(Boolean))],
  };
}

function requiredString(value, field) {
  const normalized = text(value);
  if (!normalized) {
    throw new ProductionReleaseValidationError(
      field,
      `${field} is required.`,
    );
  }
  return normalized;
}

function keyIsSecret(key) {
  const normalized = String(key).toLowerCase().replaceAll("-", "_");
  return SECRET_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

function sanitize(value, key = "") {
  if (key && keyIsSecret(key)) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === "object") {
    const output = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      output[childKey] = sanitize(childValue, childKey);
    }
    return output;
  }
  return value;
}

function findLeaks(value, path = []) {
  const leaks = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      leaks.push(...findLeaks(item, [...path, String(index)]));
    });
    return leaks;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (keyIsSecret(key) && child !== REDACTED) {
        leaks.push({
          path: [...path, key].join("."),
          valueType: typeof child,
        });
      }
      leaks.push(...findLeaks(child, [...path, key]));
    }
  }
  return leaks;
}

function workflowControls(candidate, contract) {
  const controls = [];
  for (const workflow of contract.coreWorkflows) {
    const row = candidate.workflowEvidence?.[workflow];
    const prefix = `workflow.${workflow}`;
    controls.push(
      control(
        "WORKFLOW",
        `${prefix}.exists`,
        Boolean(row),
        Boolean(row),
        true,
        `${workflow} evidence exists.`,
        row?.evidenceIds,
      ),
    );
    if (!row) continue;
    const fields = [
      ["routeIntegrated", "Core workflow is integrated into normal navigation."],
      [
        "durablePersistenceVerified",
        "Core workflow durable database persistence is verified.",
      ],
      [
        "serverAuthorizationVerified",
        "Core workflow authorization is verified server-side.",
      ],
      [
        "tenantIsolationVerified",
        "Core workflow tenant isolation is verified.",
      ],
      [
        "idempotencyVerified",
        "Core workflow mutation idempotency is verified.",
      ],
      [
        "auditVerified",
        "Core workflow audit evidence is verified.",
      ],
      ["uatPassed", "Core workflow deployed UAT passed."],
    ];
    for (const [field, message] of fields) {
      controls.push(
        control(
          "WORKFLOW",
          `${prefix}.${field}`,
          row[field] === true,
          row[field],
          true,
          message,
          row.evidenceIds,
        ),
      );
    }
    controls.push(
      control(
        "WORKFLOW",
        `${prefix}.openP0`,
        finite(row.openP0 ?? 0, `${prefix}.openP0`, 0) === 0,
        row.openP0 ?? 0,
        0,
        `${workflow} has no open P0 defect.`,
        row.evidenceIds,
      ),
      control(
        "WORKFLOW",
        `${prefix}.openP1`,
        finite(row.openP1 ?? 0, `${prefix}.openP1`, 0) === 0,
        row.openP1 ?? 0,
        0,
        `${workflow} has no open P1 defect.`,
        row.evidenceIds,
      ),
    );
  }
  return controls;
}

function baselineControls(candidate, contract) {
  return contract.requiredBuilds.map((build) => {
    const row = candidate.baselineBuilds?.[build];
    return control(
      "BASELINE",
      `baselineBuilds.${build}`,
      row?.status === "PASS" &&
        Boolean(text(row?.artifactId)) &&
        Boolean(text(row?.evidenceHash)),
      row?.status || "MISSING",
      "PASS with artifact ID and evidence hash",
      `Build ${build} baseline evidence is complete.`,
      [row?.artifactId, row?.evidenceHash],
    );
  });
}

function routeControls(candidate, contract) {
  const routeEvidence = candidate.routeEvidence || {};
  const available = new Set(routeEvidence.availableRoutes || []);
  const normal = new Set(routeEvidence.normalNavigationRoutes || []);
  const controls = [];

  for (const route of contract.requiredRoutes) {
    controls.push(
      control(
        "NAVIGATION",
        `requiredRoutes.${route}`,
        available.has(route),
        available.has(route),
        true,
        `${route} exists.`,
        [route],
      ),
      control(
        "NAVIGATION",
        `normalNavigation.${route}`,
        normal.has(route),
        normal.has(route),
        true,
        `${route} is reachable through normal navigation.`,
        [route],
      ),
    );
  }

  const deadLinks = routeEvidence.deadLinks || [];
  controls.push(
    control(
      "NAVIGATION",
      "deadLinks",
      deadLinks.length === 0,
      deadLinks.length,
      0,
      "Normal navigation has no unresolved internal link.",
      deadLinks,
    ),
  );

  const exposure = routeEvidence.validationRouteExposure || {};
  for (const [route, status] of Object.entries(exposure)) {
    controls.push(
      control(
        "NAVIGATION",
        `validationRouteExposure.${route}`,
        ALLOWED_LAB_EXPOSURE.has(String(status)),
        status,
        "DISABLED or ADMIN_ONLY",
        `${route} is not publicly exposed in production.`,
        [route],
      ),
    );
  }

  return controls;
}

function apiControls(candidate, contract) {
  const controls = [];
  for (const domain of contract.requiredApiDomains) {
    const row = candidate.apiEvidence?.[domain];
    controls.push(
      control(
        "API",
        `api.${domain}.routePresent`,
        row?.routePresent === true,
        row?.routePresent,
        true,
        `${domain} API route is present.`,
      ),
      control(
        "API",
        `api.${domain}.deployedTestPassed`,
        row?.deployedTestPassed === true,
        row?.deployedTestPassed,
        true,
        `${domain} deployed API test passed.`,
      ),
    );
    if (!["HEALTH", "AUTHENTICATION"].includes(domain)) {
      controls.push(
        control(
          "API",
          `api.${domain}.authorizationVerified`,
          row?.authorizationVerified === true,
          row?.authorizationVerified,
          true,
          `${domain} authorization is verified.`,
        ),
        control(
          "API",
          `api.${domain}.tenantIsolationVerified`,
          row?.tenantIsolationVerified === true,
          row?.tenantIsolationVerified,
          true,
          `${domain} tenant isolation is verified.`,
        ),
        control(
          "API",
          `api.${domain}.idempotencyVerified`,
          row?.idempotencyVerified === true,
          row?.idempotencyVerified,
          true,
          `${domain} mutation idempotency is verified.`,
        ),
      );
    }
  }
  return controls;
}

function configurationControls(candidate, contract) {
  const evidence = candidate.configurationEvidence || {};
  const controls = [
    control(
      "CONFIGURATION",
      "NODE_ENV",
      String(evidence.NODE_ENV || "").toLowerCase() ===
        contract.productionConfiguration.nodeEnvironment,
      evidence.NODE_ENV,
      contract.productionConfiguration.nodeEnvironment,
      "Production runtime mode is enabled.",
    ),
    control(
      "CONFIGURATION",
      "debugMode",
      evidence.debugMode === false,
      evidence.debugMode,
      false,
      "Debug mode is disabled.",
    ),
    control(
      "CONFIGURATION",
      "testFixturesEnabled",
      evidence.testFixturesEnabled === false,
      evidence.testFixturesEnabled,
      false,
      "Test fixtures are disabled.",
    ),
    control(
      "CONFIGURATION",
      "sandboxPaymentsEnabled",
      evidence.sandboxPaymentsEnabled === false,
      evidence.sandboxPaymentsEnabled,
      false,
      "Sandbox payment mode is disabled.",
    ),
  ];
  for (const key of contract.productionConfiguration
    .requiredConfigurationPresence) {
    controls.push(
      control(
        "CONFIGURATION",
        `configurationPresence.${key}`,
        evidence.configurationPresence?.[key] === true,
        evidence.configurationPresence?.[key],
        true,
        `${key} configuration is present without exposing its value.`,
      ),
    );
  }
  return controls;
}

function deploymentControls(candidate, contract) {
  const evidence = candidate.deploymentEvidence || {};
  const requirements = [
    ["gitCommitVerified", "Exact Git commit is verified."],
    ["renderRevisionVerified", "Exact Render revision is verified."],
    ["healthEndpointPassed", "Production health endpoint passed."],
    ["databaseReachable", "Production database is reachable."],
    ["httpsPassed", "HTTPS validation passed."],
    ["customDomainPassed", "Custom domain validation passed."],
  ];
  const controls = requirements.map(([field, message]) =>
    control(
      "DEPLOYMENT",
      field,
      evidence[field] === true,
      evidence[field],
      true,
      message,
      [evidence.gitCommit, evidence.renderRevision],
    ),
  );
  controls.push(
    control(
      "DEPLOYMENT",
      "migrationStatus",
      evidence.migrationStatus === contract.deployment.migrationStatus,
      evidence.migrationStatus,
      contract.deployment.migrationStatus,
      "Database migration status is current.",
    ),
    control(
      "DEPLOYMENT",
      "buildIdentity",
      evidence.buildIdentity === contract.buildVersion,
      evidence.buildIdentity,
      contract.buildVersion,
      "Deployed application identifies as Build 12.0.0.",
    ),
  );
  return controls;
}

function topologyControls(candidate, contract) {
  const evidence = candidate.renderTopology || {};
  return [
    control(
      "TOPOLOGY",
      "webServices",
      evidence.webServices === contract.renderTopology.webServices,
      evidence.webServices,
      contract.renderTopology.webServices,
      "Render contains exactly one web service.",
    ),
    control(
      "TOPOLOGY",
      "cronServices",
      evidence.cronServices === contract.renderTopology.cronServices,
      evidence.cronServices,
      contract.renderTopology.cronServices,
      "Render contains zero cron services.",
    ),
    control(
      "TOPOLOGY",
      "databases",
      evidence.databases === contract.renderTopology.databases,
      evidence.databases,
      contract.renderTopology.databases,
      "Render contains exactly one PostgreSQL database.",
    ),
  ];
}

function hardeningControls(candidate) {
  const evidence = candidate.hardeningEvidence || {};
  const fields = [
    "sessionSecurityPassed",
    "requestSecurityPassed",
    "authorizationPassed",
    "tenantIsolationPassed",
    "auditIntegrityPassed",
    "performancePassed",
    "databaseHealthPassed",
    "securityHeadersPassed",
    "rateLimitsPassed",
  ];
  const controls = fields.map((field) =>
    control(
      "HARDENING",
      field,
      evidence[field] === true,
      evidence[field],
      true,
      `${field} is verified.`,
    ),
  );
  controls.push(
    control(
      "HARDENING",
      "openP0",
      finite(evidence.openP0 ?? 0, "hardeningEvidence.openP0", 0) ===
        0,
      evidence.openP0 ?? 0,
      0,
      "Hardening has no open P0 defect.",
    ),
    control(
      "HARDENING",
      "openP1",
      finite(evidence.openP1 ?? 0, "hardeningEvidence.openP1", 0) ===
        0,
      evidence.openP1 ?? 0,
      0,
      "Hardening has no open P1 defect.",
    ),
  );
  return controls;
}

function recoveryControls(candidate, contract) {
  const evidence = candidate.recoveryEvidence || {};
  return [
    control(
      "RECOVERY",
      "verifiedBackupCurrent",
      evidence.verifiedBackupCurrent === true,
      evidence.verifiedBackupCurrent,
      true,
      "A current verified backup exists.",
      [evidence.backupEvidenceId],
    ),
    control(
      "RECOVERY",
      "restoreDrillPassed",
      evidence.restoreDrillPassed === true,
      evidence.restoreDrillPassed,
      true,
      "The restore drill passed.",
      [evidence.restoreEvidenceId],
    ),
    control(
      "RECOVERY",
      "rollbackTestPassed",
      evidence.rollbackTestPassed === true,
      evidence.rollbackTestPassed,
      true,
      "The production rollback rehearsal passed.",
      [evidence.rollbackEvidenceId],
    ),
    control(
      "RECOVERY",
      "dataReconciliationPassed",
      evidence.dataReconciliationPassed === true,
      evidence.dataReconciliationPassed,
      true,
      "Restored data reconciles.",
      [evidence.restoreEvidenceId],
    ),
    control(
      "RECOVERY",
      "rpoHoursObserved",
      finite(
        evidence.rpoHoursObserved,
        "recoveryEvidence.rpoHoursObserved",
        0,
      ) <= contract.dataContinuity.rpoHours,
      evidence.rpoHoursObserved,
      `<= ${contract.dataContinuity.rpoHours}`,
      "Observed recovery point meets RPO.",
    ),
    control(
      "RECOVERY",
      "rtoHoursObserved",
      finite(
        evidence.rtoHoursObserved,
        "recoveryEvidence.rtoHoursObserved",
        0,
      ) <= contract.dataContinuity.rtoHours,
      evidence.rtoHoursObserved,
      `<= ${contract.dataContinuity.rtoHours}`,
      "Observed recovery time meets RTO.",
    ),
  ];
}

function launchControls(candidate) {
  const evidence = candidate.launchEvidence || {};
  const owners = [
    "releaseOwner",
    "operationsOwner",
    "supportOwner",
    "incidentOwner",
  ];
  const controls = owners.map((field) =>
    control(
      "LAUNCH",
      `launchOwners.${field}`,
      Boolean(text(evidence[field])),
      evidence[field] || null,
      "named owner",
      `${field} is assigned.`,
    ),
  );
  const booleans = [
    "openingDayChecklistComplete",
    "firstDayMonitoringPlanComplete",
    "staffTrainingComplete",
    "openingDataLoaded",
  ];
  for (const field of booleans) {
    controls.push(
      control(
        "LAUNCH",
        field,
        evidence[field] === true,
        evidence[field],
        true,
        `${field} is complete.`,
      ),
    );
  }
  controls.push(
    control(
      "LAUNCH",
      "supportRunbook",
      Boolean(text(evidence.supportRunbook)),
      evidence.supportRunbook || null,
      "present",
      "Production support runbook is recorded.",
    ),
    control(
      "LAUNCH",
      "rollbackRunbook",
      Boolean(text(evidence.rollbackRunbook)),
      evidence.rollbackRunbook || null,
      "present",
      "Production rollback runbook is recorded.",
    ),
  );
  return controls;
}

function signoffControls(candidate, contract) {
  return contract.signOffRoles.map((role) => {
    const row = candidate.signOffs?.[role];
    return control(
      "SIGNOFF",
      `signOffs.${role}`,
      row?.signed === true &&
        Boolean(text(row?.name)) &&
        Boolean(text(row?.signedAt)) &&
        Boolean(text(row?.evidenceId)),
      row?.signed === true ? "SIGNED" : "MISSING",
      "SIGNED with name, timestamp, and evidence ID",
      `${role} sign-off is complete.`,
      [row?.evidenceId],
    );
  });
}

function defectControls(candidate, contract) {
  const defects = candidate.defects || {};
  return [
    control(
      "DEFECT",
      "openP0",
      finite(defects.openP0 ?? 0, "defects.openP0", 0) <=
        contract.releaseGate.openP0Allowed,
      defects.openP0 ?? 0,
      contract.releaseGate.openP0Allowed,
      "No open P0 defect remains.",
    ),
    control(
      "DEFECT",
      "openP1",
      finite(defects.openP1 ?? 0, "defects.openP1", 0) <=
        contract.releaseGate.openP1Allowed,
      defects.openP1 ?? 0,
      contract.releaseGate.openP1Allowed,
      "No open P1 defect remains.",
    ),
  ];
}

export class ProductionReleaseValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ProductionReleaseValidationError";
    this.field = field;
  }
}

export function assessProductionRelease(candidateInput, contractInput) {
  const candidate = clone(candidateInput || {});
  const contract = clone(contractInput || {});

  requiredString(contract.buildVersion, "contract.buildVersion");
  requiredString(contract.engineVersion, "contract.engineVersion");
  const identity = candidate.releaseIdentity || {};
  const identityControls = [
    control(
      "IDENTITY",
      "buildVersion",
      identity.buildVersion === contract.buildVersion,
      identity.buildVersion,
      contract.buildVersion,
      "Release candidate build identity is correct.",
      [identity.gitCommit, identity.renderRevision],
    ),
    control(
      "IDENTITY",
      "gitCommit",
      Boolean(text(identity.gitCommit)),
      identity.gitCommit || null,
      "present",
      "Release candidate Git commit is recorded.",
      [identity.gitCommit],
    ),
    control(
      "IDENTITY",
      "renderRevision",
      Boolean(text(identity.renderRevision)),
      identity.renderRevision || null,
      "present",
      "Release candidate Render revision is recorded.",
      [identity.renderRevision],
    ),
    control(
      "IDENTITY",
      "environment",
      ["STAGING", "PRODUCTION"].includes(
        String(identity.environment || "").toUpperCase(),
      ),
      identity.environment,
      "STAGING or PRODUCTION",
      "Release candidate environment is controlled.",
    ),
  ];

  const controls = [
    ...identityControls,
    ...baselineControls(candidate, contract),
    ...workflowControls(candidate, contract),
    ...routeControls(candidate, contract),
    ...apiControls(candidate, contract),
    ...configurationControls(candidate, contract),
    ...deploymentControls(candidate, contract),
    ...topologyControls(candidate, contract),
    ...hardeningControls(candidate),
    ...recoveryControls(candidate, contract),
    ...launchControls(candidate),
    ...signoffControls(candidate, contract),
    ...defectControls(candidate, contract),
  ];

  const failures = controls.filter((row) => !row.passed);
  const evidenceDecision = failures.length === 0 ? "GO" : "HOLD";
  const domainSummary = {};
  for (const row of controls) {
    domainSummary[row.domain] ||= {
      controls: 0,
      passed: 0,
      failed: 0,
    };
    domainSummary[row.domain].controls += 1;
    if (row.passed) domainSummary[row.domain].passed += 1;
    else domainSummary[row.domain].failed += 1;
  }

  const core = {
    assessmentVersion: PRODUCTION_RELEASE_VERSION,
    buildVersion: contract.buildVersion,
    packageStatus: "COMPLETE",
    evidenceDecision,
    productionAuthorization: "PENDING_DEPLOYED_SIGN_OFF",
    productionAuthorizationReason:
      evidenceDecision === "GO"
        ? "Deterministic or collected evidence passes, but production authorization requires explicit deployed sign-off."
        : "Release evidence contains one or more blocking controls.",
    releaseIdentity: clone(identity),
    controls,
    failures,
    domainSummary,
    workflowCount: contract.coreWorkflows.length,
    requiredBuildCount: contract.requiredBuilds.length,
    generatedFromEvidenceHash: sha256(candidate),
  };

  return {
    ...core,
    assessmentId: `release-assessment-${sha256(core).slice(0, 16)}`,
  };
}

export function authorizeProductionRelease(
  assessmentInput,
  authorizationInput,
) {
  const assessment = clone(assessmentInput || {});
  const authorization = clone(authorizationInput || {});
  if (
    assessment.assessmentVersion !== PRODUCTION_RELEASE_VERSION ||
    assessment.evidenceDecision !== "GO" ||
    assessment.failures?.length
  ) {
    throw new ProductionReleaseValidationError(
      "assessment",
      "Production authorization requires a passing Build 12.0.0 release assessment.",
    );
  }
  if (authorization.role !== "RELEASE_OWNER") {
    throw new ProductionReleaseValidationError(
      "authorization.role",
      "Only the RELEASE_OWNER can authorize production.",
    );
  }
  const required = [
    "deployedEvidenceReviewed",
    "renderDeploymentVerified",
    "operationalAcceptanceSigned",
    "authorizationGranted",
  ];
  for (const field of required) {
    if (authorization[field] !== true) {
      throw new ProductionReleaseValidationError(
        `authorization.${field}`,
        `${field} must be true.`,
      );
    }
  }
  const actorName = requiredString(
    authorization.actorName,
    "authorization.actorName",
  );
  const authorizedAt = requiredString(
    authorization.authorizedAt,
    "authorization.authorizedAt",
  );
  const reason = requiredString(
    authorization.reason,
    "authorization.reason",
  );

  const core = {
    authorizationVersion:
      "PTT_PRODUCTION_AUTHORIZATION_12_0_0",
    assessmentId: assessment.assessmentId,
    buildVersion: assessment.buildVersion,
    evidenceDecision: assessment.evidenceDecision,
    productionAuthorization: "AUTHORIZED",
    actorName,
    role: "RELEASE_OWNER",
    authorizedAt,
    reason,
    gitCommit: assessment.releaseIdentity.gitCommit,
    renderRevision: assessment.releaseIdentity.renderRevision,
    deployedEvidenceReviewed: true,
    renderDeploymentVerified: true,
    operationalAcceptanceSigned: true,
  };
  return {
    ...core,
    authorizationId: `production-authorization-${sha256(core).slice(
      0,
      16,
    )}`,
  };
}

export function createProductionReleaseManifest(
  assessmentInput,
  authorizationInput = null,
) {
  const assessment = clone(assessmentInput || {});
  if (assessment.assessmentVersion !== PRODUCTION_RELEASE_VERSION) {
    throw new ProductionReleaseValidationError(
      "assessment",
      "Manifest requires a Build 12.0.0 release assessment.",
    );
  }
  const authorization = authorizationInput
    ? clone(authorizationInput)
    : null;
  const authorized =
    authorization?.authorizationVersion ===
      "PTT_PRODUCTION_AUTHORIZATION_12_0_0" &&
    authorization.productionAuthorization === "AUTHORIZED" &&
    authorization.assessmentId === assessment.assessmentId;

  const core = {
    manifestVersion: "PTT_PRODUCTION_RELEASE_MANIFEST_12_0_0",
    buildVersion: assessment.buildVersion,
    assessmentId: assessment.assessmentId,
    evidenceDecision: assessment.evidenceDecision,
    productionAuthorization: authorized
      ? "AUTHORIZED"
      : assessment.productionAuthorization,
    authorizationId: authorized
      ? authorization.authorizationId
      : null,
    gitCommit: assessment.releaseIdentity.gitCommit,
    renderRevision: assessment.releaseIdentity.renderRevision,
    environment: assessment.releaseIdentity.environment,
    generatedFromEvidenceHash:
      assessment.generatedFromEvidenceHash,
    passedControlCount: assessment.controls.filter(
      (row) => row.passed,
    ).length,
    failedControlCount: assessment.failures.length,
    domainSummary: clone(assessment.domainSummary),
    scope: {
      restaurant: "Pigeon Toed Tavern",
      application: "PTT Smokehouse Control",
      renderTopology: {
        webServices: 1,
        cronServices: 0,
        databases: 1,
      },
    },
  };
  return {
    ...core,
    manifestId: `production-release-${sha256(core).slice(0, 20)}`,
  };
}

export function createProductionHandoffBundle(input) {
  const sanitized = sanitize(clone(input || {}));
  const core = {
    bundleVersion: "PTT_PRODUCTION_HANDOFF_12_0_0",
    generatedAt: text(input?.generatedAt),
    releaseManifest: sanitized.releaseManifest || {},
    launchOwners: sanitized.launchOwners || {},
    openingChecklist: sanitized.openingChecklist || {},
    supportPlan: sanitized.supportPlan || {},
    recoveryPlan: sanitized.recoveryPlan || {},
    firstDayMonitoring: sanitized.firstDayMonitoring || {},
    knownLimitations: sanitized.knownLimitations || [],
    environmentPresence: sanitized.environmentPresence || {},
  };
  const bundle = {
    ...core,
    checksum: sha256(core),
  };
  return {
    bundle,
    secretLeaks: findLeaks(bundle),
  };
}

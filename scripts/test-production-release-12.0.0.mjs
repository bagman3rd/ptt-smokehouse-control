#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  ProductionReleaseValidationError,
  assessProductionRelease,
  authorizeProductionRelease,
  createProductionHandoffBundle,
  createProductionReleaseManifest,
} from "../lib/production-release/build-12.0.0/production-release-engine.mjs";

const root = process.cwd();
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
function assess(candidate = fixtures.releaseCandidate) {
  return assessProductionRelease(clone(candidate), contract);
}
function hasFailure(assessment, fragment) {
  return assessment.failures.some((row) =>
    row.control.includes(fragment),
  );
}
function holdWith(candidate, fragment, message) {
  const assessment = assess(candidate);
  pass(assessment.evidenceDecision === "HOLD", `${message} produces HOLD`);
  pass(hasFailure(assessment, fragment), `${message} names ${fragment}`);
  return assessment;
}

// PR-001 and PR-002.
const base = assess();
pass(base.evidenceDecision === "GO", "PR-001: complete controlled release evidence produces GO");
pass(base.failures.length === 0, "PR-001: controlled GO has no failed control");
pass(
  base.productionAuthorization === "PENDING_DEPLOYED_SIGN_OFF",
  "PR-002: deterministic GO leaves production authorization pending",
);
pass(
  base.productionAuthorizationReason.includes("explicit deployed sign-off"),
  "PR-002: pending authorization reason is explicit",
);

// PR-003.
const missingBaseline = clone(fixtures.releaseCandidate);
delete missingBaseline.baselineBuilds["11.4.0"];
holdWith(missingBaseline, "baselineBuilds.11.4.0", "PR-003: missing baseline build");

// PR-004.
const missingRoute = clone(fixtures.releaseCandidate);
missingRoute.routeEvidence.availableRoutes =
  missingRoute.routeEvidence.availableRoutes.filter(
    (route) => route !== "/inventory",
  );
holdWith(missingRoute, "requiredRoutes./inventory", "PR-004: missing required route");

// PR-005.
const deadLink = clone(fixtures.releaseCandidate);
deadLink.routeEvidence.deadLinks = ["/broken-production-link"];
holdWith(deadLink, "deadLinks", "PR-005: dead navigation link");

// PR-006.
const publicLab = clone(fixtures.releaseCandidate);
publicLab.routeEvidence.validationRouteExposure[
  "/hardening-lab-1190"
] = "PUBLIC";
holdWith(
  publicLab,
  "validationRouteExposure./hardening-lab-1190",
  "PR-006: public validation lab",
);

// PR-007.
const missingPersistence = clone(fixtures.releaseCandidate);
missingPersistence.workflowEvidence.QUICK_EOD.durablePersistenceVerified =
  false;
holdWith(
  missingPersistence,
  "workflow.QUICK_EOD.durablePersistenceVerified",
  "PR-007: missing durable workflow persistence",
);

// PR-008.
const authFailure = clone(fixtures.releaseCandidate);
authFailure.workflowEvidence.TODAY_OPERATIONS.serverAuthorizationVerified =
  false;
holdWith(
  authFailure,
  "workflow.TODAY_OPERATIONS.serverAuthorizationVerified",
  "PR-008: workflow authorization failure",
);

// PR-009.
const tenantFailure = clone(fixtures.releaseCandidate);
tenantFailure.workflowEvidence.INVENTORY_WASTE_EXCEPTIONS.tenantIsolationVerified =
  false;
holdWith(
  tenantFailure,
  "workflow.INVENTORY_WASTE_EXCEPTIONS.tenantIsolationVerified",
  "PR-009: workflow tenant-isolation failure",
);

// PR-010.
const uatFailure = clone(fixtures.releaseCandidate);
uatFailure.workflowEvidence.REPORTING_FORECAST_LEARNING.uatPassed = false;
holdWith(
  uatFailure,
  "workflow.REPORTING_FORECAST_LEARNING.uatPassed",
  "PR-010: workflow UAT failure",
);

// PR-011.
const sandbox = clone(fixtures.releaseCandidate);
sandbox.configurationEvidence.sandboxPaymentsEnabled = true;
holdWith(sandbox, "sandboxPaymentsEnabled", "PR-011: sandbox configuration");

// PR-012.
const missingConfig = clone(fixtures.releaseCandidate);
missingConfig.configurationEvidence.configurationPresence.APP_SESSION_TOKEN =
  false;
holdWith(
  missingConfig,
  "configurationPresence.APP_SESSION_TOKEN",
  "PR-012: missing required configuration",
);

// PR-013.
const healthFailure = clone(fixtures.releaseCandidate);
healthFailure.deploymentEvidence.healthEndpointPassed = false;
holdWith(
  healthFailure,
  "healthEndpointPassed",
  "PR-013: health endpoint failure",
);

// PR-014.
const migrationDrift = clone(fixtures.releaseCandidate);
migrationDrift.deploymentEvidence.migrationStatus = "DRIFTED";
holdWith(migrationDrift, "migrationStatus", "PR-014: migration drift");

// PR-015.
const cronTopology = clone(fixtures.releaseCandidate);
cronTopology.renderTopology.cronServices = 1;
holdWith(cronTopology, "cronServices", "PR-015: Render cron service");

// PR-016.
const securityFailure = clone(fixtures.releaseCandidate);
securityFailure.hardeningEvidence.sessionSecurityPassed = false;
holdWith(
  securityFailure,
  "sessionSecurityPassed",
  "PR-016: security failure",
);

// PR-017.
const performanceFailure = clone(fixtures.releaseCandidate);
performanceFailure.hardeningEvidence.performancePassed = false;
holdWith(
  performanceFailure,
  "performancePassed",
  "PR-017: performance failure",
);

// PR-018.
const backupFailure = clone(fixtures.releaseCandidate);
backupFailure.recoveryEvidence.verifiedBackupCurrent = false;
holdWith(
  backupFailure,
  "verifiedBackupCurrent",
  "PR-018: unverified backup",
);

// PR-019.
const restoreFailure = clone(fixtures.releaseCandidate);
restoreFailure.recoveryEvidence.restoreDrillPassed = false;
holdWith(
  restoreFailure,
  "restoreDrillPassed",
  "PR-019: restore drill failure",
);

// PR-020.
const rollbackFailure = clone(fixtures.releaseCandidate);
rollbackFailure.recoveryEvidence.rollbackTestPassed = false;
holdWith(
  rollbackFailure,
  "rollbackTestPassed",
  "PR-020: rollback failure",
);

// PR-021.
const ownerFailure = clone(fixtures.releaseCandidate);
ownerFailure.launchEvidence.supportOwner = "";
holdWith(
  ownerFailure,
  "launchOwners.supportOwner",
  "PR-021: missing launch owner",
);

// PR-022.
const signoffFailure = clone(fixtures.releaseCandidate);
signoffFailure.signOffs.RECOVERY_TESTER.signed = false;
holdWith(
  signoffFailure,
  "signOffs.RECOVERY_TESTER",
  "PR-022: missing sign-off",
);

// PR-023.
const defectFailure = clone(fixtures.releaseCandidate);
defectFailure.defects.openP1 = 1;
holdWith(defectFailure, "openP1", "PR-023: open P1 defect");

// PR-024.
const authorization = authorizeProductionRelease(base, {
  role: "RELEASE_OWNER",
  actorName: "Release Owner",
  authorizedAt: "2026-08-05T15:00:00.000Z",
  reason: "Deployed evidence and operational acceptance reviewed",
  deployedEvidenceReviewed: true,
  renderDeploymentVerified: true,
  operationalAcceptanceSigned: true,
  authorizationGranted: true,
});
pass(
  authorization.productionAuthorization === "AUTHORIZED",
  "PR-024: explicit deployed sign-off authorizes production",
);
pass(
  authorization.authorizationVersion ===
    "PTT_PRODUCTION_AUTHORIZATION_12_0_0",
  "PR-024: authorization uses controlled record version",
);

let unauthorizedRoleError = null;
try {
  authorizeProductionRelease(base, {
    role: "QA_TESTER",
    actorName: "QA Tester",
    authorizedAt: "2026-08-05T15:00:00.000Z",
    reason: "Unauthorized attempt",
    deployedEvidenceReviewed: true,
    renderDeploymentVerified: true,
    operationalAcceptanceSigned: true,
    authorizationGranted: true,
  });
} catch (error) {
  unauthorizedRoleError = error;
}
pass(
  unauthorizedRoleError instanceof ProductionReleaseValidationError,
  "production authorization rejects an unauthorized role",
);
pass(
  unauthorizedRoleError?.field === "authorization.role",
  "unauthorized role error identifies authorization.role",
);

// PR-025.
const pendingManifestA = createProductionReleaseManifest(base);
const pendingManifestB = createProductionReleaseManifest(assess());
pass(
  pendingManifestA.manifestId === pendingManifestB.manifestId,
  "PR-025: unchanged evidence produces the same release manifest ID",
);
pass(
  pendingManifestA.productionAuthorization ===
    "PENDING_DEPLOYED_SIGN_OFF",
  "pending manifest cannot imply production authorization",
);
const authorizedManifest = createProductionReleaseManifest(
  base,
  authorization,
);
pass(
  authorizedManifest.productionAuthorization === "AUTHORIZED",
  "authorized manifest records explicit production authorization",
);
pass(
  authorizedManifest.authorizationId ===
    authorization.authorizationId,
  "authorized manifest retains authorization ID",
);

// PR-026.
const handoffResult = createProductionHandoffBundle({
  generatedAt: "2026-08-05T15:05:00.000Z",
  releaseManifest: authorizedManifest,
  launchOwners: fixtures.releaseCandidate.launchEvidence,
  openingChecklist: {
    complete: true,
    checklistId: "opening-checklist-1200",
  },
  supportPlan: {
    runbook: "docs/PRODUCTION_SUPPORT_RUNBOOK_12_0_0.md",
    password: "must-not-leak",
  },
  recoveryPlan: {
    rollbackRunbook:
      "docs/PRODUCTION_ROLLBACK_RUNBOOK_12_0_0.md",
    APP_SESSION_TOKEN: "must-not-leak",
  },
  firstDayMonitoring: {
    owner: "Operations Owner",
    active: true,
  },
  environmentPresence: {
    DATABASE_URL: true,
    ADMIN_PASSWORD: true,
    SENTRY_DSN: false,
  },
});
pass(
  handoffResult.secretLeaks.length === 0,
  "PR-026: production handoff bundle has zero secret leaks",
);
const handoffText = JSON.stringify(handoffResult.bundle);
pass(
  handoffText.includes("[REDACTED]"),
  "PR-026: handoff bundle contains explicit redaction markers",
);
pass(
  !handoffText.includes("must-not-leak"),
  "PR-026: probe secret values are absent",
);
pass(
  handoffResult.bundle.checksum.length === 64,
  "PR-026: handoff bundle includes a SHA-256 checksum",
);

// Structural release counts.
pass(
  base.workflowCount === contract.coreWorkflows.length,
  "release assessment covers every core workflow",
);
pass(
  base.requiredBuildCount === contract.requiredBuilds.length,
  "release assessment covers every required baseline build",
);
pass(
  base.controls.length > 100,
  "release assessment evaluates more than one hundred controls",
);
pass(
  base.domainSummary.TOPOLOGY.failed === 0,
  "corrected no-cron topology passes",
);

if (failures.length) {
  console.error(
    `\nBuild 12.0.0 PTT Production Release test failed: ${failures.length} control(s).`,
  );
  process.exit(1);
}

console.log(
  "\nBuild 12.0.0 PTT Production Release fixture test passed.",
);

#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  PRODUCTION_RELEASE_VERSION,
  PRODUCTION_RELEASE_WORKFLOWS,
  PRODUCTION_SIGNOFF_ROLES,
  assessProductionRelease,
  createProductionReleaseManifest,
} from "../lib/production-release/build-12.0.0/production-release-engine.mjs";

const BUILD = "12.0.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-12.0.0");
const failures = [];

function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL — ${message}`);
  }
}
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function exact(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

const contractPath = path.join(
  root,
  "config",
  "production-release-contract-12.0.0.json",
);
const fixturePath = path.join(
  root,
  "config",
  "production-release-fixtures-12.0.0.json",
);

pass(fs.existsSync(contractPath), "production release contract exists");
pass(fs.existsSync(fixturePath), "production release fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturePath)) {
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

pass(contract.buildVersion === BUILD, "contract build version is 12.0.0");
pass(
  contract.engineVersion === PRODUCTION_RELEASE_VERSION,
  "production release engine version is controlled",
);
pass(
  exact(contract.coreWorkflows, PRODUCTION_RELEASE_WORKFLOWS),
  "contract workflows match the engine",
);
pass(
  exact(contract.signOffRoles, PRODUCTION_SIGNOFF_ROLES),
  "contract sign-off roles match the engine",
);
pass(
  contract.requiredBuilds.length === 9 &&
    contract.requiredBuilds[0] === "11.1.0" &&
    contract.requiredBuilds.at(-1) === "11.9.0",
  "release requires the complete 11.1.0 through 11.9.0 evidence chain",
);
pass(
  contract.releaseStatusModel
    .deterministicGoNeverGrantsProductionAuthorization === true,
  "deterministic GO cannot grant production authorization",
);
pass(
  contract.validationRoutePolicy.publicExposureBlocksRelease === true,
  "public validation routes block release",
);
pass(
  contract.renderTopology.webServices === 1 &&
    contract.renderTopology.cronServices === 0 &&
    contract.renderTopology.databases === 1,
  "contract preserves one web, zero cron, and one database",
);
pass(
  contract.workflowRequirements.durableDatabaseWritesRequired === true &&
    contract.workflowRequirements.serverAuthorizationRequired === true &&
    contract.workflowRequirements.tenantIsolationRequired === true,
  "durability, server authorization, and tenant isolation are required",
);
pass(
  contract.releaseGate.openP0Allowed === 0 &&
    contract.releaseGate.openP1Allowed === 0,
  "release permits no open P0/P1 defect",
);
pass(
  fixtures.scenarios.length >= 26,
  "at least twenty-six deterministic production-release scenarios exist",
);

const assessment = assessProductionRelease(
  fixtures.releaseCandidate,
  contract,
);
const pendingManifest = createProductionReleaseManifest(assessment);

pass(
  assessment.packageStatus === "COMPLETE",
  "controlled package status is COMPLETE",
);
pass(
  assessment.evidenceDecision === "GO",
  "controlled evidence decision is GO",
);
pass(
  assessment.productionAuthorization ===
    "PENDING_DEPLOYED_SIGN_OFF",
  "controlled release remains pending deployed sign-off",
);
pass(
  assessment.failures.length === 0,
  "controlled assessment has no failed control",
);
pass(
  assessment.controls.length > 100,
  "controlled assessment contains more than one hundred controls",
);
pass(
  pendingManifest.productionAuthorization ===
    "PENDING_DEPLOYED_SIGN_OFF",
  "pending manifest does not authorize production",
);
pass(
  pendingManifest.scope.renderTopology.cronServices === 0,
  "pending manifest retains zero cron services",
);

const requiredOutputs = [
  "production-release-workbench-route.json",
  "production-release-capability-map.csv",
  "production-release-source-evidence.csv",
  "production-release-known-scenarios.csv",
  "baseline-build-evidence.csv",
  "workflow-production-readiness.csv",
  "production-route-exposure.csv",
  "production-api-readiness.csv",
  "production-release-control-results.csv",
  "production-signoff-register.csv",
  "production-launch-checklist.csv",
  "production-release-uat-workbook.csv",
  "production-release-findings.csv",
  "production-release-assessment.json",
  "release-candidate-manifest.json",
  "controlled-authorization-simulation.json",
  "production-authorization-template.json",
  "production-handoff-bundle.json",
  "production-release-contract-snapshot.json",
  "production-release-fixture-snapshot.json",
  "production-release-readiness.json",
  "production-release-readiness-summary.md",
  "production-release-hash-manifest.json",
];

for (const name of requiredOutputs) {
  pass(
    fs.existsSync(path.join(outDir, name)),
    `required output exists: ${name}`,
  );
}

const routeRecordPath = path.join(
  outDir,
  "production-release-workbench-route.json",
);
if (fs.existsSync(routeRecordPath)) {
  const route = JSON.parse(fs.readFileSync(routeRecordPath, "utf8"));
  pass(
    route.buildVersion === BUILD,
    "release route record uses Build 12.0.0",
  );
  pass(
    route.route.startsWith("/release-lab-1200"),
    "release workbench uses an isolated route",
  );
  pass(
    route.requiredProductionExposure ===
      "ADMIN_ONLY_OR_DISABLED",
    "release route records the production exposure requirement",
  );
  const pageSource = path.join(root, route.pageSource);
  const componentSource = path.join(root, route.componentSource);
  pass(fs.existsSync(pageSource), "release workbench page exists");
  pass(
    fs.existsSync(componentSource),
    "release workbench component exists",
  );
  if (fs.existsSync(pageSource)) {
    pass(
      fs
        .readFileSync(pageSource, "utf8")
        .includes("BUILD_12_0_0_GENERATED"),
      "release page contains generated marker",
    );
  }
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(componentSource, "utf8");
    pass(
      source.includes("PTT Production Release"),
      "release workbench has the correct title",
    );
    pass(
      source.includes("A deterministic GO never authorizes production"),
      "release workbench states the authorization boundary",
    );
    pass(
      source.includes("must be disabled or ADMIN-only"),
      "release workbench states the route exposure requirement",
    );
    pass(
      source.includes("Copy pending-sign-off manifest"),
      "release workbench generates a pending manifest",
    );
    pass(
      source.includes("Copy simulated authorization"),
      "release workbench labels authorization as simulated",
    );
  }
}

const readinessPath = path.join(
  outDir,
  "production-release-readiness.json",
);
if (fs.existsSync(readinessPath)) {
  const readiness = JSON.parse(
    fs.readFileSync(readinessPath, "utf8"),
  );
  pass(
    readiness.buildVersion === BUILD,
    "release readiness uses Build 12.0.0",
  );
  pass(
    readiness.packageStatus === "COMPLETE",
    "release package is complete",
  );
  pass(
    readiness.controlledEvidenceDecision === "GO",
    "controlled readiness evidence is GO",
  );
  pass(
    readiness.productionAuthorization ===
      "PENDING_DEPLOYED_SIGN_OFF" &&
      readiness.productionAuthorized === false,
    "readiness explicitly denies automatic production authorization",
  );
  pass(
    readiness.counts.deterministicScenarios ===
      fixtures.scenarios.length,
    "readiness scenario count matches fixtures",
  );
  pass(
    readiness.counts.baselineBuilds === 9,
    "readiness includes nine baseline builds",
  );
  pass(
    readiness.counts.coreWorkflows === 8,
    "readiness includes eight core workflows",
  );
  pass(
    readiness.counts.deployedUatRows === 48,
    "readiness includes forty-eight deployed UAT rows",
  );
  pass(
    readiness.counts.controlledFailures === 0,
    "controlled readiness has zero failed control",
  );
  pass(
    readiness.counts.handoffSecretLeaks === 0,
    "handoff bundle has zero secret leaks",
  );
  pass(
    readiness.topology.webServices === 1 &&
      readiness.topology.cronServices === 0 &&
      readiness.topology.databases === 1,
    "readiness records the corrected Render topology",
  );
}

const assessmentPath = path.join(
  outDir,
  "production-release-assessment.json",
);
if (fs.existsSync(assessmentPath)) {
  const value = JSON.parse(fs.readFileSync(assessmentPath, "utf8"));
  pass(
    value.assessmentVersion ===
      "PTT_PRODUCTION_RELEASE_12_0_0",
    "assessment artifact uses the controlled version",
  );
  pass(value.evidenceDecision === "GO", "assessment artifact is GO");
  pass(
    value.productionAuthorization ===
      "PENDING_DEPLOYED_SIGN_OFF",
    "assessment artifact remains pending authorization",
  );
  pass(value.failures.length === 0, "assessment artifact has no failure");
}

const candidateManifestPath = path.join(
  outDir,
  "release-candidate-manifest.json",
);
if (fs.existsSync(candidateManifestPath)) {
  const manifest = JSON.parse(
    fs.readFileSync(candidateManifestPath, "utf8"),
  );
  pass(
    manifest.manifestVersion ===
      "PTT_PRODUCTION_RELEASE_MANIFEST_12_0_0",
    "candidate manifest uses the controlled version",
  );
  pass(
    manifest.productionAuthorization ===
      "PENDING_DEPLOYED_SIGN_OFF",
    "candidate manifest is not production-authorized",
  );
  pass(
    manifest.authorizationId === null,
    "candidate manifest has no authorization ID",
  );
}

const simulationPath = path.join(
  outDir,
  "controlled-authorization-simulation.json",
);
if (fs.existsSync(simulationPath)) {
  const simulation = JSON.parse(
    fs.readFileSync(simulationPath, "utf8"),
  );
  pass(
    simulation.simulationOnly === true,
    "authorization example is explicitly simulation-only",
  );
  pass(
    simulation.productionAuthorizationGranted === false,
    "authorization simulation does not grant production",
  );
}

const templatePath = path.join(
  outDir,
  "production-authorization-template.json",
);
if (fs.existsSync(templatePath)) {
  const template = JSON.parse(
    fs.readFileSync(templatePath, "utf8"),
  );
  pass(
    template.productionAuthorization ===
      "PENDING_DEPLOYED_SIGN_OFF",
    "authorization template starts pending",
  );
  pass(
    template.authorizationGranted === false &&
      template.deployedEvidenceReviewed === false,
    "authorization template contains no pre-approval",
  );
}

const handoffPath = path.join(
  outDir,
  "production-handoff-bundle.json",
);
if (fs.existsSync(handoffPath)) {
  const bundle = JSON.parse(fs.readFileSync(handoffPath, "utf8"));
  const serialized = JSON.stringify(bundle);
  pass(
    bundle.bundleVersion ===
      "PTT_PRODUCTION_HANDOFF_12_0_0",
    "handoff bundle uses the controlled version",
  );
  pass(
    typeof bundle.checksum === "string" &&
      bundle.checksum.length === 64,
    "handoff bundle has a SHA-256 checksum",
  );
  pass(
    serialized.includes("[REDACTED]"),
    "handoff bundle contains redaction markers",
  );
  pass(
    !serialized.includes("probe-secret-not-exported"),
    "handoff bundle contains no probe secret",
  );
}

const manifestPath = path.join(
  outDir,
  "production-release-hash-manifest.json",
);
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  pass(
    manifest.buildVersion === BUILD,
    "release hash manifest uses Build 12.0.0",
  );
  for (const [name, expected] of Object.entries(
    manifest.files || {},
  )) {
    const file = path.join(outDir, name);
    pass(fs.existsSync(file), `hash target exists: ${name}`);
    if (fs.existsSync(file)) {
      pass(
        hash(fs.readFileSync(file)) === expected,
        `hash matches: ${name}`,
      );
    }
  }
}

const renderPath = path.join(root, "render.yaml");
pass(fs.existsSync(renderPath), "render.yaml exists");
if (fs.existsSync(renderPath)) {
  const render = fs.readFileSync(renderPath, "utf8");
  pass(
    /key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"12\.(?:0|1|2)\.0"/m.test(
      render,
    ),
    "Render APP_BUILD_VERSION is compatible with the Build 12.0.0 production baseline",
  );
  pass(
    (render.match(/^\s*-\s*type:\s*web\s*$/gm) || []).length === 1,
    "render.yaml contains one web service",
  );
  pass(
    (render.match(/^\s*-\s*type:\s*cron\s*$/gm) || []).length === 0,
    "render.yaml contains zero cron services",
  );
  pass(
    (render.match(/^\s*runtime:\s*node\s*$/gm) || []).length === 1,
    "the single Render service uses runtime: node",
  );
  pass(
    /databases:\s*[\s\S]*?name:\s*ptt-smokehouse-control-db[\s\S]*?plan:\s*basic-256mb/m.test(
      render,
    ),
    "database plan remains basic-256mb",
  );
}

if (failures.length) {
  console.error(
    `\nBuild ${BUILD} verification failed: ${failures.length} control(s).`,
  );
  process.exit(1);
}

console.log(
  `\nBuild ${BUILD} PTT Production Release verification passed.`,
);

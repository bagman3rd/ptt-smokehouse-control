#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  HARDENING_ROLES,
  RATE_LIMIT_CATEGORIES,
  REQUIRED_SECURITY_HEADERS,
  SECURITY_PERFORMANCE_RECOVERY_VERSION,
  evaluateDatabaseHealth,
  evaluatePerformanceRun,
  evaluateRecoveryReadiness,
  evaluateRequestSecurity,
  evaluateSessionPolicy,
  generateReleaseGateReport,
} from "../lib/security-performance-recovery/build-11.9.0/security-performance-recovery-engine.mjs";

const BUILD = "11.9.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.9.0");
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
  "security-performance-recovery-contract-11.9.0.json",
);
const fixturePath = path.join(
  root,
  "config",
  "security-performance-recovery-fixtures-11.9.0.json",
);

pass(fs.existsSync(contractPath), "hardening contract exists");
pass(fs.existsSync(fixturePath), "hardening fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturePath)) {
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

pass(contract.buildVersion === BUILD, "contract build version is 11.9.0");
pass(
  contract.engineVersion === SECURITY_PERFORMANCE_RECOVERY_VERSION,
  "hardening engine version is controlled",
);
pass(
  exact(contract.authorization.roles, HARDENING_ROLES),
  "contract roles match the engine",
);
pass(
  exact(
    contract.requestSecurity.securityHeadersRequired,
    REQUIRED_SECURITY_HEADERS,
  ),
  "contract security headers match the engine",
);
pass(
  exact(
    Object.keys(contract.requestSecurity.rateLimits),
    RATE_LIMIT_CATEGORIES,
  ),
  "contract rate-limit categories match the engine",
);
pass(
  contract.renderTopology.webServices === 1 &&
    contract.renderTopology.cronServices === 0 &&
    contract.renderTopology.databases === 1,
  "controlled Render topology is one web, zero cron, one database",
);
pass(
  contract.sessionPolicy.privileged2FARequired === true,
  "privileged 2FA is a release-gate requirement",
);
pass(
  contract.authorization.denyByDefault === true &&
    contract.authorization.crossTenantAccessBlocked === true,
  "authorization is deny-by-default and cross-tenant access is blocked",
);
pass(
  contract.auditIntegrity.tamperDetectionRequired === true,
  "audit tamper detection is required",
);
pass(
  contract.performanceBudgets.apiReadP95Ms === 500 &&
    contract.performanceBudgets.criticalMutationP95Ms === 750 &&
    contract.performanceBudgets.dashboardP95Ms === 2000,
  "controlled performance budgets are present",
);
pass(
  contract.recovery.rpoHours === 24 &&
    contract.recovery.rtoHours === 4,
  "controlled RPO and RTO are present",
);
pass(
  contract.releaseGate.openP0Allowed === 0 &&
    contract.releaseGate.openP1Allowed === 0,
  "release gate permits no open P0/P1 defect",
);
pass(
  fixtures.scenarios.length >= 20,
  "at least twenty deterministic hardening scenarios exist",
);

const session = evaluateSessionPolicy(
  fixtures.secureSessionConfig,
  contract.sessionPolicy,
);
const request = evaluateRequestSecurity(
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
const performance = evaluatePerformanceRun(
  fixtures.performanceSamples,
  contract.performanceBudgets,
);
const database = evaluateDatabaseHealth(
  fixtures.databaseSnapshot,
  contract.databaseHealth,
);
const recovery = evaluateRecoveryReadiness(
  fixtures.recoverySnapshot,
  contract.recovery,
);

pass(session.status === "PASS", "controlled session policy passes");
pass(request.status === "ACCEPTED", "controlled request security passes");
pass(performance.status === "PASS", "controlled performance run passes");
pass(database.status === "PASS", "controlled database health passes");
pass(recovery.status === "PASS", "controlled recovery readiness passes");

const requiredOutputs = [
  "hardening-workbench-route.json",
  "hardening-capability-map.csv",
  "hardening-source-evidence.csv",
  "hardening-known-scenarios.csv",
  "security-control-results.csv",
  "authorization-results.csv",
  "rate-limit-trace.csv",
  "audit-chain.csv",
  "performance-budget-results.csv",
  "database-health-results.csv",
  "recovery-readiness-results.csv",
  "release-gate-results.csv",
  "hardening-uat-workbook.csv",
  "hardening-findings.csv",
  "session-assessment.json",
  "request-security-assessment.json",
  "audit-integrity.json",
  "performance-assessment.json",
  "database-assessment.json",
  "recovery-assessment.json",
  "release-gate.json",
  "sanitized-hardening-bundle.json",
  "hardening-contract-snapshot.json",
  "hardening-fixture-snapshot.json",
  "hardening-readiness.json",
  "hardening-readiness-summary.md",
  "hardening-hash-manifest.json",
];

for (const name of requiredOutputs) {
  pass(
    fs.existsSync(path.join(outDir, name)),
    `required output exists: ${name}`,
  );
}

const routeRecordPath = path.join(
  outDir,
  "hardening-workbench-route.json",
);
if (fs.existsSync(routeRecordPath)) {
  const route = JSON.parse(fs.readFileSync(routeRecordPath, "utf8"));
  pass(
    route.buildVersion === BUILD,
    "hardening route record uses Build 11.9.0",
  );
  pass(
    route.route.startsWith("/hardening-lab-1190"),
    "hardening workbench uses an isolated route",
  );
  const pageSource = path.join(root, route.pageSource);
  const componentSource = path.join(root, route.componentSource);
  pass(fs.existsSync(pageSource), "hardening workbench page exists");
  pass(
    fs.existsSync(componentSource),
    "hardening workbench component exists",
  );
  if (fs.existsSync(pageSource)) {
    pass(
      fs
        .readFileSync(pageSource, "utf8")
        .includes("BUILD_11_9_0_GENERATED"),
      "hardening page contains generated marker",
    );
  }
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(componentSource, "utf8");
    pass(
      source.includes("Security, Performance, and Recovery"),
      "hardening workbench has the correct title",
    );
    pass(
      source.includes("does not change production security settings"),
      "hardening workbench does not falsely claim production changes",
    );
    pass(
      source.includes("Release decision:"),
      "hardening workbench exposes GO/HOLD decision",
    );
    pass(
      source.includes("Copy sanitized hardening bundle"),
      "hardening workbench includes sanitized diagnostics",
    );
    pass(
      source.includes("Cron services: 0"),
      "hardening workbench preserves no-cron topology",
    );
  }
}

const readinessPath = path.join(outDir, "hardening-readiness.json");
if (fs.existsSync(readinessPath)) {
  const readiness = JSON.parse(
    fs.readFileSync(readinessPath, "utf8"),
  );
  pass(
    readiness.buildVersion === BUILD,
    "hardening readiness uses Build 11.9.0",
  );
  pass(
    readiness.counts.deterministicScenarios ===
      fixtures.scenarios.length,
    "readiness scenario count matches fixtures",
  );
  pass(
    readiness.counts.uatRows === 34,
    "readiness includes thirty-four deployed UAT rows",
  );
  pass(
    readiness.results.sessionStatus === "PASS" &&
      readiness.results.requestStatus === "ACCEPTED" &&
      readiness.results.auditValid === true,
    "security readiness controls pass",
  );
  pass(
    readiness.results.performanceStatus === "PASS" &&
      readiness.results.databaseStatus === "PASS" &&
      readiness.results.recoveryStatus === "PASS",
    "performance, database, and recovery readiness pass",
  );
  pass(
    readiness.results.releaseDecision === "GO" &&
      readiness.results.releaseFailures === 0,
    "controlled release decision is GO with zero failures",
  );
  pass(
    readiness.results.secretLeakCount === 0,
    "sanitized hardening bundle has zero secret leaks",
  );
  pass(
    readiness.results.renderWebServices === 1 &&
      readiness.results.renderCronServices === 0 &&
      readiness.results.renderDatabases === 1,
    "readiness records the no-cron Render topology",
  );
  pass(
    readiness.findings.every((finding) =>
      ["P0", "P1", "P2", "P3"].includes(finding.severity),
    ),
    "all findings use approved severities",
  );
}

const gatePath = path.join(outDir, "release-gate.json");
if (fs.existsSync(gatePath)) {
  const gate = JSON.parse(fs.readFileSync(gatePath, "utf8"));
  pass(
    gate.gateVersion === "PTT_RELEASE_GATE_11_9_0",
    "release gate uses controlled version",
  );
  pass(gate.decision === "GO", "release-gate evidence is GO");
  pass(gate.failures.length === 0, "release-gate evidence has no failures");
  pass(gate.controls.length === 12, "release gate contains twelve controls");
}

const auditPath = path.join(outDir, "audit-integrity.json");
if (fs.existsSync(auditPath)) {
  const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  pass(audit.valid === true, "audit evidence verifies");
  pass(audit.eventCount === 4, "audit evidence contains four events");
  pass(
    typeof audit.headHash === "string" && audit.headHash.length === 64,
    "audit evidence has a SHA-256 head hash",
  );
}

const bundlePath = path.join(
  outDir,
  "sanitized-hardening-bundle.json",
);
if (fs.existsSync(bundlePath)) {
  const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
  pass(
    bundle.bundleVersion ===
      "PTT_HARDENING_SUPPORT_BUNDLE_11_9_0",
    "sanitized bundle uses controlled version",
  );
  pass(
    typeof bundle.checksum === "string" &&
      bundle.checksum.length === 64,
    "sanitized bundle has a SHA-256 checksum",
  );
  const serialized = JSON.stringify(bundle);
  pass(
    !serialized.includes("never-export"),
    "sanitized bundle contains no probe secret value",
  );
  pass(
    serialized.includes("[REDACTED]"),
    "sanitized bundle contains explicit redaction markers",
  );
}

const manifestPath = path.join(
  outDir,
  "hardening-hash-manifest.json",
);
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  pass(
    manifest.buildVersion === BUILD,
    "hardening hash manifest uses Build 11.9.0",
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
    /key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"(?:11\.9|12\.(?:0|1|2))\.0"/m.test(
      render,
    ),
    "Render APP_BUILD_VERSION is compatible with the Build 11.9.0 hardening baseline",
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
    "the single Render web service uses runtime: node",
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
  `\nBuild ${BUILD} Security, Performance, and Recovery verification passed.`,
);

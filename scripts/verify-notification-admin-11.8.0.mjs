#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  DELIVERY_STATUSES,
  NOTIFICATION_ADMIN_VERSION,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_SEVERITIES,
  SUPPORTED_NOTIFICATION_EVENTS,
  createNotificationAdminState,
  createSanitizedSupportBundle,
  deriveNotificationAdminBoard,
} from "../lib/notification-admin/build-11.8.0/notification-admin-engine.mjs";

const BUILD = "11.8.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.8.0");
const failures = [];
function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else { failures.push(message); console.error(`FAIL — ${message}`); }
}
function hash(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function exact(actual, expected) { return JSON.stringify(actual) === JSON.stringify(expected); }

const contractPath = path.join(root, "config", "notification-admin-contract-11.8.0.json");
const fixturePath = path.join(root, "config", "notification-admin-fixtures-11.8.0.json");
pass(fs.existsSync(contractPath), "notification/admin contract exists");
pass(fs.existsSync(fixturePath), "notification/admin fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturePath)) process.exit(1);
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

pass(contract.buildVersion === BUILD, "contract build version is 11.8.0");
pass(contract.engineVersion === NOTIFICATION_ADMIN_VERSION, "notification/admin engine version is controlled");
pass(exact(contract.channels, NOTIFICATION_CHANNELS), "contract channels match the engine");
pass(exact(contract.deliveryStatuses, DELIVERY_STATUSES), "contract delivery statuses match the engine");
pass(exact(contract.eventSeverities, NOTIFICATION_SEVERITIES), "contract severities match the engine");
pass(exact(contract.supportedEventTypes, SUPPORTED_NOTIFICATION_EVENTS), "contract event types match the engine");
pass(contract.routing.inactiveRecipientExcluded === true, "inactive recipients are excluded");
pass(contract.routing.sameEventRecipientChannelOnlyOnce === true, "same event/recipient/channel routes once");
pass(contract.quietHours.P0BypassesQuietHours === true, "P0 bypasses quiet hours");
pass(exact(contract.retryPolicy.backoffMinutes, [1, 5, 15, 60]), "retry backoff is controlled");
pass(contract.retryPolicy.maximumAttempts === 4, "retry attempts are capped at four");
pass(exact(contract.escalation.P1Minutes, [0, 15, 45]), "P1 escalation schedule is controlled");
pass(contract.escalation.acknowledgementStopsFutureEscalation === true, "acknowledgement stops escalation");
pass(contract.providerHealth.secretValuesMustNeverBeExposed === true, "provider diagnostics cannot expose secrets");
pass(contract.administration.beforeAfterSnapshotsRequired === true, "admin audit requires before/after snapshots");
pass(contract.supportBundle.sanitized === true, "support bundle is sanitized");
pass(fixtures.scenarios.length >= 16, "at least sixteen deterministic scenarios exist");

let baseState = null;
try {
  baseState = createNotificationAdminState({ ...fixtures.tenant, providers: fixtures.providers, rules: fixtures.rules });
} catch (error) {
  pass(false, `base notification state creates: ${error instanceof Error ? error.message : String(error)}`);
}
if (baseState) {
  const board = deriveNotificationAdminBoard(baseState, "2026-08-03T20:00:00.000Z");
  pass(board.providerHealth.length === 3, "base admin board has three provider channels");
  pass(board.activeRecipientCount === 5, "base admin board has five active recipients");
  const unsafe = { ...fixtures.adminSnapshot, password: "never-export", sessionToken: "never-export-token" };
  const bundle = createSanitizedSupportBundle(baseState, unsafe, "2026-08-03T20:01:00.000Z");
  const text = JSON.stringify(bundle);
  pass(!text.includes("never-export") && !text.includes("never-export-token"), "base support bundle excludes secret values");
  pass(typeof bundle.checksum === "string" && bundle.checksum.length === 8, "base support bundle has deterministic checksum");
}

const requiredOutputs = [
  "notification-admin-workbench-route.json",
  "notification-admin-capability-map.csv",
  "notification-admin-source-evidence.csv",
  "notification-admin-known-scenarios.csv",
  "notification-delivery-trace.csv",
  "notification-incident-trace.csv",
  "notification-provider-health.csv",
  "notification-dead-letters.csv",
  "admin-change-audit.csv",
  "notification-admin-uat-workbook.csv",
  "notification-admin-findings.csv",
  "notification-admin-state.json",
  "notification-admin-board.json",
  "sanitized-support-bundle.json",
  "notification-admin-contract-snapshot.json",
  "notification-admin-fixture-snapshot.json",
  "notification-admin-readiness.json",
  "notification-admin-readiness-summary.md",
  "notification-admin-hash-manifest.json",
];
for (const name of requiredOutputs) pass(fs.existsSync(path.join(outDir, name)), `required output exists: ${name}`);

const routePath = path.join(outDir, "notification-admin-workbench-route.json");
if (fs.existsSync(routePath)) {
  const route = JSON.parse(fs.readFileSync(routePath, "utf8"));
  pass(route.buildVersion === BUILD, "workbench route record uses Build 11.8.0");
  pass(route.route.startsWith("/admin-lab-1180"), "workbench uses an isolated route");
  const pageSource = path.join(root, route.pageSource);
  const componentSource = path.join(root, route.componentSource);
  pass(fs.existsSync(pageSource), "notification/admin workbench page exists");
  pass(fs.existsSync(componentSource), "notification/admin workbench component exists");
  if (fs.existsSync(pageSource)) pass(fs.readFileSync(pageSource, "utf8").includes("BUILD_11_8_0_GENERATED"), "workbench page has generated marker");
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(componentSource, "utf8");
    pass(source.includes("Notifications, Administration, and Support Diagnostics"), "workbench has the correct title");
    pass(source.includes("does not call live email or SMS providers"), "workbench does not claim live provider delivery");
    pass(source.includes("Copy sanitized support bundle"), "workbench includes sanitized support bundle control");
    pass(source.includes("Record first retry failure"), "workbench includes retry/dead-letter validation control");
    pass(source.includes("Apply audited setting change"), "workbench includes audited administration control");
  }
}

const readinessPath = path.join(outDir, "notification-admin-readiness.json");
if (fs.existsSync(readinessPath)) {
  const report = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
  pass(report.buildVersion === BUILD, "readiness report uses Build 11.8.0");
  pass(report.counts.deterministicScenarios === fixtures.scenarios.length, "readiness scenario count matches fixtures");
  pass(report.counts.providerRows === 3, "readiness evidence has three providers");
  pass(report.counts.uatRows === 30, "readiness evidence has thirty UAT rows");
  pass(report.counts.deadLetters >= 1, "readiness evidence contains a dead letter");
  pass(report.counts.adminAuditRows >= 2, "readiness evidence contains administration audits");
  pass(report.results.p0DeferredDeliveries === 0, "P0 evidence has no deferred delivery");
  pass(report.results.duplicateSuppressionCount > 0, "duplicate suppression evidence exists");
  pass(report.results.supportBundleSecretLeakCount === 0, "support bundle evidence has zero secret leaks");
  pass(report.findings.every((finding) => ["P0", "P1", "P2", "P3"].includes(finding.severity)), "all findings use approved severities");
}

const statePath = path.join(outDir, "notification-admin-state.json");
if (fs.existsSync(statePath)) {
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  pass(state.engineVersion === NOTIFICATION_ADMIN_VERSION, "state artifact uses the controlled engine version");
  pass(state.deliveries.every((row, index, array) => array.findIndex((other) => other.idempotencyKey === row.idempotencyKey) === index), "delivery artifact has unique idempotency keys");
  pass(state.eventLog.every((row, index) => row.sequence === index + 1), "notification/admin event log is strictly sequenced");
  pass(state.adminAudit.every((row) => row.auditVersion === "PTT_ADMIN_AUDIT_11_8_0"), "all admin audit rows use controlled version");
}

const bundlePath = path.join(outDir, "sanitized-support-bundle.json");
if (fs.existsSync(bundlePath)) {
  const bundleText = fs.readFileSync(bundlePath, "utf8");
  const bundle = JSON.parse(bundleText);
  pass(bundle.bundleVersion === "PTT_SUPPORT_BUNDLE_11_8_0", "support bundle uses controlled version");
  pass(typeof bundle.checksum === "string" && bundle.checksum.length === 8, "support bundle has checksum");
  pass(!bundleText.includes("never-export-this-password") && !bundleText.includes("never-export-this-token") && !bundleText.includes("052208"), "support bundle artifact excludes seeded secrets");
  pass(bundleText.includes("[REDACTED]"), "support bundle artifact contains explicit redaction marker");
}

const manifestPath = path.join(outDir, "notification-admin-hash-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  pass(manifest.buildVersion === BUILD, "hash manifest uses Build 11.8.0");
  for (const [name, expected] of Object.entries(manifest.files || {})) {
    const file = path.join(outDir, name);
    pass(fs.existsSync(file), `hash target exists: ${name}`);
    if (fs.existsSync(file)) pass(hash(fs.readFileSync(file)) === expected, `hash matches: ${name}`);
  }
}

const renderPath = path.join(root, "render.yaml");
pass(fs.existsSync(renderPath), "render.yaml exists");
if (fs.existsSync(renderPath)) {
  const render = fs.readFileSync(renderPath, "utf8");
  pass(/key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"11\.8\.0"/m.test(render), "Render APP_BUILD_VERSION is 11.8.0");
  pass(/databases:\s*[\s\S]*?name:\s*ptt-smokehouse-control-db[\s\S]*?plan:\s*basic-256mb/m.test(render), "database plan remains basic-256mb");
  pass((render.match(/^\s*runtime:\s*node\s*$/gm) || []).length === 1, "the single Render web service uses runtime: node");
}

if (failures.length) {
  console.error(`\nBuild ${BUILD} verification failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log(`\nBuild ${BUILD} Notifications, Administration, and Support Diagnostics verification passed.`);

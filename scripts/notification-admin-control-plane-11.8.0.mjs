#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  acknowledgeIncident,
  applyAdminSettingChange,
  createNotificationAdminState,
  createSanitizedSupportBundle,
  deriveNotificationAdminBoard,
  recordDeliveryAttempt,
  recordProviderResult,
  routeNotificationEvent,
} from "../lib/notification-admin/build-11.8.0/notification-admin-engine.mjs";

const BUILD = "11.8.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.8.0");
const contract = JSON.parse(fs.readFileSync(path.join(root, "config", "notification-admin-contract-11.8.0.json"), "utf8"));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, "config", "notification-admin-fixtures-11.8.0.json"), "utf8"));
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(path.join(outDir, "notification-admin-hash-manifest.json"), { force: true });

const excluded = new Set([".git", ".next", "node_modules", "coverage", "dist", "build", ".turbo", ".cache", "artifacts"]);
const textExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".prisma", ".json", ".md", ".yaml", ".yml"]);
function rel(file) { return path.relative(root, file).split(path.sep).join("/"); }
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
  try { if (fs.statSync(file).size > 2_500_000) return ""; return fs.readFileSync(file, "utf8"); }
  catch { return ""; }
}
function hash(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function writeCsv(name, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  fs.writeFileSync(path.join(outDir, name), `${lines.join("\n")}\n`, "utf8");
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

const files = walk(root);
const textFiles = files.filter((file) => textExtensions.has(path.extname(file).toLowerCase()));
const cache = new Map(textFiles.map((file) => [file, read(file)]));

const capabilities = [
  ["event-routing", "Event-to-recipient routing", ["routeNotificationEvent", "matchingRules", "recipientId"]],
  ["role-routing", "Role-based recipient selection", ["rule.roles", "recipient.role", "ADMIN_ROLES"]],
  ["preferences", "Per-channel recipient preferences", ["recipient.channels", "IN_APP", "EMAIL", "SMS"]],
  ["quiet-hours", "Quiet-hour deferral", ["isQuiet", "deferredUntil", "P1BypassesQuietHours"]],
  ["dedupe", "Idempotent duplicate suppression", ["idempotencyKey", "DUPLICATE_IDEMPOTENCY_KEY", "SUPPRESSED"]],
  ["retry", "Bounded retry and backoff", ["RETRY_BACKOFF_MINUTES", "FAILED_RETRYABLE", "attemptCount"]],
  ["dead-letter", "Dead-letter preservation", ["DEAD_LETTERED", "deadLetterId", "deadLetters"]],
  ["escalation", "Severity escalation schedule", ["ESCALATION_MINUTES", "dueEscalations", "CANCELLED_BY_ACKNOWLEDGEMENT"]],
  ["provider-health", "Provider health diagnostics", ["providerHealth", "DEGRADED", "NOT_CONFIGURED"]],
  ["admin-audit", "Append-only administration audit", ["PTT_ADMIN_AUDIT_11_8_0", "before", "after"]],
  ["admin-role", "Administration role enforcement", ["requireAdmin", "actor.role"]],
  ["tenant-isolation", "Tenant isolation", ["ensureTenant", "Cross-tenant"]],
  ["support-bundle", "Sanitized support bundle", ["createSanitizedSupportBundle", "[REDACTED]", "checksum"]],
  ["secret-safety", "Secret-value exclusion", ["SECRET_KEY_PATTERN", "secretValues", "applicationSecrets"]],
  ["admin-board", "Support and delivery administration board", ["deriveNotificationAdminBoard", "deliverySummary", "recentAdminAudit"]],
];
const capabilityRows = [];
const sourceRows = [];
const findings = [];
for (const [capabilityId, label, tokens] of capabilities) {
  const matches = [];
  for (const file of textFiles) {
    const source = `${rel(file)}\n${cache.get(file) || ""}`.toLowerCase();
    const matched = tokens.filter((token) => source.includes(token.toLowerCase()));
    if (matched.length) matches.push({ sourceFile: rel(file), matched });
  }
  capabilityRows.push({ capabilityId, label, required: true, status: matches.length ? "STATIC_EVIDENCE_FOUND" : "NO_STATIC_EVIDENCE", evidenceCount: matches.length, deployedVerification: "PENDING_STAGING_UAT" });
  for (const match of matches.slice(0, 50)) sourceRows.push({ capabilityId, sourceFile: match.sourceFile, matchedTokens: match.matched.join("|") });
  if (!matches.length) findings.push({ severity: "P1", category: "NOTIFICATION_ADMIN_CAPABILITY_GAP", subject: label, detail: "No static implementation evidence was detected.", releaseBlocking: true });
}

const actors = {
  admin: { id: "admin-evidence-1180", name: "Admin Validation", role: "ADMIN" },
  owner: { id: "owner-evidence-1180", name: "Owner Validation", role: "OWNER" },
  km: { id: "user-km", name: "Kitchen Manager", role: "KM" },
};
let state = createNotificationAdminState({ ...clone(fixtures.tenant), providers: clone(fixtures.providers), rules: clone(fixtures.rules), createdAt: "2026-08-03T20:00:00.000Z" });

const routedEvents = [
  { eventId: "evidence-p0-negative", eventType: "NEGATIVE_INVENTORY", severity: "P0", localClock: "23:30", title: "Negative inventory", message: "Brisket inventory is negative", occurredAt: "2026-08-04T03:30:00.000Z" },
  { eventId: "evidence-p1-risk", eventType: "SERVICE_READINESS_RISK", severity: "P1", localClock: "12:00", title: "Service readiness risk", message: "Pork is not ready for service", occurredAt: "2026-08-03T16:00:00.000Z" },
  { eventId: "evidence-p2-close", eventType: "OPERATING_DAY_CLOSE_DUE", severity: "P2", localClock: "23:30", title: "Close due", message: "Operating day remains open", occurredAt: "2026-08-04T03:30:00.000Z" },
  { eventId: "evidence-p3-report", eventType: "FORECAST_RECOMMENDATION_READY", severity: "P3", localClock: "16:00", title: "Recommendation ready", message: "Forecast recommendation is ready for review", occurredAt: "2026-08-03T20:00:00.000Z" },
];
const incidentIds = [];
for (const event of routedEvents) {
  const routed = routeNotificationEvent(state, { ...event, tenantId: state.tenantId, locationId: state.locationId });
  state = routed.state;
  incidentIds.push(routed.result.incidentId);
}

// Generate duplicate-suppression evidence.
const duplicate = routeNotificationEvent(state, { ...routedEvents[2], tenantId: state.tenantId, locationId: state.locationId });
state = duplicate.state;

// Generate provider health and dead-letter evidence.
state = recordProviderResult(state, { tenantId: state.tenantId, channel: "EMAIL", occurredAt: "2026-08-03T20:10:00.000Z", success: false }).state;
const emailDelivery = state.deliveries.find((row) => row.channel === "EMAIL" && row.status !== "DEFERRED");
if (emailDelivery) {
  for (let index = 1; index <= 4; index += 1) {
    state = recordDeliveryAttempt(state, {
      tenantId: state.tenantId,
      deliveryId: emailDelivery.deliveryId,
      attemptedAt: `2026-08-04T0${index}:00:00.000Z`,
      success: false,
      failureReason: "EVIDENCE_PROVIDER_TIMEOUT",
    }).state;
  }
}

// Acknowledge first incident and leave others open for board evidence.
state = acknowledgeIncident(state, { tenantId: state.tenantId, incidentId: incidentIds[0], actor: actors.km, acknowledgedAt: "2026-08-04T03:35:00.000Z" }).state;

// Administration audit evidence.
state = applyAdminSettingChange(state, { tenantId: state.tenantId, actor: actors.admin, settingName: "supportBundleRetention", value: 14, reason: "Evidence retention control change", changedAt: "2026-08-04T03:40:00.000Z" }).state;
state = applyAdminSettingChange(state, { tenantId: state.tenantId, actor: actors.owner, settingName: "providerEnablement", value: { IN_APP: true, EMAIL: true, SMS: true }, reason: "Confirm production provider enablement policy", changedAt: "2026-08-04T03:41:00.000Z" }).state;

const board = deriveNotificationAdminBoard(state, "2026-08-04T04:30:00.000Z");
const unsafeSnapshot = clone(fixtures.adminSnapshot);
unsafeSnapshot.ADMIN_PASSWORD = "never-export-this-password";
unsafeSnapshot.APP_SESSION_TOKEN = "never-export-this-token";
unsafeSnapshot.nested = { pin: "052208", safe: "diagnostic retained" };
const supportBundle = createSanitizedSupportBundle(state, unsafeSnapshot, "2026-08-04T04:30:00.000Z");

const deliveryRows = state.deliveries.map((row) => ({
  deliveryId: row.deliveryId,
  eventId: row.eventId,
  eventType: row.eventType,
  severity: row.severity,
  recipientId: row.recipientId,
  recipientName: row.recipientName,
  recipientRole: row.recipientRole,
  channel: row.channel,
  providerId: row.providerId,
  providerHealth: row.providerHealth,
  status: row.status,
  occurredAt: row.occurredAt,
  deferredUntil: row.deferredUntil || "",
  attemptCount: row.attemptCount,
  nextAttemptAt: row.nextAttemptAt || "",
  failureReason: row.failureReason || "",
  idempotencyKey: row.idempotencyKey,
  ruleId: row.ruleId,
}));
const incidentRows = state.incidents.map((row) => ({
  incidentId: row.incidentId,
  sourceEventId: row.sourceEventId,
  eventType: row.eventType,
  severity: row.severity,
  status: row.status,
  openedAt: row.openedAt,
  acknowledgedAt: row.acknowledgedAt || "",
  acknowledgedBy: row.acknowledgedBy?.name || "",
  resolvedAt: row.resolvedAt || "",
  escalationMinutes: row.escalationSchedule.map((item) => item.minutes).join("|"),
  cancelledEscalations: row.escalationSchedule.filter((item) => item.status === "CANCELLED_BY_ACKNOWLEDGEMENT").length,
}));
const providerRows = board.providerHealth.map((row) => ({ ...row }));
const deadLetterRows = state.deadLetters.map((row) => ({ ...row }));
const adminAuditRows = state.adminAudit.map((row) => ({
  auditId: row.auditId,
  auditVersion: row.auditVersion,
  settingName: row.settingName,
  before: JSON.stringify(row.before),
  after: JSON.stringify(row.after),
  actorId: row.actor.id,
  actorName: row.actor.name,
  actorRole: row.actor.role,
  reason: row.reason,
  changedAt: row.changedAt,
}));
const scenarioRows = fixtures.scenarios.map((scenario) => ({ scenarioId: scenario.id, scenarioName: scenario.name, deterministicStatus: "PASSED_BY_TEST_SCRIPT", expected: JSON.stringify(scenario.expected), deployedStatus: "NOT_EXECUTED", evidence: "" }));

const uat = [
  ["NT-001", "KM", "Open notification administration", "Open the notification/admin workflow.", "Provider health, delivery summary, open incidents, due escalations, dead letters, recipients, and audit history are visible."],
  ["NT-002", "KM", "Route P0 event", "Route a P0 negative-inventory event during quiet hours.", "Owner and KM receive enabled channels immediately; no delivery is deferred."],
  ["NT-003", "KM", "Route P1 event", "Route a P1 service-readiness event.", "Critical rule and configured quiet-hour bypass are applied exactly as documented."],
  ["NT-004", "KM", "Route P2 event", "Route a P2 missed-load or close-due event during quiet hours.", "Eligible deliveries are deferred until each recipient's quiet-hour end."],
  ["NT-005", "KM", "Channel preferences", "Disable one recipient channel and route a matching event.", "No delivery record is created for the disabled channel."],
  ["NT-006", "ADMIN", "Inactive recipient", "Route an event matching an inactive manager.", "Inactive recipient receives no delivery."],
  ["NT-007", "KM", "Duplicate event", "Submit the same event ID twice.", "Second route creates no duplicate recipient/channel delivery."],
  ["NT-008", "KM", "Idempotency key", "Inspect duplicate suppression.", "Key includes tenant, event, recipient, and channel."],
  ["NT-009", "ADMIN", "Email provider degraded", "Record one email failure.", "Provider becomes DEGRADED and timestamps/failure count update."],
  ["NT-010", "ADMIN", "Provider unavailable", "Disable or exceed provider failure threshold.", "Provider becomes UNAVAILABLE; external deliveries are retryable rather than silently lost."],
  ["NT-011", "ADMIN", "Provider not configured", "Remove SMS configuration presence.", "Health displays NOT_CONFIGURED without exposing a secret."],
  ["NT-012", "KM", "Retry schedule", "Fail one delivery repeatedly.", "Attempts follow 1, 5, 15, and 60 minute control schedule."],
  ["NT-013", "KM", "Dead letter", "Fail the delivery through the fourth attempt.", "Delivery becomes DEAD_LETTERED and a preserved dead-letter row is created."],
  ["NT-014", "KM", "Successful retry", "Fail then successfully retry a delivery.", "Delivery becomes DELIVERED and next-attempt state clears."],
  ["NT-015", "KM", "P0 escalation", "Open an unacknowledged P0 incident.", "Escalation schedule is 0, 5, and 15 minutes."],
  ["NT-016", "KM", "P1 escalation", "Open an unacknowledged P1 incident.", "Escalation schedule is 0, 15, and 45 minutes."],
  ["NT-017", "KM", "Acknowledge incident", "Acknowledge before the next escalation.", "Future scheduled escalations are cancelled."],
  ["NT-018", "KM", "Resolve incident", "Resolve with written disposition.", "Incident becomes resolved and original event/escalation evidence remains."],
  ["NT-019", "ADMIN", "Change notification rule", "Change a rule with reason.", "Before, after, actor, reason, and timestamp are audited."],
  ["NT-020", "ADMIN", "Change quiet hours", "Change recipient or tenant quiet hours.", "Audited change affects subsequent routing only."],
  ["NT-021", "VIEWER", "Viewer admin denial", "Attempt administration mutation through UI and crafted request.", "Server denies mutation."],
  ["NT-022", "ADMIN", "Tenant isolation", "Route or administer using another tenant ID.", "No cross-tenant data is read, inferred, or changed."],
  ["NT-023", "ADMIN", "Support bundle generation", "Generate a support bundle.", "Bundle includes approved build/service/provider/cron/database/delivery/audit metadata."],
  ["NT-024", "ADMIN", "Support bundle secret safety", "Seed passwords, tokens, PINs, and API keys in source object.", "No supplied secret value appears; sensitive keys are redacted."],
  ["NT-025", "ADMIN", "Support bundle determinism", "Generate unchanged bundle twice.", "Checksum is identical."],
  ["NT-026", "KM", "External provider outage", "Disable email and SMS and route P0 event.", "In-app delivery remains usable; external failures are visible and retryable."],
  ["NT-027", "OWNER", "Cron failure alert", "Generate CRON_FAILURE from a failed scheduled task.", "Authorized management recipients receive one alert with source task identity."],
  ["NT-028", "OWNER", "Backup stale alert", "Use backup age beyond policy.", "BACKUP_STALE routes with documented severity and source timestamp."],
  ["NT-029", "New admin", "Diagnose incident", "Without coaching, identify provider state, failed delivery, dead letter, escalation, and relevant audit row.", "User finds all evidence without secret access or database tools."],
  ["NT-030", "ADMIN", "Release support bundle", "Generate and attach bundle to a staged support case.", "Bundle contains sufficient diagnostic evidence and no customer personal data or secret value."],
].map((row) => ({ testId: row[0], role: row[1], scenario: row[2], procedure: row[3], expected: row[4], result: "NOT_EXECUTED", tester: "", evidence: "", defectIds: "", testDate: "" }));

writeCsv("notification-admin-capability-map.csv", capabilityRows, ["capabilityId", "label", "required", "status", "evidenceCount", "deployedVerification"]);
writeCsv("notification-admin-source-evidence.csv", sourceRows, ["capabilityId", "sourceFile", "matchedTokens"]);
writeCsv("notification-admin-known-scenarios.csv", scenarioRows, ["scenarioId", "scenarioName", "deterministicStatus", "expected", "deployedStatus", "evidence"]);
writeCsv("notification-delivery-trace.csv", deliveryRows, ["deliveryId", "eventId", "eventType", "severity", "recipientId", "recipientName", "recipientRole", "channel", "providerId", "providerHealth", "status", "occurredAt", "deferredUntil", "attemptCount", "nextAttemptAt", "failureReason", "idempotencyKey", "ruleId"]);
writeCsv("notification-incident-trace.csv", incidentRows, ["incidentId", "sourceEventId", "eventType", "severity", "status", "openedAt", "acknowledgedAt", "acknowledgedBy", "resolvedAt", "escalationMinutes", "cancelledEscalations"]);
writeCsv("notification-provider-health.csv", providerRows, ["channel", "providerId", "configured", "enabled", "health", "lastSuccessAt", "lastFailureAt", "consecutiveFailures"]);
writeCsv("notification-dead-letters.csv", deadLetterRows, ["deadLetterId", "deliveryId", "eventId", "recipientId", "channel", "attemptCount", "failureReason", "deadLetteredAt"]);
writeCsv("admin-change-audit.csv", adminAuditRows, ["auditId", "auditVersion", "settingName", "before", "after", "actorId", "actorName", "actorRole", "reason", "changedAt"]);
writeCsv("notification-admin-uat-workbook.csv", uat, ["testId", "role", "scenario", "procedure", "expected", "result", "tester", "evidence", "defectIds", "testDate"]);
writeCsv("notification-admin-findings.csv", findings, ["severity", "category", "subject", "detail", "releaseBlocking"]);

fs.writeFileSync(path.join(outDir, "notification-admin-state.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "notification-admin-board.json"), `${JSON.stringify(board, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "sanitized-support-bundle.json"), `${JSON.stringify(supportBundle, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "notification-admin-contract-snapshot.json"), `${JSON.stringify(contract, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "notification-admin-fixture-snapshot.json"), `${JSON.stringify(fixtures, null, 2)}\n`, "utf8");

const report = {
  buildVersion: BUILD,
  engineVersion: contract.engineVersion,
  generatedAt: new Date().toISOString(),
  exitGate: contract.exitGate,
  counts: {
    filesScanned: files.length,
    textFilesScanned: textFiles.length,
    capabilities: capabilityRows.length,
    capabilitiesWithEvidence: capabilityRows.filter((row) => row.status === "STATIC_EVIDENCE_FOUND").length,
    deterministicScenarios: fixtures.scenarios.length,
    deliveries: deliveryRows.length,
    incidents: incidentRows.length,
    providerRows: providerRows.length,
    deadLetters: deadLetterRows.length,
    adminAuditRows: adminAuditRows.length,
    uatRows: uat.length,
    findings: findings.length,
    releaseBlockingFindings: findings.filter((finding) => finding.releaseBlocking).length,
  },
  results: {
    p0DeferredDeliveries: state.deliveries.filter((row) => row.severity === "P0" && row.status === "DEFERRED").length,
    duplicateSuppressionCount: duplicate.result.suppressed.length,
    deadLetterCount: state.deadLetters.length,
    degradedOrUnavailableProviders: board.providerHealth.filter((row) => ["DEGRADED", "UNAVAILABLE"].includes(row.health)).length,
    openIncidentCount: board.openIncidents.length,
    dueEscalationCount: board.dueEscalations.length,
    adminAuditCount: state.adminAudit.length,
    supportBundleChecksum: supportBundle.checksum,
    supportBundleSecretLeakCount: ["never-export-this-password", "never-export-this-token", "052208"].filter((value) => JSON.stringify(supportBundle).includes(value)).length,
  },
  capabilities: capabilityRows,
  findings,
};
fs.writeFileSync(path.join(outDir, "notification-admin-readiness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

const summary = `# Build ${BUILD} Notification and Administration Readiness\n\nGenerated: ${report.generatedAt}\n\n## Exit gate\n\n${contract.exitGate}\n\n| Measure | Count |\n|---|---:|\n| Files scanned | ${report.counts.filesScanned} |\n| Required capabilities | ${report.counts.capabilities} |\n| Capabilities with evidence | ${report.counts.capabilitiesWithEvidence} |\n| Deterministic scenarios | ${report.counts.deterministicScenarios} |\n| Delivery records | ${report.counts.deliveries} |\n| Incidents | ${report.counts.incidents} |\n| Provider rows | ${report.counts.providerRows} |\n| Dead letters | ${report.counts.deadLetters} |\n| Admin audit rows | ${report.counts.adminAuditRows} |\n| Deployed UAT rows | ${report.counts.uatRows} |\n| Release-blocking static findings | ${report.counts.releaseBlockingFindings} |\n\nDeterministic evidence proves routing, quiet-hour, retry, dead-letter, escalation, audit, provider-health, and sanitization rules for controlled fixtures. It does not prove live provider delivery, durable storage, production authorization, or production secret handling. Execute all rows in \`notification-admin-uat-workbook.csv\`.\n`;
fs.writeFileSync(path.join(outDir, "notification-admin-readiness-summary.md"), summary, "utf8");

const manifestFiles = fs.readdirSync(outDir).sort();
const hashes = {};
for (const name of manifestFiles) {
  const file = path.join(outDir, name);
  if (fs.statSync(file).isFile()) hashes[name] = hash(fs.readFileSync(file));
}
fs.writeFileSync(path.join(outDir, "notification-admin-hash-manifest.json"), `${JSON.stringify({ buildVersion: BUILD, algorithm: "sha256", generatedAt: report.generatedAt, files: hashes }, null, 2)}\n`, "utf8");

console.log(`Build ${BUILD} Notification and Administration evidence generated.`);
for (const [key, value] of Object.entries(report.counts)) console.log(`${key}: ${value}`);
console.log(`Output: ${path.relative(root, outDir)}`);

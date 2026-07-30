#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  NotificationAdminValidationError,
  acknowledgeIncident,
  applyAdminSettingChange,
  createNotificationAdminState,
  createSanitizedSupportBundle,
  deriveNotificationAdminBoard,
  dueEscalations,
  recordDeliveryAttempt,
  recordProviderResult,
  routeNotificationEvent,
} from "../lib/notification-admin/build-11.8.0/notification-admin-engine.mjs";

const root = process.cwd();
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "notification-admin-fixtures-11.8.0.json"),
    "utf8",
  ),
);
const failures = [];

const actors = {
  admin: { id: "admin-1180", name: "Admin Validation", role: "ADMIN" },
  owner: { id: "owner-1180", name: "Owner Validation", role: "OWNER" },
  km: { id: "user-km", name: "Kitchen Manager", role: "KM" },
  pit: { id: "user-pit", name: "Pitmaster", role: "PITMASTER" },
  viewer: { id: "viewer-1180", name: "Read Only", role: "VIEWER" },
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else { failures.push(message); console.error(`FAIL — ${message}`); }
}
function createState(providerOverride = null) {
  const providers = clone(fixtures.providers);
  if (providerOverride) {
    for (const row of providers) {
      if (providerOverride[row.channel]) Object.assign(row, providerOverride[row.channel]);
    }
  }
  return createNotificationAdminState({
    ...clone(fixtures.tenant),
    providers,
    rules: clone(fixtures.rules),
    createdAt: "2026-08-03T20:00:00.000Z",
  });
}
function route(state, event) {
  return routeNotificationEvent(state, {
    tenantId: state.tenantId,
    locationId: state.locationId,
    occurredAt: "2026-08-04T03:30:00.000Z",
    localClock: "23:30",
    title: event.eventType,
    message: `Validation event: ${event.eventType}`,
    ...event,
  });
}

// NA-001 — P0 bypasses quiet hours and inactive recipients are absent.
let state = createState();
let result = route(state, {
  eventId: "event-p0-negative",
  eventType: "NEGATIVE_INVENTORY",
  severity: "P0",
});
state = result.state;
pass(result.result.deliveries.length === 6, "NA-001: P0 routes three channels to Owner and KM");
pass(result.result.deliveries.every((row) => row.status !== "DEFERRED"), "NA-001: P0 bypasses quiet hours");
pass(result.result.deliveries.every((row) => row.recipientId !== "user-inactive"), "NA-001: inactive recipient is excluded");

// NA-002 and NA-003 — P2 quiet hours and channel preferences.
let standardState = createState();
const standard = route(standardState, {
  eventId: "event-p2-missed-load",
  eventType: "MISSED_LOAD_START",
  severity: "P2",
});
standardState = standard.state;
pass(standard.result.deliveries.length >= 3, "NA-002: P2 event routes to active operations recipients");
pass(standard.result.deliveries.some((row) => row.status === "DEFERRED"), "NA-002: P2 respects quiet hours");
pass(!standard.result.deliveries.some((row) => row.recipientId === "user-pit" && row.channel === "EMAIL"), "NA-003: disabled Pitmaster email channel is suppressed by preference");
pass(!standard.result.deliveries.some((row) => row.recipientId === "user-kc" && row.channel === "SMS"), "NA-003: disabled KC SMS channel is suppressed by preference");

// NA-004 already confirmed inactive exclusion; prove across standard routing.
pass(!standard.result.deliveries.some((row) => row.recipientId === "user-inactive"), "NA-004: inactive recipient receives no standard delivery");

// NA-005 — duplicate event/recipient/channel suppression.
const duplicate = route(standardState, {
  eventId: "event-p2-missed-load",
  eventType: "MISSED_LOAD_START",
  severity: "P2",
});
pass(duplicate.result.deliveries.length === 0, "NA-005: duplicate event creates no new delivery");
pass(duplicate.result.suppressed.length === standard.result.deliveries.length, "NA-005: duplicate routes are explicitly suppressed");
pass(duplicate.result.suppressed.every((row) => row.status === "SUPPRESSED"), "NA-005: duplicate suppression status is explicit");

// NA-006 — retry and dead letter.
let retryState = createState({ EMAIL: { configured: true, enabled: false } });
const retryRoute = route(retryState, {
  eventId: "event-provider-fail",
  eventType: "CRON_FAILURE",
  severity: "P1",
  localClock: "12:00",
});
retryState = retryRoute.state;
const emailDelivery = retryRoute.result.deliveries.find((row) => row.channel === "EMAIL");
pass(Boolean(emailDelivery), "NA-006: failed provider produces an email delivery record");
pass(emailDelivery.status === "FAILED_RETRYABLE", "NA-006: unavailable provider begins retryable");
let attemptResult;
for (let index = 1; index <= 4; index += 1) {
  attemptResult = recordDeliveryAttempt(retryState, {
    tenantId: retryState.tenantId,
    deliveryId: emailDelivery.deliveryId,
    attemptedAt: `2026-08-04T0${index}:00:00.000Z`,
    success: false,
    failureReason: "PROVIDER_TIMEOUT",
  });
  retryState = attemptResult.state;
}
pass(attemptResult.result.attemptCount === 4, "NA-006: retry policy stops after four attempts");
pass(attemptResult.result.deliveryStatus === "DEAD_LETTERED", "NA-006: fourth failure dead-letters delivery");
pass(retryState.deadLetters.length === 1, "NA-006: one dead-letter record is preserved");

// NA-007 — acknowledgement stops future escalation.
let ackState = createState();
const ackRoute = route(ackState, {
  eventId: "event-p1-hold",
  eventType: "QUALITY_HOLD_OPENED",
  severity: "P1",
  localClock: "12:00",
});
ackState = acknowledgeIncident(ackRoute.state, {
  tenantId: ackRoute.state.tenantId,
  incidentId: ackRoute.result.incidentId,
  actor: actors.km,
  acknowledgedAt: "2026-08-03T20:05:00.000Z",
}).state;
pass(dueEscalations(ackState, "2026-08-03T21:00:00.000Z").length === 0, "NA-007: acknowledgement cancels future escalation");
pass(ackState.incidents[0].escalationSchedule.filter((row) => row.status === "CANCELLED_BY_ACKNOWLEDGEMENT").length === 2, "NA-007: two scheduled P1 escalations are cancelled");

// NA-008 — provider degrades after failures.
let providerState = createState();
let providerResult = recordProviderResult(providerState, {
  tenantId: providerState.tenantId,
  channel: "EMAIL",
  occurredAt: "2026-08-03T20:10:00.000Z",
  success: false,
});
providerState = providerResult.state;
pass(providerResult.result.health === "DEGRADED", "NA-008: first provider failure creates DEGRADED health");

// NA-009 — unconfigured provider is explicit.
const unconfigured = createState({ SMS: { configured: false, enabled: false } });
const unconfiguredBoard = deriveNotificationAdminBoard(unconfigured, "2026-08-03T20:15:00.000Z");
pass(unconfiguredBoard.providerHealth.find((row) => row.channel === "SMS").health === "NOT_CONFIGURED", "NA-009: unconfigured SMS provider is explicit");

// NA-010 — audited admin change.
let adminState = createState();
const adminChange = applyAdminSettingChange(adminState, {
  tenantId: adminState.tenantId,
  actor: actors.admin,
  settingName: "supportBundleRetention",
  value: 14,
  reason: "Reduce staging support-bundle retention",
  changedAt: "2026-08-03T20:20:00.000Z",
});
adminState = adminChange.state;
pass(adminState.adminAudit.length === 1, "NA-010: administration change creates one audit row");
pass(adminState.adminAudit[0].auditVersion === "PTT_ADMIN_AUDIT_11_8_0", "NA-010: audit uses controlled version");
pass(adminState.adminAudit[0].before === 30 && adminState.adminAudit[0].after === 14, "NA-010: audit preserves before and after values");

// NA-011 — Viewer mutation denied.
let viewerError = null;
try {
  applyAdminSettingChange(createState(), {
    tenantId: fixtures.tenant.tenantId,
    actor: actors.viewer,
    settingName: "supportBundleRetention",
    value: 7,
    reason: "Unauthorized validation attempt",
    changedAt: "2026-08-03T20:21:00.000Z",
  });
} catch (error) { viewerError = error; }
pass(viewerError instanceof NotificationAdminValidationError, "NA-011: Viewer admin mutation throws validation error");
pass(viewerError?.field === "actor.role", "NA-011: Viewer mutation identifies actor.role");

// NA-012 — tenant isolation.
let tenantError = null;
try {
  routeNotificationEvent(createState(), {
    tenantId: "tenant-other",
    eventId: "event-cross-tenant",
    eventType: "CRON_FAILURE",
    severity: "P1",
    occurredAt: "2026-08-03T20:22:00.000Z",
    localClock: "16:22",
    title: "Cross tenant",
    message: "Blocked",
  });
} catch (error) { tenantError = error; }
pass(tenantError instanceof NotificationAdminValidationError, "NA-012: cross-tenant event is rejected");
pass(tenantError?.field === "tenantId", "NA-012: cross-tenant event identifies tenantId");

// NA-013 and NA-014 — support bundle sanitization and deterministic checksum.
const unsafeSnapshot = clone(fixtures.adminSnapshot);
unsafeSnapshot.ADMIN_PASSWORD = "super-secret-password";
unsafeSnapshot.sessionToken = "session-secret";
unsafeSnapshot.configurationPresence.OPENAI_API_KEY_VALUE = "sk-secret";
unsafeSnapshot.nested = { pin: "052208", safeField: "retained" };
const bundle1 = createSanitizedSupportBundle(adminState, unsafeSnapshot, "2026-08-03T20:30:00.000Z");
const bundle2 = createSanitizedSupportBundle(adminState, unsafeSnapshot, "2026-08-03T20:30:00.000Z");
const bundleText = JSON.stringify(bundle1);
pass(!bundleText.includes("super-secret-password") && !bundleText.includes("session-secret") && !bundleText.includes("sk-secret") && !bundleText.includes("052208"), "NA-013: support bundle contains no supplied secret value");
pass(bundleText.includes("[REDACTED]") && bundleText.includes("ptt-smokehouse-control"), "NA-013: support bundle redacts secret fields and retains safe service metadata");
pass(bundle1.checksum === bundle2.checksum, "NA-014: identical support bundle input yields identical checksum");

// NA-015 — provider outage preserves in-app routing.
const outageState = createState({ EMAIL: { configured: true, enabled: false }, SMS: { configured: true, enabled: false } });
const outageRoute = route(outageState, {
  eventId: "event-provider-outage",
  eventType: "NEGATIVE_INVENTORY",
  severity: "P0",
  localClock: "12:00",
});
pass(outageRoute.result.deliveries.some((row) => row.channel === "IN_APP" && row.status === "PENDING"), "NA-015: in-app delivery remains pending during external provider outage");
pass(outageRoute.result.deliveries.some((row) => row.channel === "EMAIL" && row.status === "FAILED_RETRYABLE"), "NA-015: email outage is visible as retryable failure");

// NA-016 — P1 escalation schedule.
const escalationState = createState();
const escalationRoute = route(escalationState, {
  eventId: "event-p1-escalation",
  eventType: "SERVICE_READINESS_RISK",
  severity: "P1",
  localClock: "12:00",
});
const minutes = escalationRoute.state.incidents[0].escalationSchedule.map((row) => row.minutes);
pass(JSON.stringify(minutes) === JSON.stringify([0, 15, 45]), "NA-016: P1 escalation schedule is 0, 15, and 45 minutes");
pass(dueEscalations(escalationRoute.state, "2026-08-04T04:20:00.000Z").some((row) => row.minutes === 15), "NA-016: due escalation calculation exposes the 15-minute step");

if (failures.length) {
  console.error(`\nBuild 11.8.0 Notification and Administration test failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log("\nBuild 11.8.0 Notifications, Administration, and Support Diagnostics fixture test passed.");

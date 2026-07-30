export const NOTIFICATION_ADMIN_VERSION = "PTT_NOTIFICATION_ADMIN_11_8_0";

export const NOTIFICATION_CHANNELS = Object.freeze(["IN_APP", "EMAIL", "SMS"]);
export const NOTIFICATION_SEVERITIES = Object.freeze(["P0", "P1", "P2", "P3"]);
export const DELIVERY_STATUSES = Object.freeze([
  "PENDING",
  "DEFERRED",
  "SENT",
  "DELIVERED",
  "FAILED_RETRYABLE",
  "FAILED_TERMINAL",
  "DEAD_LETTERED",
  "SUPPRESSED",
]);
export const SUPPORTED_NOTIFICATION_EVENTS = Object.freeze([
  "MISSED_LOAD_START",
  "SERVICE_READINESS_RISK",
  "LOAD_EXCEPTION_OPENED",
  "QUALITY_HOLD_OPENED",
  "NEGATIVE_INVENTORY",
  "BLOCKING_COUNT_VARIANCE",
  "OPERATING_DAY_CLOSE_DUE",
  "REPORT_RECONCILIATION_BLOCKED",
  "FORECAST_RECOMMENDATION_READY",
  "BACKUP_STALE",
  "CRON_FAILURE",
  "PROVIDER_DEGRADED",
]);

const ROLES = new Set(["ADMIN", "OWNER", "KM", "PITMASTER", "KC", "VIEWER"]);
const ADMIN_ROLES = new Set(["ADMIN", "OWNER", "KM"]);
const SEVERITY_RANK = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3 });
const RETRY_BACKOFF_MINUTES = Object.freeze([1, 5, 15, 60]);
const ESCALATION_MINUTES = Object.freeze({
  P0: [0, 5, 15],
  P1: [0, 15, 45],
  P2: [0, 60],
  P3: [0],
});
const SECRET_KEY_PATTERN = /(secret|token|password|passwd|pin|credential|api[_-]?key|session|authorization|cookie)/i;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function stableHash(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function timestamp(value, field = "occurredAt") {
  const text = String(value || "");
  if (!text || Number.isNaN(new Date(text).getTime())) {
    throw new NotificationAdminValidationError(field, `${field} must be a valid timestamp.`);
  }
  return text;
}
function dateAddMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}
function normalizeClock(value, field) {
  const text = String(value || "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) {
    throw new NotificationAdminValidationError(field, `${field} must use HH:MM.`);
  }
  return text;
}
function clockMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
function isQuiet(localClock, quietHours) {
  if (!quietHours) return false;
  const clock = clockMinutes(normalizeClock(localClock, "localClock"));
  const start = clockMinutes(normalizeClock(quietHours.start, "quietHours.start"));
  const end = clockMinutes(normalizeClock(quietHours.end, "quietHours.end"));
  if (start === end) return false;
  return start < end ? clock >= start && clock < end : clock >= start || clock < end;
}
function nextQuietEnd(occurredAt, localClock, quietHours) {
  const currentMinutes = clockMinutes(localClock);
  const endMinutes = clockMinutes(quietHours.end);
  let delta = endMinutes - currentMinutes;
  if (delta <= 0) delta += 24 * 60;
  return dateAddMinutes(occurredAt, delta);
}
function actor(input, field = "actor") {
  const person = {
    id: String(input?.id || "").trim(),
    name: String(input?.name || "").trim(),
    role: String(input?.role || "").trim().toUpperCase(),
  };
  if (!person.id) throw new NotificationAdminValidationError(`${field}.id`, `${field}.id is required.`);
  if (person.name.length < 2) throw new NotificationAdminValidationError(`${field}.name`, `${field}.name is required.`);
  if (!ROLES.has(person.role)) throw new NotificationAdminValidationError(`${field}.role`, `${field}.role is invalid.`);
  return person;
}
function requireAdmin(person, action) {
  if (!ADMIN_ROLES.has(person.role)) {
    throw new NotificationAdminValidationError("actor.role", `${person.role} cannot ${action}.`);
  }
}
function ensureTenant(state, tenantId) {
  if (String(tenantId || state.tenantId) !== state.tenantId) {
    throw new NotificationAdminValidationError("tenantId", "Cross-tenant notification or administration action is blocked.");
  }
}
function providerFor(state, channel) {
  return state.providers.find((row) => row.channel === channel) || null;
}
function severityMatches(eventSeverity, minimumSeverity) {
  return SEVERITY_RANK[eventSeverity] <= SEVERITY_RANK[minimumSeverity];
}
function normalizeRecipient(row) {
  const role = String(row?.role || "").toUpperCase();
  if (!ROLES.has(role)) throw new NotificationAdminValidationError("recipients.role", "Recipient role is invalid.");
  const channels = {};
  for (const channel of NOTIFICATION_CHANNELS) channels[channel] = Boolean(row?.channels?.[channel]);
  return {
    recipientId: String(row?.recipientId || "").trim(),
    name: String(row?.name || "").trim(),
    role,
    status: String(row?.status || "ACTIVE").toUpperCase(),
    channels,
    quietHours: row?.quietHours ? {
      start: normalizeClock(row.quietHours.start, "recipient.quietHours.start"),
      end: normalizeClock(row.quietHours.end, "recipient.quietHours.end"),
    } : null,
  };
}
function normalizeProvider(row) {
  const channel = String(row?.channel || "").toUpperCase();
  if (!NOTIFICATION_CHANNELS.includes(channel)) {
    throw new NotificationAdminValidationError("providers.channel", "Provider channel is invalid.");
  }
  return {
    providerId: String(row?.providerId || channel.toLowerCase()),
    channel,
    configured: Boolean(row?.configured),
    enabled: Boolean(row?.enabled),
    lastSuccessAt: row?.lastSuccessAt ? timestamp(row.lastSuccessAt, "provider.lastSuccessAt") : null,
    lastFailureAt: row?.lastFailureAt ? timestamp(row.lastFailureAt, "provider.lastFailureAt") : null,
    consecutiveFailures: Math.max(0, Number(row?.consecutiveFailures || 0)),
  };
}
function normalizeRule(row) {
  const minimumSeverity = String(row?.minimumSeverity || "P3").toUpperCase();
  if (!NOTIFICATION_SEVERITIES.includes(minimumSeverity)) {
    throw new NotificationAdminValidationError("rules.minimumSeverity", "Rule minimum severity is invalid.");
  }
  const eventTypes = (row?.eventTypes || []).map((value) => String(value).toUpperCase());
  if (eventTypes.some((value) => !SUPPORTED_NOTIFICATION_EVENTS.includes(value))) {
    throw new NotificationAdminValidationError("rules.eventTypes", "Rule contains an unsupported event type.");
  }
  const roles = (row?.roles || []).map((value) => String(value).toUpperCase());
  if (roles.some((value) => !ROLES.has(value))) {
    throw new NotificationAdminValidationError("rules.roles", "Rule contains an invalid role.");
  }
  const channels = (row?.channels || []).map((value) => String(value).toUpperCase());
  if (channels.some((value) => !NOTIFICATION_CHANNELS.includes(value))) {
    throw new NotificationAdminValidationError("rules.channels", "Rule contains an invalid channel.");
  }
  return {
    ruleId: String(row?.ruleId || `rule-${stableHash(row)}`),
    eventTypes,
    minimumSeverity,
    roles,
    channels,
    P1BypassesQuietHours: Boolean(row?.P1BypassesQuietHours),
    enabled: row?.enabled !== false,
  };
}
function providerHealth(provider) {
  if (!provider || !provider.configured) return "NOT_CONFIGURED";
  if (!provider.enabled || provider.consecutiveFailures >= 4) return "UNAVAILABLE";
  if (provider.consecutiveFailures > 0) return "DEGRADED";
  return "HEALTHY";
}
function eventRecord(state, type, occurredAt, payload) {
  const core = { sequence: state.eventLog.length + 1, type, occurredAt, payload: clone(payload || {}) };
  return { ...core, eventId: `nae-${stableHash({ tenantId: state.tenantId, ...core })}` };
}
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = sanitize(item);
      }
    }
    return output;
  }
  return value;
}
function deliverySummary(deliveries) {
  const summary = {};
  for (const status of DELIVERY_STATUSES) summary[status] = 0;
  for (const delivery of deliveries) summary[delivery.status] = (summary[delivery.status] || 0) + 1;
  return summary;
}

export class NotificationAdminValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "NotificationAdminValidationError";
    this.field = field;
  }
}

export function createNotificationAdminState(input) {
  const tenantId = String(input?.tenantId || "").trim();
  const locationId = String(input?.locationId || "").trim();
  if (!tenantId) throw new NotificationAdminValidationError("tenantId", "tenantId is required.");
  if (!locationId) throw new NotificationAdminValidationError("locationId", "locationId is required.");
  const timezone = String(input?.timezone || "").trim();
  if (!timezone) throw new NotificationAdminValidationError("timezone", "timezone is required.");
  const recipients = (input?.recipients || []).map(normalizeRecipient);
  if (new Set(recipients.map((row) => row.recipientId)).size !== recipients.length) {
    throw new NotificationAdminValidationError("recipients", "Recipient IDs must be unique.");
  }
  const providers = (input?.providers || []).map(normalizeProvider);
  const rules = (input?.rules || []).map(normalizeRule);
  const core = {
    engineVersion: NOTIFICATION_ADMIN_VERSION,
    tenantId,
    locationId,
    timezone,
    recipients,
    providers,
    rules,
    deliveries: [],
    incidents: [],
    deadLetters: [],
    adminSettings: clone(input?.adminSettings || {
      notificationRules: rules,
      quietHours: "RECIPIENT_DEFINED",
      escalationPolicies: ESCALATION_MINUTES,
      providerEnablement: Object.fromEntries(providers.map((row) => [row.channel, row.enabled])),
      supportBundleRetention: 30,
    }),
    adminAudit: [],
    eventLog: [],
    processedEventIds: [],
    createdAt: String(input?.createdAt || "2026-08-03T20:00:00.000Z"),
    updatedAt: String(input?.createdAt || "2026-08-03T20:00:00.000Z"),
  };
  return { ...core, notificationStateId: `nas-${stableHash(core)}` };
}

export function routeNotificationEvent(currentState, eventInput) {
  const state = clone(currentState);
  if (!state || state.engineVersion !== NOTIFICATION_ADMIN_VERSION) {
    throw new NotificationAdminValidationError("state", "Routing requires a Build 11.8.0 notification state.");
  }
  ensureTenant(state, eventInput?.tenantId);
  const eventId = String(eventInput?.eventId || "").trim();
  if (eventId.length < 4) throw new NotificationAdminValidationError("eventId", "eventId is required.");
  const eventType = String(eventInput?.eventType || "").toUpperCase();
  if (!SUPPORTED_NOTIFICATION_EVENTS.includes(eventType)) {
    throw new NotificationAdminValidationError("eventType", "Unsupported notification event type.");
  }
  const severity = String(eventInput?.severity || "").toUpperCase();
  if (!NOTIFICATION_SEVERITIES.includes(severity)) {
    throw new NotificationAdminValidationError("severity", "Severity must be P0, P1, P2, or P3.");
  }
  const occurredAt = timestamp(eventInput?.occurredAt);
  const localClock = normalizeClock(eventInput?.localClock || "12:00", "localClock");
  const title = String(eventInput?.title || eventType).trim();
  const message = String(eventInput?.message || title).trim();

  const matchingRules = state.rules.filter(
    (rule) => rule.enabled && rule.eventTypes.includes(eventType) && severityMatches(severity, rule.minimumSeverity),
  );
  const newDeliveries = [];
  const suppressed = [];
  const seenKeys = new Set(state.deliveries.map((row) => row.idempotencyKey));

  for (const rule of matchingRules) {
    const recipients = state.recipients.filter((recipient) =>
      recipient.status === "ACTIVE" && rule.roles.includes(recipient.role),
    );
    for (const recipient of recipients) {
      for (const channel of rule.channels) {
        if (!recipient.channels[channel]) continue;
        const key = `${state.tenantId}:${eventId}:${recipient.recipientId}:${channel}`;
        if (seenKeys.has(key)) {
          suppressed.push({ eventId, recipientId: recipient.recipientId, channel, status: "SUPPRESSED", reason: "DUPLICATE_IDEMPOTENCY_KEY" });
          continue;
        }
        seenKeys.add(key);
        const provider = providerFor(state, channel);
        const health = providerHealth(provider);
        const quiet = isQuiet(localClock, recipient.quietHours);
        const bypassQuiet = severity === "P0" || (severity === "P1" && rule.P1BypassesQuietHours);
        let status = "PENDING";
        let deferredUntil = null;
        let failureReason = null;
        if (quiet && !bypassQuiet) {
          status = "DEFERRED";
          deferredUntil = nextQuietEnd(occurredAt, localClock, recipient.quietHours);
        } else if (health === "NOT_CONFIGURED" || health === "UNAVAILABLE") {
          status = channel === "IN_APP" ? "PENDING" : "FAILED_RETRYABLE";
          failureReason = `PROVIDER_${health}`;
        }
        const core = {
          eventId,
          eventType,
          severity,
          recipientId: recipient.recipientId,
          recipientName: recipient.name,
          recipientRole: recipient.role,
          channel,
          providerId: provider?.providerId || null,
          providerHealth: health,
          status,
          title,
          message,
          occurredAt,
          deferredUntil,
          failureReason,
          attemptCount: 0,
          nextAttemptAt: status === "FAILED_RETRYABLE" ? dateAddMinutes(occurredAt, RETRY_BACKOFF_MINUTES[0]) : null,
          idempotencyKey: key,
          ruleId: rule.ruleId,
        };
        newDeliveries.push({ ...core, deliveryId: `nd-${stableHash(core)}` });
      }
    }
  }

  const schedule = ESCALATION_MINUTES[severity].map((minutes, index) => ({
    escalationLevel: index,
    dueAt: dateAddMinutes(occurredAt, minutes),
    minutes,
    status: minutes === 0 ? "INITIAL_ROUTED" : "SCHEDULED",
  }));
  const incidentCore = {
    sourceEventId: eventId,
    eventType,
    severity,
    title,
    message,
    openedAt: occurredAt,
    status: "OPEN",
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    resolvedBy: null,
    escalationSchedule: schedule,
  };
  const incident = { ...incidentCore, incidentId: `inc-${stableHash({ tenantId: state.tenantId, ...incidentCore })}` };
  const log = eventRecord(state, "NOTIFICATION_EVENT_ROUTED", occurredAt, {
    sourceEventId: eventId,
    eventType,
    severity,
    deliveryCount: newDeliveries.length,
    suppressedCount: suppressed.length,
    incidentId: incident.incidentId,
  });
  const next = {
    ...state,
    deliveries: [...state.deliveries, ...newDeliveries],
    incidents: [...state.incidents, incident],
    eventLog: [...state.eventLog, log],
    processedEventIds: state.processedEventIds.includes(eventId) ? state.processedEventIds : [...state.processedEventIds, eventId],
    updatedAt: occurredAt,
  };
  return { state: next, result: { status: "ROUTED", incidentId: incident.incidentId, deliveries: newDeliveries, suppressed } };
}

export function recordDeliveryAttempt(currentState, input) {
  const state = clone(currentState);
  ensureTenant(state, input?.tenantId);
  const deliveryId = String(input?.deliveryId || "");
  const index = state.deliveries.findIndex((row) => row.deliveryId === deliveryId);
  if (index < 0) throw new NotificationAdminValidationError("deliveryId", "Unknown delivery.");
  const delivery = state.deliveries[index];
  if (["DELIVERED", "DEAD_LETTERED", "FAILED_TERMINAL", "SUPPRESSED"].includes(delivery.status)) {
    return { state, result: { status: "NO_OP", deliveryId, deliveryStatus: delivery.status } };
  }
  const attemptedAt = timestamp(input?.attemptedAt, "attemptedAt");
  const success = Boolean(input?.success);
  const terminal = Boolean(input?.terminal);
  const attemptCount = delivery.attemptCount + 1;
  let updated;
  let deadLetter = null;
  if (success) {
    updated = { ...delivery, status: "DELIVERED", attemptCount, deliveredAt: attemptedAt, nextAttemptAt: null, failureReason: null };
  } else if (terminal) {
    updated = { ...delivery, status: "FAILED_TERMINAL", attemptCount, failedAt: attemptedAt, nextAttemptAt: null, failureReason: String(input?.failureReason || "TERMINAL_PROVIDER_FAILURE") };
  } else if (attemptCount >= RETRY_BACKOFF_MINUTES.length) {
    updated = { ...delivery, status: "DEAD_LETTERED", attemptCount, failedAt: attemptedAt, nextAttemptAt: null, failureReason: String(input?.failureReason || "MAXIMUM_ATTEMPTS_REACHED") };
    deadLetter = {
      deadLetterId: `dl-${stableHash({ deliveryId, attemptedAt, attemptCount })}`,
      deliveryId,
      eventId: delivery.eventId,
      recipientId: delivery.recipientId,
      channel: delivery.channel,
      attemptCount,
      failureReason: updated.failureReason,
      deadLetteredAt: attemptedAt,
    };
  } else {
    updated = {
      ...delivery,
      status: "FAILED_RETRYABLE",
      attemptCount,
      failedAt: attemptedAt,
      failureReason: String(input?.failureReason || "RETRYABLE_PROVIDER_FAILURE"),
      nextAttemptAt: dateAddMinutes(attemptedAt, RETRY_BACKOFF_MINUTES[attemptCount]),
    };
  }
  const deliveries = [...state.deliveries];
  deliveries[index] = updated;
  const log = eventRecord(state, "DELIVERY_ATTEMPT_RECORDED", attemptedAt, {
    deliveryId,
    attemptCount,
    status: updated.status,
    deadLetterId: deadLetter?.deadLetterId || null,
  });
  return {
    state: {
      ...state,
      deliveries,
      deadLetters: deadLetter ? [...state.deadLetters, deadLetter] : state.deadLetters,
      eventLog: [...state.eventLog, log],
      updatedAt: attemptedAt,
    },
    result: { status: "APPLIED", deliveryStatus: updated.status, attemptCount, deadLetterId: deadLetter?.deadLetterId || null },
  };
}

export function acknowledgeIncident(currentState, input) {
  const state = clone(currentState);
  ensureTenant(state, input?.tenantId);
  const person = actor(input?.actor);
  const incidentId = String(input?.incidentId || "");
  const index = state.incidents.findIndex((row) => row.incidentId === incidentId);
  if (index < 0) throw new NotificationAdminValidationError("incidentId", "Unknown incident.");
  const incident = state.incidents[index];
  const acknowledgedAt = timestamp(input?.acknowledgedAt, "acknowledgedAt");
  const updated = {
    ...incident,
    status: "ACKNOWLEDGED",
    acknowledgedAt,
    acknowledgedBy: person,
    escalationSchedule: incident.escalationSchedule.map((row) =>
      row.status === "SCHEDULED" ? { ...row, status: "CANCELLED_BY_ACKNOWLEDGEMENT" } : row,
    ),
  };
  const incidents = [...state.incidents];
  incidents[index] = updated;
  const log = eventRecord(state, "INCIDENT_ACKNOWLEDGED", acknowledgedAt, { incidentId, actor: person });
  return { state: { ...state, incidents, eventLog: [...state.eventLog, log], updatedAt: acknowledgedAt }, result: { status: "APPLIED", incidentStatus: updated.status } };
}

export function resolveIncident(currentState, input) {
  const state = clone(currentState);
  ensureTenant(state, input?.tenantId);
  const person = actor(input?.actor);
  requireAdmin(person, "resolve an incident");
  const incidentId = String(input?.incidentId || "");
  const index = state.incidents.findIndex((row) => row.incidentId === incidentId);
  if (index < 0) throw new NotificationAdminValidationError("incidentId", "Unknown incident.");
  const resolution = String(input?.resolution || "").trim();
  if (resolution.length < 5) throw new NotificationAdminValidationError("resolution", "Incident resolution is required.");
  const resolvedAt = timestamp(input?.resolvedAt, "resolvedAt");
  const updated = { ...state.incidents[index], status: "RESOLVED", resolvedAt, resolvedBy: person, resolution };
  const incidents = [...state.incidents];
  incidents[index] = updated;
  const log = eventRecord(state, "INCIDENT_RESOLVED", resolvedAt, { incidentId, actor: person, resolution });
  return { state: { ...state, incidents, eventLog: [...state.eventLog, log], updatedAt: resolvedAt }, result: { status: "APPLIED", incidentStatus: "RESOLVED" } };
}

export function dueEscalations(state, nowIso) {
  const now = new Date(timestamp(nowIso, "nowIso")).getTime();
  const rows = [];
  for (const incident of state.incidents) {
    if (incident.status !== "OPEN") continue;
    for (const escalation of incident.escalationSchedule) {
      if (escalation.status === "SCHEDULED" && new Date(escalation.dueAt).getTime() <= now) {
        rows.push({ incidentId: incident.incidentId, sourceEventId: incident.sourceEventId, severity: incident.severity, ...escalation });
      }
    }
  }
  return rows.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function recordProviderResult(currentState, input) {
  const state = clone(currentState);
  ensureTenant(state, input?.tenantId);
  const channel = String(input?.channel || "").toUpperCase();
  const index = state.providers.findIndex((row) => row.channel === channel);
  if (index < 0) throw new NotificationAdminValidationError("channel", "Unknown provider channel.");
  const occurredAt = timestamp(input?.occurredAt);
  const success = Boolean(input?.success);
  const provider = state.providers[index];
  const updated = success
    ? { ...provider, lastSuccessAt: occurredAt, consecutiveFailures: 0 }
    : { ...provider, lastFailureAt: occurredAt, consecutiveFailures: provider.consecutiveFailures + 1 };
  const providers = [...state.providers];
  providers[index] = updated;
  const log = eventRecord(state, "PROVIDER_RESULT_RECORDED", occurredAt, { channel, success, health: providerHealth(updated) });
  return { state: { ...state, providers, eventLog: [...state.eventLog, log], updatedAt: occurredAt }, result: { status: "APPLIED", health: providerHealth(updated) } };
}

export function applyAdminSettingChange(currentState, input) {
  const state = clone(currentState);
  ensureTenant(state, input?.tenantId);
  const person = actor(input?.actor);
  requireAdmin(person, "change administration settings");
  const settingName = String(input?.settingName || "").trim();
  const allowed = new Set(["notificationRules", "recipientPreferences", "quietHours", "escalationPolicies", "providerEnablement", "supportBundleRetention"]);
  if (!allowed.has(settingName)) throw new NotificationAdminValidationError("settingName", "Unsupported administration setting.");
  const reason = String(input?.reason || "").trim();
  if (reason.length < 5) throw new NotificationAdminValidationError("reason", "Administration change reason is required.");
  const changedAt = timestamp(input?.changedAt, "changedAt");
  const before = clone(state.adminSettings[settingName] ?? null);
  const after = clone(input?.value);
  const core = {
    auditVersion: "PTT_ADMIN_AUDIT_11_8_0",
    tenantId: state.tenantId,
    locationId: state.locationId,
    settingName,
    before,
    after,
    actor: person,
    reason,
    changedAt,
  };
  const audit = { ...core, auditId: `aa-${stableHash(core)}` };
  const log = eventRecord(state, "ADMIN_SETTING_CHANGED", changedAt, { auditId: audit.auditId, settingName, actor: person });
  return {
    state: {
      ...state,
      adminSettings: { ...state.adminSettings, [settingName]: after },
      adminAudit: [...state.adminAudit, audit],
      eventLog: [...state.eventLog, log],
      updatedAt: changedAt,
    },
    result: { status: "APPLIED", auditId: audit.auditId },
  };
}

export function deriveNotificationAdminBoard(state, nowIso) {
  const generatedAt = timestamp(nowIso, "nowIso");
  const providers = NOTIFICATION_CHANNELS.map((channel) => {
    const provider = providerFor(state, channel);
    return {
      channel,
      providerId: provider?.providerId || null,
      configured: Boolean(provider?.configured),
      enabled: Boolean(provider?.enabled),
      health: providerHealth(provider),
      lastSuccessAt: provider?.lastSuccessAt || null,
      lastFailureAt: provider?.lastFailureAt || null,
      consecutiveFailures: provider?.consecutiveFailures || 0,
    };
  });
  return {
    boardVersion: NOTIFICATION_ADMIN_VERSION,
    tenantId: state.tenantId,
    locationId: state.locationId,
    generatedAt,
    providerHealth: providers,
    deliverySummary: deliverySummary(state.deliveries),
    openIncidents: state.incidents.filter((row) => row.status !== "RESOLVED"),
    dueEscalations: dueEscalations(state, generatedAt),
    deadLetters: clone(state.deadLetters),
    recentAdminAudit: clone(state.adminAudit.slice(-20)),
    activeRecipientCount: state.recipients.filter((row) => row.status === "ACTIVE").length,
    inactiveRecipientCount: state.recipients.filter((row) => row.status !== "ACTIVE").length,
  };
}

export function createSanitizedSupportBundle(state, snapshot, generatedAt) {
  const board = deriveNotificationAdminBoard(state, generatedAt);
  const safeSnapshot = sanitize(snapshot || {});
  const core = {
    bundleVersion: "PTT_SUPPORT_BUNDLE_11_8_0",
    generatedAt: board.generatedAt,
    tenantId: state.tenantId,
    locationId: state.locationId,
    buildIdentity: safeSnapshot.buildIdentity || {},
    serviceInventory: safeSnapshot.services || [],
    providerHealth: board.providerHealth,
    cronInventory: safeSnapshot.cronInventory || [],
    databaseMetadata: safeSnapshot.database || {},
    recentDeliverySummary: board.deliverySummary,
    recentDeadLetters: board.deadLetters.slice(-20),
    recentAdminAudit: board.recentAdminAudit,
    configurationPresence: safeSnapshot.configurationPresence || {},
    exclusionsApplied: [
      "secretValues",
      "accessTokens",
      "passwords",
      "pins",
      "sessionTokens",
      "applicationSecrets",
      "customerPersonalData",
    ],
  };
  const sanitized = sanitize(core);
  return { ...sanitized, checksum: stableHash(sanitized) };
}

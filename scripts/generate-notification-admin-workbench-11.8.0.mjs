#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.8.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentRoot = path.join(root, "components", "notification-admin");
if (!fs.existsSync(appRoot)) {
  console.error("FAIL — app directory not found.");
  process.exit(1);
}
const fixtures = JSON.parse(
  fs.readFileSync(path.join(root, "config", "notification-admin-fixtures-11.8.0.json"), "utf8"),
);

let routeSlug = "admin-lab-1180";
let routeDir = path.join(appRoot, routeSlug);
let routePath = `/${routeSlug}`;
if (fs.existsSync(path.join(routeDir, "page.tsx"))) {
  const existing = fs.readFileSync(path.join(routeDir, "page.tsx"), "utf8");
  if (!existing.includes("BUILD_11_8_0_GENERATED")) {
    routeSlug = "admin-lab-1180-alt";
    routeDir = path.join(appRoot, routeSlug);
    routePath = `/${routeSlug}`;
  }
}
fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentRoot, { recursive: true });

fs.writeFileSync(
  path.join(routeDir, "page.tsx"),
  `// BUILD_11_8_0_GENERATED
import NotificationAdminWorkbench1180 from "../../components/notification-admin/NotificationAdminWorkbench1180";

export default function NotificationAdminLabPage() {
  return <NotificationAdminWorkbench1180 />;
}
`,
  "utf8",
);

const component = `// BUILD_11_8_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  SUPPORTED_NOTIFICATION_EVENTS,
  acknowledgeIncident,
  applyAdminSettingChange,
  createNotificationAdminState,
  createSanitizedSupportBundle,
  deriveNotificationAdminBoard,
  recordDeliveryAttempt,
  recordProviderResult,
  resolveIncident,
  routeNotificationEvent,
  type NotificationAdminState,
  type NotificationRole,
  type NotificationSeverity,
} from "../../lib/notification-admin/build-11.8.0/notification-admin-engine.mjs";

const tenantFixture = ${JSON.stringify(fixtures.tenant, null, 2)};
const providerFixture = ${JSON.stringify(fixtures.providers, null, 2)};
const ruleFixture = ${JSON.stringify(fixtures.rules, null, 2)};
const adminSnapshot = ${JSON.stringify(fixtures.adminSnapshot, null, 2)};

const actors: Record<NotificationRole, { id: string; name: string; role: NotificationRole }> = {
  ADMIN: { id: "admin-1180", name: "Admin Validation", role: "ADMIN" },
  OWNER: { id: "owner-1180", name: "Owner Validation", role: "OWNER" },
  KM: { id: "user-km", name: "Kitchen Manager", role: "KM" },
  PITMASTER: { id: "user-pit", name: "Pitmaster", role: "PITMASTER" },
  KC: { id: "user-kc", name: "Kitchen Coordinator", role: "KC" },
  VIEWER: { id: "viewer-1180", name: "Viewer", role: "VIEWER" },
};

function initialState() {
  return createNotificationAdminState(({
    ...tenantFixture,
    providers: providerFixture as any,
    rules: ruleFixture as any,
    createdAt: "2026-08-03T20:00:00.000Z",
  } as any)) as NotificationAdminState;
}

export default function NotificationAdminWorkbench1180() {
  const [state, setState] = useState<NotificationAdminState>(initialState);
  const [role, setRole] = useState<NotificationRole>("KM");
  const [severity, setSeverity] = useState<NotificationSeverity>("P1");
  const [eventType, setEventType] = useState("SERVICE_READINESS_RISK");
  const [localClock, setLocalClock] = useState("12:00");
  const [counter, setCounter] = useState(1);
  const [retention, setRetention] = useState(30);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  const nowIso = "2026-08-04T04:30:00.000Z";
  const board = useMemo(
    () => deriveNotificationAdminBoard(state, nowIso),
    [state],
  );

  const routeEvent = () => {
    try {
      const result = routeNotificationEvent(state, {
        tenantId: state.tenantId,
        locationId: state.locationId,
        eventId: \`lab-event-\${counter}\`,
        eventType,
        severity,
        occurredAt: "2026-08-04T03:30:00.000Z",
        localClock,
        title: \`\${severity} \${eventType}\`,
        message: "Build 11.8.0 validation notification",
      });
      setState(result.state);
      setCounter((value) => value + 1);
      setMessage(\`Routed \${(result.result as any).deliveries.length} delivery record(s).\`);
      setCopied("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Routing failed.");
    }
  };

  const retryFirstFailed = () => {
    const delivery = (state.deliveries as any[]).find((row) =>
      ["FAILED_RETRYABLE", "PENDING", "DEFERRED"].includes(row.status),
    );
    if (!delivery) {
      setMessage("No retryable or pending delivery exists.");
      return;
    }
    try {
      const result = recordDeliveryAttempt(state, {
        tenantId: state.tenantId,
        deliveryId: delivery.deliveryId,
        attemptedAt: "2026-08-04T04:35:00.000Z",
        success: false,
        failureReason: "VALIDATION_PROVIDER_TIMEOUT",
      });
      setState(result.state);
      setMessage(\`Delivery attempt recorded: \${result.result.deliveryStatus}.\`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delivery attempt failed.");
    }
  };

  const acknowledgeFirst = () => {
    const incident = (state.incidents as any[]).find((row) => row.status === "OPEN");
    if (!incident) {
      setMessage("No open incident exists.");
      return;
    }
    try {
      const result = acknowledgeIncident(state, {
        tenantId: state.tenantId,
        incidentId: incident.incidentId,
        actor: actors[role],
        acknowledgedAt: "2026-08-04T04:36:00.000Z",
      });
      setState(result.state);
      setMessage("First open incident acknowledged; future escalation cancelled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Acknowledgement failed.");
    }
  };

  const resolveFirst = () => {
    const incident = (state.incidents as any[]).find((row) => row.status !== "RESOLVED");
    if (!incident) {
      setMessage("No unresolved incident exists.");
      return;
    }
    try {
      const result = resolveIncident(state, {
        tenantId: state.tenantId,
        incidentId: incident.incidentId,
        actor: actors[role],
        resolvedAt: "2026-08-04T04:40:00.000Z",
        resolution: "Validation incident reviewed and resolved",
      });
      setState(result.state);
      setMessage("First unresolved incident resolved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Resolution failed.");
    }
  };

  const failEmailProvider = () => {
    try {
      const result = recordProviderResult(state, {
        tenantId: state.tenantId,
        channel: "EMAIL",
        occurredAt: "2026-08-04T04:41:00.000Z",
        success: false,
      });
      setState(result.state);
      setMessage(\`Email provider health: \${result.result.health}.\`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Provider update failed.");
    }
  };

  const changeRetention = () => {
    try {
      const result = applyAdminSettingChange(state, {
        tenantId: state.tenantId,
        actor: actors[role],
        settingName: "supportBundleRetention",
        value: retention,
        reason: "Validation administration setting change",
        changedAt: "2026-08-04T04:42:00.000Z",
      });
      setState(result.state);
      setMessage(\`Admin audit created: \${result.result.auditId}.\`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Administration change failed.");
    }
  };

  const copySupportBundle = async () => {
    try {
      const bundle = createSanitizedSupportBundle(
        state,
        {
          ...adminSnapshot,
          ADMIN_PASSWORD: "must-not-export",
          sessionToken: "must-not-export",
          nested: { pin: "052208", safe: "retained" },
        },
        "2026-08-04T04:45:00.000Z",
      );
      await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
      setCopied(\`Sanitized support bundle copied. Checksum: \${bundle.checksum}\`);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Support bundle failed.");
    }
  };

  return (
    <main style={{ maxWidth: 1380, margin: "0 auto", padding: "22px 16px 64px" }}>
      <header style={{ marginBottom: 22 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Build ${BUILD} validation workbench
        </p>
        <h1 style={{ margin: "7px 0 10px", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1 }}>
          Notifications, Administration, and Support Diagnostics
        </h1>
        <p style={{ maxWidth: 1000, fontSize: 18, lineHeight: 1.55 }}>
          Validate role-based routing, recipient preferences, quiet hours, escalation, retries,
          dead letters, provider health, administration auditing, and sanitized support bundles.
          This lab does not call live email or SMS providers and does not persist production records.
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 20 }}>
        <label style={{ display: "grid", gap: 6, border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <span style={{ fontWeight: 900 }}>Acting role</span>
          <select value={role} onChange={(event: any) => setRole(event.target.value as NotificationRole)} style={{ minHeight: 44 }}>
            {Object.keys(actors).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6, border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <span style={{ fontWeight: 900 }}>Severity</span>
          <select value={severity} onChange={(event: any) => setSeverity(event.target.value as NotificationSeverity)} style={{ minHeight: 44 }}>
            {["P0", "P1", "P2", "P3"].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6, border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <span style={{ fontWeight: 900 }}>Local event time</span>
          <input type="time" value={localClock} onChange={(event: any) => setLocalClock(event.target.value)} style={{ minHeight: 44 }} />
        </label>
        <article style={{ border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <strong>Recipients</strong>
          <div>{board.activeRecipientCount} active</div>
          <div>{board.inactiveRecipientCount} inactive</div>
        </article>
      </section>

      <div role="status" aria-live="polite" style={{ minHeight: 48, border: "1px solid currentColor", borderRadius: 12, padding: 12, marginBottom: 20, fontWeight: 800 }}>
        {message || copied || "Route a controlled event and inspect every resulting delivery and escalation."}
      </div>

      <section style={{ border: "1px solid currentColor", borderRadius: 18, padding: 18, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Route operational event</h2>
        <label style={{ display: "grid", gap: 6, maxWidth: 500 }}>
          <span style={{ fontWeight: 900 }}>Event type</span>
          <select value={eventType} onChange={(event: any) => setEventType(event.target.value)} style={{ minHeight: 44 }}>
            {SUPPORTED_NOTIFICATION_EVENTS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <button type="button" onClick={routeEvent} style={{ minHeight: 48, marginTop: 12, padding: "10px 18px", fontWeight: 900 }}>
          Route validation event
        </button>
      </section>

      <section aria-labelledby="provider-health" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 id="provider-health">Provider health</h2>
          <button type="button" onClick={failEmailProvider} style={{ minHeight: 44 }}>Record email provider failure</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {(board.providerHealth as any[]).map((provider) => (
            <article key={provider.channel} style={{ border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
              <h3 style={{ margin: 0 }}>{provider.channel}</h3>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{provider.health}</div>
              <div>Configured: {String(provider.configured)}</div>
              <div>Enabled: {String(provider.enabled)}</div>
              <div>Failures: {provider.consecutiveFailures}</div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="delivery-summary" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 id="delivery-summary">Delivery control</h2>
          <button type="button" onClick={retryFirstFailed} style={{ minHeight: 44 }}>Record first retry failure</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 9, marginBottom: 12 }}>
          {Object.entries(board.deliverySummary).map(([status, count]) => (
            <article key={status} style={{ border: "1px solid currentColor", borderRadius: 12, padding: 12 }}>
              <strong>{status}</strong><div style={{ fontSize: 24 }}>{String(count)}</div>
            </article>
          ))}
        </div>
        <div style={{ maxHeight: 390, overflow: "auto", border: "1px solid currentColor", borderRadius: 14 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1100 }}>
            <thead><tr>
              {["Event", "Severity", "Recipient", "Role", "Channel", "Provider", "Status", "Deferred until", "Attempts", "Idempotency key"].map((heading) => (
                <th key={heading} style={{ textAlign: "left", padding: 9, borderBottom: "2px solid currentColor" }}>{heading}</th>
              ))}
            </tr></thead>
            <tbody>
              {(state.deliveries as any[]).map((delivery) => (
                <tr key={delivery.deliveryId}>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{delivery.eventType}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 900 }}>{delivery.severity}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{delivery.recipientName}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{delivery.recipientRole}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{delivery.channel}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{delivery.providerHealth}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 900 }}>{delivery.status}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{delivery.deferredUntil || ""}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{delivery.attemptCount}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{delivery.idempotencyKey}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Incident escalation</h2>
          <p>{board.openIncidents.length} unresolved incident(s)</p>
          <p>{board.dueEscalations.length} due escalation(s)</p>
          <button type="button" onClick={acknowledgeFirst} style={{ minHeight: 44, width: "100%", marginBottom: 8 }}>Acknowledge first open incident</button>
          <button type="button" onClick={resolveFirst} style={{ minHeight: 44, width: "100%" }}>Resolve first incident</button>
        </article>
        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Administration audit</h2>
          <label style={{ display: "grid", gap: 5 }}>
            <span>Support-bundle retention days</span>
            <input type="number" min="1" max="365" value={retention} onChange={(event: any) => setRetention(Number(event.target.value))} style={{ minHeight: 42 }} />
          </label>
          <button type="button" onClick={changeRetention} style={{ minHeight: 44, width: "100%", marginTop: 8 }}>Apply audited setting change</button>
          <p>{state.adminAudit.length} audit record(s)</p>
        </article>
        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Support diagnostics</h2>
          <p>Bundle includes build, service, cron, database, provider, delivery, dead-letter, and audit metadata. Secret fields are redacted.</p>
          <button type="button" onClick={copySupportBundle} style={{ minHeight: 48, width: "100%", fontWeight: 900 }}>Copy sanitized support bundle</button>
        </article>
      </section>

      <section>
        <h2>Append-only administration and notification events ({state.eventLog.length})</h2>
        <div style={{ maxHeight: 350, overflow: "auto", border: "1px solid currentColor", borderRadius: 14 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 780 }}>
            <thead><tr>{["Seq", "Time", "Event", "Event ID"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: 9, borderBottom: "2px solid currentColor" }}>{heading}</th>)}</tr></thead>
            <tbody>
              {(state.eventLog as any[]).map((entry) => (
                <tr key={entry.eventId}>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.sequence}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.occurredAt}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 800 }}>{entry.type}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.eventId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
`;

fs.writeFileSync(
  path.join(componentRoot, "NotificationAdminWorkbench1180.tsx"),
  component,
  "utf8",
);

const artifactDir = path.join(root, "artifacts", "build-11.8.0");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "notification-admin-workbench-route.json"),
  `${JSON.stringify({
    buildVersion: BUILD,
    route: routePath,
    pageSource: path.relative(root, path.join(routeDir, "page.tsx")).split(path.sep).join("/"),
    componentSource: "components/notification-admin/NotificationAdminWorkbench1180.tsx",
    generatedAt: new Date().toISOString(),
  }, null, 2)}\n`,
  "utf8",
);
console.log(`PASS — generated Build ${BUILD} Notification and Administration Lab at ${routePath}`);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.9.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentRoot = path.join(
  root,
  "components",
  "security-performance-recovery",
);

if (!fs.existsSync(appRoot)) {
  console.error("FAIL — app directory not found.");
  process.exit(1);
}

const contract = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "security-performance-recovery-contract-11.9.0.json",
    ),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "security-performance-recovery-fixtures-11.9.0.json",
    ),
    "utf8",
  ),
);

let routeSlug = "hardening-lab-1190";
let routeDir = path.join(appRoot, routeSlug);
let routePath = `/${routeSlug}`;

if (fs.existsSync(path.join(routeDir, "page.tsx"))) {
  const existing = fs.readFileSync(
    path.join(routeDir, "page.tsx"),
    "utf8",
  );
  if (!existing.includes("BUILD_11_9_0_GENERATED")) {
    routeSlug = "hardening-lab-1190-alt";
    routeDir = path.join(appRoot, routeSlug);
    routePath = `/${routeSlug}`;
  }
}

fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentRoot, { recursive: true });

fs.writeFileSync(
  path.join(routeDir, "page.tsx"),
  `// BUILD_11_9_0_GENERATED
import SecurityPerformanceRecoveryWorkbench1190 from "../../components/security-performance-recovery/SecurityPerformanceRecoveryWorkbench1190";

export default function SecurityPerformanceRecoveryLabPage() {
  return <SecurityPerformanceRecoveryWorkbench1190 />;
}
`,
  "utf8",
);

const component = `// BUILD_11_9_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  appendAuditEvent,
  createSanitizedHardeningBundle,
  evaluateDatabaseHealth,
  evaluatePerformanceRun,
  evaluateRecoveryReadiness,
  evaluateRequestSecurity,
  evaluateSessionPolicy,
  generateReleaseGateReport,
  verifyAuditChain,
} from "../../lib/security-performance-recovery/build-11.9.0/security-performance-recovery-engine.mjs";

const contract = ${JSON.stringify(contract, null, 2)} as any;
const fixture = ${JSON.stringify(fixtures, null, 2)} as any;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function controlList(assessment: any) {
  return Array.isArray(assessment?.controls)
    ? assessment.controls
    : [];
}

export default function SecurityPerformanceRecoveryWorkbench1190() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [apiPenaltyMs, setApiPenaltyMs] = useState(0);
  const [poolActive, setPoolActive] = useState(
    fixture.databaseSnapshot.poolActive,
  );
  const [backupHoursAgo, setBackupHoursAgo] = useState(16);
  const [restoreDaysAgo, setRestoreDaysAgo] = useState(19);
  const [openP1, setOpenP1] = useState(0);
  const [copied, setCopied] = useState("");
  const [message, setMessage] = useState("");

  const assessments = useMemo(() => {
    const sessionConfig = {
      ...clone(fixture.secureSessionConfig),
      privileged2FAEnabled: twoFactorEnabled,
    };
    const sessionAssessment = evaluateSessionPolicy(
      sessionConfig,
      contract.sessionPolicy,
    );

    const requestAssessment = evaluateRequestSecurity(
      {
        method: "POST",
        bodyBytes: 512,
        contentType: "application/json",
        browserSession: true,
        csrfValid: true,
        isWebhook: false,
        webhookSignatureValid: false,
        responseHeaders: fixture.securityHeaders,
      },
      contract.requestSecurity,
    );

    let auditChain: any[] = [];
    auditChain = appendAuditEvent(auditChain, {
      tenantId: "tenant-ptt-validation",
      requestId: "lab-request-1",
      eventType: "HARDENING_LAB_OPENED",
      occurredAt: "2026-08-04T00:00:00.000Z",
      actor: { id: "km-1190", role: "KM" },
      resourceType: "RELEASE",
      resourceId: "11.9.0",
      outcome: "SUCCESS",
      metadata: { route: "/hardening-lab-1190" },
    });
    auditChain = appendAuditEvent(auditChain, {
      tenantId: "tenant-ptt-validation",
      requestId: "lab-request-2",
      eventType: "RELEASE_GATE_EVALUATED",
      occurredAt: "2026-08-04T00:01:00.000Z",
      actor: { id: "km-1190", role: "KM" },
      resourceType: "RELEASE",
      resourceId: "11.9.0",
      outcome: "SUCCESS",
      metadata: {},
    });
    const auditAssessment = verifyAuditChain(auditChain);

    const performanceSamples = clone(
      fixture.performanceSamples,
    );
    performanceSamples.apiRead =
      performanceSamples.apiRead.map((row: any) => ({
        ...row,
        durationMs: row.durationMs + apiPenaltyMs,
      }));
    const performanceAssessment =
      evaluatePerformanceRun(
        performanceSamples,
        contract.performanceBudgets,
      );

    const databaseSnapshot = {
      ...clone(fixture.databaseSnapshot),
      poolActive,
      poolIdle: Math.max(
        0,
        fixture.databaseSnapshot.poolMaximum - poolActive,
      ),
    };
    const databaseAssessment =
      evaluateDatabaseHealth(
        databaseSnapshot,
        contract.databaseHealth,
      );

    const now = new Date(fixture.recoverySnapshot.now);
    const backup = new Date(
      now.getTime() - backupHoursAgo * 3_600_000,
    );
    const restore = new Date(
      now.getTime() - restoreDaysAgo * 86_400_000,
    );
    const recoverySnapshot = {
      ...clone(fixture.recoverySnapshot),
      lastVerifiedBackupAt: backup.toISOString(),
      lastRestoreDrillAt: restore.toISOString(),
      recoveryPointAgeHours: Math.min(
        backupHoursAgo,
        fixture.recoverySnapshot.recoveryPointAgeHours,
      ),
    };
    const recoveryAssessment =
      evaluateRecoveryReadiness(
        recoverySnapshot,
        contract.recovery,
      );

    const releaseSnapshot = {
      ...clone(fixture.releaseSnapshot),
      openP1,
    };
    const releaseGate = generateReleaseGateReport({
      generatedAt: "2026-08-04T00:05:00.000Z",
      sessionAssessment,
      requestAssessment,
      auditAssessment,
      performanceAssessment,
      databaseAssessment,
      recoveryAssessment,
      releaseSnapshot,
      releaseGatePolicy: contract.releaseGate,
    });

    return {
      sessionAssessment,
      requestAssessment,
      auditAssessment,
      performanceAssessment,
      databaseAssessment,
      recoveryAssessment,
      releaseGate,
    };
  }, [
    twoFactorEnabled,
    apiPenaltyMs,
    poolActive,
    backupHoursAgo,
    restoreDaysAgo,
    openP1,
  ]);

  const copyBundle = async () => {
    try {
      const result = createSanitizedHardeningBundle(
        {
          generatedAt: "2026-08-04T00:06:00.000Z",
          buildIdentity: {
            build: "11.9.0",
            environment: "validation",
          },
          renderTopology: contract.renderTopology,
          sessionAssessment:
            assessments.sessionAssessment,
          requestAssessment:
            assessments.requestAssessment,
          auditIntegrity: assessments.auditAssessment,
          performanceAssessment:
            assessments.performanceAssessment,
          databaseAssessment:
            assessments.databaseAssessment,
          recoveryAssessment:
            assessments.recoveryAssessment,
          releaseGate: assessments.releaseGate,
          environmentPresence: {
            DATABASE_URL: true,
            APP_SESSION_TOKEN: true,
            SENTRY_DSN: false,
          },
          nestedSecrets: {
            password: "not-exported",
            authorization: "not-exported",
          },
        },
        contract.sanitization.redactedKeyPatterns,
      );
      await navigator.clipboard.writeText(
        JSON.stringify(result.bundle, null, 2),
      );
      setCopied(
        \`Sanitized hardening bundle copied. Secret leaks: \${result.secretLeaks.length}.\`,
      );
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Support bundle failed.",
      );
    }
  };

  const cards = [
    {
      title: "Session security",
      assessment: assessments.sessionAssessment,
    },
    {
      title: "Request security",
      assessment: {
        status: assessments.requestAssessment.accepted
          ? "PASS"
          : "FAIL",
        controls: assessments.requestAssessment.controls,
      },
    },
    {
      title: "Audit integrity",
      assessment: {
        status: assessments.auditAssessment.valid
          ? "PASS"
          : "FAIL",
        controls: [
          {
            control: "hashChain",
            passed: assessments.auditAssessment.valid,
            actual: assessments.auditAssessment.eventCount,
            expected: "valid append-only chain",
            message: "Audit hash chain verifies.",
          },
        ],
      },
    },
    {
      title: "Performance",
      assessment: assessments.performanceAssessment,
    },
    {
      title: "Database",
      assessment: assessments.databaseAssessment,
    },
    {
      title: "Recovery",
      assessment: assessments.recoveryAssessment,
    },
  ];

  return (
    <main
      style={{
        maxWidth: 1380,
        margin: "0 auto",
        padding: "22px 16px 64px",
      }}
    >
      <header style={{ marginBottom: 22 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Build ${BUILD} validation workbench
        </p>
        <h1
          style={{
            margin: "7px 0 10px",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1,
          }}
        >
          Security, Performance, and Recovery
        </h1>
        <p
          style={{
            maxWidth: 1020,
            fontSize: 18,
            lineHeight: 1.55,
          }}
        >
          Evaluate the production-release gates before Build
          12.0.0. The release remains on HOLD whenever session
          security, request security, audit integrity, performance,
          database health, recovery readiness, rollback, tenant
          isolation, authorization, or P0/P1 controls fail. This lab
          does not change production security settings, run live load
          against production, or perform a backup or restore.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 6,
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <span style={{ fontWeight: 900 }}>
            Privileged 2FA
          </span>
          <select
            value={twoFactorEnabled ? "enabled" : "disabled"}
            onChange={(event: any) =>
              setTwoFactorEnabled(
                event.target.value === "enabled",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>

        <label
          style={{
            display: "grid",
            gap: 6,
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <span style={{ fontWeight: 900 }}>
            API latency penalty
          </span>
          <input
            type="number"
            min="0"
            step="25"
            value={apiPenaltyMs}
            onChange={(event: any) =>
              setApiPenaltyMs(Number(event.target.value) || 0)
            }
            style={{ minHeight: 44 }}
          />
          <small>Milliseconds added to API read samples.</small>
        </label>

        <label
          style={{
            display: "grid",
            gap: 6,
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <span style={{ fontWeight: 900 }}>
            Active DB connections
          </span>
          <input
            type="number"
            min="0"
            max={fixture.databaseSnapshot.poolMaximum}
            value={poolActive}
            onChange={(event: any) =>
              setPoolActive(Number(event.target.value) || 0)
            }
            style={{ minHeight: 44 }}
          />
          <small>
            Pool maximum:{" "}
            {fixture.databaseSnapshot.poolMaximum}
          </small>
        </label>

        <label
          style={{
            display: "grid",
            gap: 6,
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <span style={{ fontWeight: 900 }}>
            Verified backup age
          </span>
          <input
            type="number"
            min="0"
            value={backupHoursAgo}
            onChange={(event: any) =>
              setBackupHoursAgo(
                Number(event.target.value) || 0,
              )
            }
            style={{ minHeight: 44 }}
          />
          <small>Hours</small>
        </label>

        <label
          style={{
            display: "grid",
            gap: 6,
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <span style={{ fontWeight: 900 }}>
            Restore drill age
          </span>
          <input
            type="number"
            min="0"
            value={restoreDaysAgo}
            onChange={(event: any) =>
              setRestoreDaysAgo(
                Number(event.target.value) || 0,
              )
            }
            style={{ minHeight: 44 }}
          />
          <small>Days</small>
        </label>

        <label
          style={{
            display: "grid",
            gap: 6,
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <span style={{ fontWeight: 900 }}>Open P1 defects</span>
          <input
            type="number"
            min="0"
            step="1"
            value={openP1}
            onChange={(event: any) =>
              setOpenP1(Number(event.target.value) || 0)
            }
            style={{ minHeight: 44 }}
          />
        </label>
      </section>

      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: 56,
          border: "2px solid currentColor",
          borderRadius: 14,
          padding: 14,
          marginBottom: 22,
          fontSize: 20,
          fontWeight: 900,
        }}
      >
        Release decision:{" "}
        {assessments.releaseGate.decision}
        {assessments.releaseGate.failures.length
          ? \` — \${assessments.releaseGate.failures.length} blocking control(s)\`
          : " — all controlled gates pass"}
      </div>

      {message || copied ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            border: "1px solid currentColor",
            borderRadius: 12,
            padding: 12,
            marginBottom: 20,
          }}
        >
          {message || copied}
        </div>
      ) : null}

      <section
        aria-labelledby="hardening-assessments"
        style={{ marginBottom: 28 }}
      >
        <h2 id="hardening-assessments">
          Hardening assessments
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(310px, 1fr))",
            gap: 16,
          }}
        >
          {cards.map((card) => (
            <article
              key={card.title}
              style={{
                border: "1px solid currentColor",
                borderRadius: 18,
                padding: 17,
              }}
            >
              <h3 style={{ marginTop: 0 }}>{card.title}</h3>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                {card.assessment.status}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {controlList(card.assessment).map(
                  (row: any) => (
                    <div
                      key={row.control}
                      style={{
                        borderTop:
                          "1px solid currentColor",
                        paddingTop: 8,
                      }}
                    >
                      <strong>
                        {row.passed ? "PASS" : "FAIL"} —{" "}
                        {row.control}
                      </strong>
                      <div>{row.message}</div>
                      <small>
                        Actual:{" "}
                        {JSON.stringify(row.actual)} ·
                        Expected:{" "}
                        {JSON.stringify(row.expected)}
                      </small>
                    </div>
                  ),
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Performance metrics
          </h2>
          <div>
            API read p95:{" "}
            {
              (assessments.performanceAssessment as any)
                .metrics.apiRead.p95Ms
            }{" "}
            ms
          </div>
          <div>
            Mutation p95:{" "}
            {
              (assessments.performanceAssessment as any)
                .metrics.criticalMutation.p95Ms
            }{" "}
            ms
          </div>
          <div>
            Dashboard p95:{" "}
            {
              (assessments.performanceAssessment as any)
                .metrics.dashboard.p95Ms
            }{" "}
            ms
          </div>
          <div>
            Throughput:{" "}
            {
              (assessments.performanceAssessment as any)
                .metrics.throughputRps
            }{" "}
            req/s
          </div>
          <div>
            Error rate:{" "}
            {
              (assessments.performanceAssessment as any)
                .metrics.errorRatePercent
            }
            %
          </div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Recovery metrics</h2>
          <div>
            Backup age:{" "}
            {
              (assessments.recoveryAssessment as any)
                .metrics.backupAgeHours
            }{" "}
            hours
          </div>
          <div>
            Restore drill age:{" "}
            {
              (assessments.recoveryAssessment as any)
                .metrics.restoreDrillAgeDays
            }{" "}
            days
          </div>
          <div>
            Restore duration:{" "}
            {
              (assessments.recoveryAssessment as any)
                .metrics.restoreDurationMinutes
            }{" "}
            minutes
          </div>
          <div>
            Controlled RPO:{" "}
            {
              (assessments.recoveryAssessment as any)
                .metrics.rpoHours
            }{" "}
            hours
          </div>
          <div>
            Controlled RTO:{" "}
            {
              (assessments.recoveryAssessment as any)
                .metrics.rtoHours
            }{" "}
            hours
          </div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Render topology</h2>
          <div>Web services: 1</div>
          <div>Cron services: 0</div>
          <div>PostgreSQL databases: 1</div>
          <p>
            Build 11.9.0 preserves the corrected no-cron
            Blueprint.
          </p>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Sanitized diagnostics
          </h2>
          <p>
            Generate a support bundle containing only controlled
            evidence. Secret-bearing keys are redacted.
          </p>
          <button
            type="button"
            onClick={copyBundle}
            style={{
              minHeight: 48,
              width: "100%",
              fontWeight: 900,
            }}
          >
            Copy sanitized hardening bundle
          </button>
        </article>
      </section>

      <section>
        <h2>
          Release-gate controls (
          {assessments.releaseGate.controls.length})
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: 900,
            }}
          >
            <thead>
              <tr>
                {[
                  "Control",
                  "Result",
                  "Actual",
                  "Expected",
                  "Explanation",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      textAlign: "left",
                      padding: 9,
                      borderBottom:
                        "2px solid currentColor",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessments.releaseGate.controls.map(
                (row: any) => (
                  <tr key={row.control}>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                        fontWeight: 900,
                      }}
                    >
                      {row.control}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      {row.passed ? "PASS" : "FAIL"}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      {JSON.stringify(row.actual)}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      {JSON.stringify(row.expected)}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      {row.message}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
`;

fs.writeFileSync(
  path.join(
    componentRoot,
    "SecurityPerformanceRecoveryWorkbench1190.tsx",
  ),
  component,
  "utf8",
);

const artifactDir = path.join(
  root,
  "artifacts",
  "build-11.9.0",
);
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "hardening-workbench-route.json"),
  `${JSON.stringify(
    {
      buildVersion: BUILD,
      route: routePath,
      pageSource: path
        .relative(root, path.join(routeDir, "page.tsx"))
        .split(path.sep)
        .join("/"),
      componentSource:
        "components/security-performance-recovery/SecurityPerformanceRecoveryWorkbench1190.tsx",
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `PASS — generated Build ${BUILD} hardening lab at ${routePath}`,
);

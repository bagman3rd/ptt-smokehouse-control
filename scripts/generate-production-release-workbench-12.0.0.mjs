#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "12.0.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentRoot = path.join(
  root,
  "components",
  "production-release",
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

let routeSlug = "release-lab-1200";
let routeDir = path.join(appRoot, routeSlug);
let routePath = `/${routeSlug}`;

if (fs.existsSync(path.join(routeDir, "page.tsx"))) {
  const existing = fs.readFileSync(
    path.join(routeDir, "page.tsx"),
    "utf8",
  );
  if (!existing.includes("BUILD_12_0_0_GENERATED")) {
    routeSlug = "release-lab-1200-alt";
    routeDir = path.join(appRoot, routeSlug);
    routePath = `/${routeSlug}`;
  }
}

fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentRoot, { recursive: true });

fs.writeFileSync(
  path.join(routeDir, "page.tsx"),
  `// BUILD_12_0_0_GENERATED
import ProductionReleaseWorkbench1200 from "../../components/production-release/ProductionReleaseWorkbench1200";

export default function ProductionReleaseLabPage() {
  return <ProductionReleaseWorkbench1200 />;
}
`,
  "utf8",
);

const component = `// BUILD_12_0_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  assessProductionRelease,
  authorizeProductionRelease,
  createProductionHandoffBundle,
  createProductionReleaseManifest,
} from "../../lib/production-release/build-12.0.0/production-release-engine.mjs";

const contract = ${JSON.stringify(contract, null, 2)} as any;
const controlledCandidate = ${JSON.stringify(fixtures.releaseCandidate, null, 2)} as any;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export default function ProductionReleaseWorkbench1200() {
  const [durableEod, setDurableEod] = useState(true);
  const [publicLab, setPublicLab] = useState(false);
  const [healthPassed, setHealthPassed] = useState(true);
  const [performancePassed, setPerformancePassed] =
    useState(true);
  const [backupPassed, setBackupPassed] = useState(true);
  const [rollbackPassed, setRollbackPassed] =
    useState(true);
  const [cronServices, setCronServices] = useState(0);
  const [openP1, setOpenP1] = useState(0);
  const [recoverySigned, setRecoverySigned] =
    useState(true);
  const [copied, setCopied] = useState("");
  const [message, setMessage] = useState("");

  const evidence = useMemo(() => {
    const candidate = clone(controlledCandidate);
    candidate.workflowEvidence.QUICK_EOD.durablePersistenceVerified =
      durableEod;
    candidate.routeEvidence.validationRouteExposure[
      "/release-lab-1200"
    ] = publicLab ? "PUBLIC" : "ADMIN_ONLY";
    candidate.deploymentEvidence.healthEndpointPassed =
      healthPassed;
    candidate.hardeningEvidence.performancePassed =
      performancePassed;
    candidate.recoveryEvidence.verifiedBackupCurrent =
      backupPassed;
    candidate.recoveryEvidence.rollbackTestPassed =
      rollbackPassed;
    candidate.renderTopology.cronServices = cronServices;
    candidate.defects.openP1 = openP1;
    candidate.signOffs.RECOVERY_TESTER.signed =
      recoverySigned;
    return candidate;
  }, [
    durableEod,
    publicLab,
    healthPassed,
    performancePassed,
    backupPassed,
    rollbackPassed,
    cronServices,
    openP1,
    recoverySigned,
  ]);

  const assessment = useMemo(
    () => assessProductionRelease(evidence, contract),
    [evidence],
  );

  const copyPendingManifest = async () => {
    try {
      const manifest =
        createProductionReleaseManifest(assessment);
      await navigator.clipboard.writeText(
        JSON.stringify(manifest, null, 2),
      );
      setCopied(
        "Pending-sign-off release manifest copied.",
      );
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Manifest generation failed.",
      );
    }
  };

  const copySimulatedAuthorization = async () => {
    try {
      const authorization = authorizeProductionRelease(
        assessment,
        {
          role: "RELEASE_OWNER",
          actorName: "SIMULATED RELEASE OWNER",
          authorizedAt: "2026-08-05T15:00:00.000Z",
          reason:
            "Validation-lab simulation only; this is not production authorization",
          deployedEvidenceReviewed: true,
          renderDeploymentVerified: true,
          operationalAcceptanceSigned: true,
          authorizationGranted: true,
        },
      );
      const manifest = createProductionReleaseManifest(
        assessment,
        authorization,
      );
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            simulationOnly: true,
            authorization,
            manifest,
          },
          null,
          2,
        ),
      );
      setCopied(
        "Simulated authorization record copied. It is not a production approval.",
      );
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Simulated authorization failed.",
      );
    }
  };

  const copyHandoff = async () => {
    try {
      const manifest =
        createProductionReleaseManifest(assessment);
      const result = createProductionHandoffBundle({
        generatedAt: "2026-08-05T15:05:00.000Z",
        releaseManifest: manifest,
        launchOwners: evidence.launchEvidence,
        openingChecklist: {
          complete:
            evidence.launchEvidence
              .openingDayChecklistComplete,
          checklistId: "opening-checklist-1200",
        },
        supportPlan: {
          runbook:
            "docs/PRODUCTION_SUPPORT_RUNBOOK_12_0_0.md",
          APP_SESSION_TOKEN: "not-exported",
        },
        recoveryPlan: {
          runbook:
            "docs/PRODUCTION_ROLLBACK_RUNBOOK_12_0_0.md",
          DATABASE_URL: "not-exported",
        },
        firstDayMonitoring: {
          complete:
            evidence.launchEvidence
              .firstDayMonitoringPlanComplete,
          owner: evidence.launchEvidence.operationsOwner,
        },
        environmentPresence:
          evidence.configurationEvidence
            .configurationPresence,
      });
      await navigator.clipboard.writeText(
        JSON.stringify(result.bundle, null, 2),
      );
      setCopied(
        \`Sanitized handoff bundle copied. Secret leaks: \${result.secretLeaks.length}.\`,
      );
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Handoff generation failed.",
      );
    }
  };

  const failedDomains = Object.entries(
    assessment.domainSummary,
  ).filter(
    ([, row]: any) => row.failed > 0,
  );

  return (
    <main
      style={{
        maxWidth: 1420,
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
          Build ${BUILD} release certification lab
        </p>
        <h1
          style={{
            margin: "7px 0 10px",
            fontSize: "clamp(2rem, 5vw, 3.7rem)",
            lineHeight: 1,
          }}
        >
          PTT Production Release
        </h1>
        <p
          style={{
            maxWidth: 1080,
            fontSize: 18,
            lineHeight: 1.55,
          }}
        >
          This route evaluates release evidence and cutover
          readiness. A deterministic GO never authorizes production.
          Actual authorization requires the deployed Render revision,
          persistent staging data, security and tenant-isolation
          evidence, complete operational acceptance, recovery and
          rollback evidence, and an explicit release-owner sign-off.
          This validation route must be disabled or ADMIN-only in
          production.
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
            Quick EOD persistence
          </span>
          <select
            value={durableEod ? "verified" : "missing"}
            onChange={(event: any) =>
              setDurableEod(
                event.target.value === "verified",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="verified">Verified</option>
            <option value="missing">Missing</option>
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
            Release-lab exposure
          </span>
          <select
            value={publicLab ? "public" : "admin"}
            onChange={(event: any) =>
              setPublicLab(event.target.value === "public")
            }
            style={{ minHeight: 44 }}
          >
            <option value="admin">ADMIN_ONLY</option>
            <option value="public">PUBLIC</option>
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
          <span style={{ fontWeight: 900 }}>Health endpoint</span>
          <select
            value={healthPassed ? "pass" : "fail"}
            onChange={(event: any) =>
              setHealthPassed(
                event.target.value === "pass",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="pass">PASS</option>
            <option value="fail">FAIL</option>
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
            Performance gate
          </span>
          <select
            value={performancePassed ? "pass" : "fail"}
            onChange={(event: any) =>
              setPerformancePassed(
                event.target.value === "pass",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="pass">PASS</option>
            <option value="fail">FAIL</option>
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
            Verified backup
          </span>
          <select
            value={backupPassed ? "pass" : "fail"}
            onChange={(event: any) =>
              setBackupPassed(
                event.target.value === "pass",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="pass">CURRENT</option>
            <option value="fail">MISSING/STALE</option>
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
            Rollback rehearsal
          </span>
          <select
            value={rollbackPassed ? "pass" : "fail"}
            onChange={(event: any) =>
              setRollbackPassed(
                event.target.value === "pass",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="pass">PASS</option>
            <option value="fail">FAIL</option>
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
            Render cron services
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={cronServices}
            onChange={(event: any) =>
              setCronServices(Number(event.target.value) || 0)
            }
            style={{ minHeight: 44 }}
          />
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
            Open P1 defects
          </span>
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
            Recovery tester sign-off
          </span>
          <select
            value={recoverySigned ? "signed" : "missing"}
            onChange={(event: any) =>
              setRecoverySigned(
                event.target.value === "signed",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="signed">SIGNED</option>
            <option value="missing">MISSING</option>
          </select>
        </label>
      </section>

      <section
        style={{
          border: "3px solid currentColor",
          borderRadius: 18,
          padding: 18,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <article>
            <strong>Package status</strong>
            <div style={{ fontSize: 30, fontWeight: 900 }}>
              {assessment.packageStatus}
            </div>
          </article>
          <article>
            <strong>Evidence decision</strong>
            <div style={{ fontSize: 30, fontWeight: 900 }}>
              {assessment.evidenceDecision}
            </div>
          </article>
          <article>
            <strong>Production authorization</strong>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              {assessment.productionAuthorization}
            </div>
          </article>
          <article>
            <strong>Blocking controls</strong>
            <div style={{ fontSize: 30, fontWeight: 900 }}>
              {assessment.failures.length}
            </div>
          </article>
        </div>
        <p style={{ marginBottom: 0 }}>
          {assessment.productionAuthorizationReason}
        </p>
      </section>

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
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(290px, 1fr))",
          gap: 14,
          marginBottom: 26,
        }}
      >
        {Object.entries(assessment.domainSummary).map(
          ([domain, row]: any) => (
            <article
              key={domain}
              style={{
                border: "1px solid currentColor",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: 20,
                }}
              >
                {domain}
              </h2>
              <div>
                Passed: {row.passed} / {row.controls}
              </div>
              <div>Failed: {row.failed}</div>
            </article>
          ),
        )}
      </section>

      {failedDomains.length ? (
        <section style={{ marginBottom: 26 }}>
          <h2>Blocking controls</h2>
          <div style={{ display: "grid", gap: 9 }}>
            {assessment.failures.map((row: any) => (
              <article
                key={\`\${row.domain}-\${row.control}\`}
                style={{
                  border: "1px solid currentColor",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <strong>
                  {row.domain} · {row.control}
                </strong>
                <div>{row.message}</div>
                <small>
                  Actual: {JSON.stringify(row.actual)} ·
                  Expected: {JSON.stringify(row.expected)}
                </small>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section
          style={{
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
            marginBottom: 26,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Controlled evidence passes
          </h2>
          <p>
            This is a validation result only. Production remains
            pending deployed sign-off.
          </p>
        </section>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
          marginBottom: 30,
        }}
      >
        <button
          type="button"
          onClick={copyPendingManifest}
          style={{ minHeight: 50, fontWeight: 900 }}
        >
          Copy pending-sign-off manifest
        </button>
        <button
          type="button"
          onClick={copyHandoff}
          style={{ minHeight: 50, fontWeight: 900 }}
        >
          Copy sanitized launch handoff
        </button>
        <button
          type="button"
          onClick={copySimulatedAuthorization}
          disabled={assessment.evidenceDecision !== "GO"}
          style={{ minHeight: 50, fontWeight: 900 }}
        >
          Copy simulated authorization
        </button>
      </section>

      <section>
        <h2>
          All release controls ({assessment.controls.length})
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: 1050,
            }}
          >
            <thead>
              <tr>
                {[
                  "Domain",
                  "Control",
                  "Result",
                  "Actual",
                  "Expected",
                  "Evidence",
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
              {assessment.controls.map((row: any) => (
                <tr
                  key={\`\${row.domain}-\${row.control}\`}
                >
                  <td
                    style={{
                      padding: 9,
                      borderBottom:
                        "1px solid currentColor",
                    }}
                  >
                    {row.domain}
                  </td>
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
                    {row.evidenceIds.join(", ")}
                  </td>
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
  path.join(
    componentRoot,
    "ProductionReleaseWorkbench1200.tsx",
  ),
  component,
  "utf8",
);

const artifactDir = path.join(
  root,
  "artifacts",
  "build-12.0.0",
);
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(
    artifactDir,
    "production-release-workbench-route.json",
  ),
  `${JSON.stringify(
    {
      buildVersion: BUILD,
      route: routePath,
      pageSource: path
        .relative(root, path.join(routeDir, "page.tsx"))
        .split(path.sep)
        .join("/"),
      componentSource:
        "components/production-release/ProductionReleaseWorkbench1200.tsx",
      requiredProductionExposure: "ADMIN_ONLY_OR_DISABLED",
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `PASS — generated Build ${BUILD} Production Release Lab at ${routePath}`,
);

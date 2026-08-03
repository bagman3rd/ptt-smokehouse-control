#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "12.2.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentRoot = path.join(
  root,
  "components",
  "pos-data-integrations",
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
      "pos-data-integrations-contract-12.2.0.json",
    ),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "pos-data-integrations-fixtures-12.2.0.json",
    ),
    "utf8",
  ),
);

let routeSlug = "integration-lab-1220";
let routeDir = path.join(appRoot, routeSlug);
let routePath = `/${routeSlug}`;

if (fs.existsSync(path.join(routeDir, "page.tsx"))) {
  const existing = fs.readFileSync(
    path.join(routeDir, "page.tsx"),
    "utf8",
  );
  if (!existing.includes("BUILD_12_2_0_GENERATED")) {
    routeSlug = "integration-lab-1220-alt";
    routeDir = path.join(appRoot, routeSlug);
    routePath = `/${routeSlug}`;
  }
}

fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentRoot, { recursive: true });

fs.writeFileSync(
  path.join(routeDir, "page.tsx"),
  `// BUILD_12_2_0_GENERATED
import PosDataIntegrationsWorkbench1220 from "../../components/pos-data-integrations/PosDataIntegrationsWorkbench1220";

export default function PosDataIntegrationsLabPage() {
  return <PosDataIntegrationsWorkbench1220 />;
}
`,
  "utf8",
);

const component = `// BUILD_12_2_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  buildDailySalesSummary,
  compareActualSalesToForecast,
  createForecastLearningInput,
  createImportState,
  createManualSalesBatch,
  createSupplierCostSnapshot,
  evaluateConnectionHealth,
  ingestSalesBatch,
  mapSalesBatch,
  reconcileSalesBatch,
  scheduleFailedBatchRetry,
} from "../../lib/pos-data-integrations/build-12.2.0/pos-data-integrations-engine.mjs";

const contract = ${JSON.stringify(contract, null, 2)} as any;
const fixtures = ${JSON.stringify(fixtures, null, 2)} as any;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function dollars(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export default function PosDataIntegrationsWorkbench1220() {
  const [locationIndex, setLocationIndex] = useState(0);
  const [removeMapping, setRemoveMapping] = useState(false);
  const [sourceDifferenceCents, setSourceDifferenceCents] =
    useState(0);
  const [connectionAgeMinutes, setConnectionAgeMinutes] =
    useState(15);
  const [retryAttemptCount, setRetryAttemptCount] =
    useState(2);
  const [message, setMessage] = useState("");

  const result = useMemo(() => {
    try {
      const payload = clone(
        fixtures.salesBatches[locationIndex],
      );
      payload.sourceTotalNetSalesCents +=
        sourceDifferenceCents;
      const locationMappings = clone(fixtures.mappings);
      if (removeMapping) {
        const itemId =
          payload.lines[payload.lines.length - 1]
            .providerItemId;
        for (
          let index = locationMappings.length - 1;
          index >= 0;
          index -= 1
        ) {
          if (
            locationMappings[index].providerItemId ===
            itemId
          ) {
            locationMappings.splice(index, 1);
          }
        }
      }
      const imported = ingestSalesBatch(
        createImportState(),
        payload,
        fixtures.locationRegistry,
      ).batch;
      const mapped = mapSalesBatch(
        imported,
        locationMappings,
      );
      const reconciled = reconcileSalesBatch(
        mapped,
        contract,
        {
          actor: {
            userId: "user-km-both",
            role: "KM",
          },
          approvedAt:
            "2026-08-02T07:00:00.000Z",
          reason: "Validation workbench reconciliation",
        },
      );
      const summary =
        reconciled.status === "RECONCILED"
          ? buildDailySalesSummary(reconciled)
          : null;
      const comparison = summary
        ? compareActualSalesToForecast(
            summary,
            fixtures.forecastSnapshots[
              locationIndex
            ],
          )
        : null;
      let learning: any = null;
      if (summary) {
        try {
          learning = createForecastLearningInput(
            reconciled,
            summary,
            fixtures.forecastSnapshots[
              locationIndex
            ],
          );
        } catch {
          learning = null;
        }
      }
      return {
        payload,
        mapped,
        reconciled,
        summary,
        comparison,
        learning,
        error: "",
      };
    } catch (error) {
      return {
        payload: null,
        mapped: null,
        reconciled: null,
        summary: null,
        comparison: null,
        learning: null,
        error:
          error instanceof Error
            ? error.message
            : "Integration evaluation failed.",
      };
    }
  }, [
    locationIndex,
    removeMapping,
    sourceDifferenceCents,
  ]);

  const connection = useMemo(() => {
    const base = clone(
      fixtures.connections[locationIndex],
    );
    const lastSuccess = new Date(
      "2026-08-02T06:00:00.000Z",
    );
    lastSuccess.setMinutes(
      lastSuccess.getMinutes() -
        connectionAgeMinutes,
    );
    base.lastSuccessfulSyncAt =
      lastSuccess.toISOString();
    return evaluateConnectionHealth(
      base,
      contract,
      "2026-08-02T06:00:00.000Z",
    );
  }, [locationIndex, connectionAgeMinutes]);

  const retry = useMemo(() => {
    try {
      return scheduleFailedBatchRetry(
        {
          ...clone(fixtures.failedBatch),
          attemptCount: retryAttemptCount,
        },
        contract,
        {
          requestedAt:
            "2026-08-02T07:00:00.000Z",
          nextRetryAt:
            "2026-08-02T07:15:00.000Z",
          lastErrorCode: "PROVIDER_TIMEOUT",
          lastErrorMessage:
            "Validation workbench timeout",
        },
      );
    } catch {
      return null;
    }
  }, [retryAttemptCount]);

  const supplier = useMemo(
    () =>
      createSupplierCostSnapshot(
        fixtures.supplierRows,
        fixtures.priorSupplierCosts,
        contract,
      ),
    [],
  );

  const testManualFallback = () => {
    try {
      const batch = createManualSalesBatch(
        fixtures.manualEntry,
        fixtures.locationRegistry,
        fixtures.mappings,
        contract,
        [],
      );
      setMessage(
        \`Manual fallback accepted as \${batch.status}; forecast learning remains disabled.\`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Manual fallback failed.",
      );
    }
  };

  const selectedLocation =
    fixtures.salesBatches[locationIndex].locationId;

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
          Build ${BUILD} validation workbench
        </p>
        <h1
          style={{
            margin: "7px 0 10px",
            fontSize: "clamp(2rem, 5vw, 3.6rem)",
            lineHeight: 1,
          }}
        >
          POS and Data Integrations
        </h1>
        <p
          style={{
            maxWidth: 1080,
            fontSize: 18,
            lineHeight: 1.55,
          }}
        >
          Validate location-scoped sales imports, mapping,
          reconciliation, retries, manual fallback, actual-versus-
          forecast comparisons, forecast-learning inputs, and
          supplier-cost alerts. This lab does not call a live POS,
          register a webhook, download supplier data, persist
          production imports, or expose credentials.
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
            Location
          </span>
          <select
            value={locationIndex}
            onChange={(event: any) =>
              setLocationIndex(
                Number(event.target.value),
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value={0}>Pigeon Forge</option>
            <option value={1}>Knoxville Validation</option>
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
            Final item mapping
          </span>
          <select
            value={removeMapping ? "missing" : "active"}
            onChange={(event: any) =>
              setRemoveMapping(
                event.target.value === "missing",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="active">Active</option>
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
            Source-total adjustment
          </span>
          <input
            type="number"
            step="1"
            value={sourceDifferenceCents}
            onChange={(event: any) =>
              setSourceDifferenceCents(
                Number(event.target.value) || 0,
              )
            }
            style={{ minHeight: 44 }}
          />
          <small>Cents added to the source report total.</small>
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
            Last successful sync age
          </span>
          <input
            type="number"
            min="0"
            value={connectionAgeMinutes}
            onChange={(event: any) =>
              setConnectionAgeMinutes(
                Number(event.target.value) || 0,
              )
            }
            style={{ minHeight: 44 }}
          />
          <small>Minutes</small>
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
            Failed-batch attempts
          </span>
          <input
            type="number"
            min="0"
            value={retryAttemptCount}
            onChange={(event: any) =>
              setRetryAttemptCount(
                Number(event.target.value) || 0,
              )
            }
            style={{ minHeight: 44 }}
          />
        </label>
      </section>

      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: 54,
          border: "1px solid currentColor",
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
          fontWeight: 800,
        }}
      >
        {message ||
          result.error ||
          \`Evaluating \${selectedLocation} import evidence.\`}
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(285px, 1fr))",
          gap: 14,
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
            Connection health
          </h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {connection.status}
          </div>
          <div>Age: {connection.ageMinutes} minutes</div>
          <div>
            Automatic import:{" "}
            {connection.automaticImportAllowed
              ? "Allowed"
              : "Blocked"}
          </div>
          <div>Manual fallback: Available</div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Import batch</h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {result.reconciled?.status || "ERROR"}
          </div>
          <div>
            Lines: {result.payload?.lines.length || 0}
          </div>
          <div>
            Imported:{" "}
            {result.summary
              ? dollars(result.summary.netSalesCents)
              : "Not eligible"}
          </div>
          <div>
            Unmapped:{" "}
            {result.mapped
              ? dollars(
                  result.mapped.mapping
                    .unmappedNetSalesCents,
                )
              : "—"}
          </div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Actual versus forecast
          </h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {result.comparison
              ? dollars(
                  result.comparison.varianceCents,
                )
              : "Unavailable"}
          </div>
          <div>
            Actual:{" "}
            {result.comparison
              ? dollars(
                  result.comparison
                    .actualNetSalesCents,
                )
              : "—"}
          </div>
          <div>
            Forecast:{" "}
            {result.comparison
              ? dollars(
                  result.comparison
                    .forecastNetSalesCents,
                )
              : "—"}
          </div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Forecast-learning input
          </h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {result.learning ? "ELIGIBLE" : "BLOCKED"}
          </div>
          <div>
            Products:{" "}
            {result.learning?.productInputs.length || 0}
          </div>
          <div>Automatic factor change: No</div>
          <div>Manager approval: Required</div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Retry and recovery
          </h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {retry?.status || "ERROR"}
          </div>
          <div>
            Attempt: {retry?.attemptCount ?? "—"} /{" "}
            {contract.retryRecovery.maximumAttempts}
          </div>
          <div>
            Protected successful lines:{" "}
            {retry?.protectedLineCount ?? 0}
          </div>
          <div>
            Manual escalation:{" "}
            {retry?.manualEscalationRequired
              ? "Required"
              : "Not yet"}
          </div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Supplier costs
          </h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {supplier.itemCount} ITEMS
          </div>
          <div>Cost alerts: {supplier.alertCount}</div>
          <div>Duplicate rows: {supplier.duplicateRows.length}</div>
          <div>Automatic menu-price change: No</div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Manual fallback
          </h2>
          <p>
            Manual entry requires a reason, source-document
            reference, audit trail, and approval above the
            configured threshold.
          </p>
          <button
            type="button"
            onClick={testManualFallback}
            style={{ minHeight: 44, width: "100%" }}
          >
            Test manual fallback
          </button>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Render topology
          </h2>
          <div>Web services: 1</div>
          <div>Cron services: 0</div>
          <div>PostgreSQL databases: 1</div>
          <p>
            Imports are not implemented as Render cron jobs.
          </p>
        </article>
      </section>
    </main>
  );
}
`;

fs.writeFileSync(
  path.join(
    componentRoot,
    "PosDataIntegrationsWorkbench1220.tsx",
  ),
  component,
  "utf8",
);

const artifactDir = path.join(
  root,
  "artifacts",
  "build-12.2.0",
);
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(
    artifactDir,
    "pos-data-integrations-workbench-route.json",
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
        "components/pos-data-integrations/PosDataIntegrationsWorkbench1220.tsx",
      productionExposure: "ADMIN_ONLY_OR_DISABLED",
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `PASS — generated Build ${BUILD} Integration Lab at ${routePath}`,
);

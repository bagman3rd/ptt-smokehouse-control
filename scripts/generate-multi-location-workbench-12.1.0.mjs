#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "12.1.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentRoot = path.join(
  root,
  "components",
  "multi-location",
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
      "multi-location-contract-12.1.0.json",
    ),
    "utf8",
  ),
);
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "multi-location-fixtures-12.1.0.json",
    ),
    "utf8",
  ),
);

let routeSlug = "multi-location-lab-1210";
let routeDir = path.join(appRoot, routeSlug);
let routePath = `/${routeSlug}`;

if (fs.existsSync(path.join(routeDir, "page.tsx"))) {
  const existing = fs.readFileSync(
    path.join(routeDir, "page.tsx"),
    "utf8",
  );
  if (!existing.includes("BUILD_12_1_0_GENERATED")) {
    routeSlug = "multi-location-lab-1210-alt";
    routeDir = path.join(appRoot, routeSlug);
    routePath = `/${routeSlug}`;
  }
}

fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentRoot, { recursive: true });

fs.writeFileSync(
  path.join(routeDir, "page.tsx"),
  `// BUILD_12_1_0_GENERATED
import MultiLocationWorkbench1210 from "../../components/multi-location/MultiLocationWorkbench1210";

export default function MultiLocationLabPage() {
  return <MultiLocationWorkbench1210 />;
}
`,
  "utf8",
);

const component = `// BUILD_12_1_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  approveTransferOrder,
  createLocationSwitchRecord,
  createTransferOrder,
  dispatchTransferOrder,
  evaluateLocationDeactivation,
  evaluateLocationOnboarding,
  evaluateLocationReadiness,
  evaluateSingleLocationMigration,
  generateConsolidatedLocationReport,
  receiveTransferOrder,
  resolveLocationContext,
  resolveLocationMasterData,
} from "../../lib/multi-location/build-12.1.0/multi-location-engine.mjs";

const contract = ${JSON.stringify(contract, null, 2)} as any;
const fixtures = ${JSON.stringify(fixtures, null, 2)} as any;

const actors = {
  OWNER: {
    userId: "user-owner",
    tenantId: "tenant-ptt",
  },
  REGIONAL_KM: {
    userId: "user-km-both",
    tenantId: "tenant-ptt",
  },
  PF_KM: {
    userId: "user-km-pf",
    tenantId: "tenant-ptt",
  },
  VIEWER: {
    userId: "user-viewer",
    tenantId: "tenant-ptt",
  },
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export default function MultiLocationWorkbench1210() {
  const [actorKey, setActorKey] =
    useState<keyof typeof actors>("OWNER");
  const [locationId, setLocationId] = useState(
    "loc-pigeon-forge",
  );
  const [missingChicken, setMissingChicken] =
    useState(false);
  const [trainingComplete, setTrainingComplete] =
    useState(true);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [unscopedRecords, setUnscopedRecords] =
    useState(0);
  const [transferStatus, setTransferStatus] =
    useState("NOT_CREATED");
  const [transferRecord, setTransferRecord] =
    useState<any>(null);
  const [message, setMessage] = useState("");

  const actor = actors[actorKey];

  const registry = useMemo(() => {
    const value = clone(fixtures.registry);
    if (missingChicken) {
      value.products = value.products.filter(
        (row: any) =>
          !(
            row.locationId === locationId &&
            row.productCode === "CHICKEN"
          ),
      );
    }
    return value;
  }, [locationId, missingChicken]);

  const contextResult = useMemo(() => {
    try {
      return {
        value: resolveLocationContext(
          registry,
          actor,
          locationId,
        ),
        error: "",
      };
    } catch (error) {
      return {
        value: null,
        error:
          error instanceof Error
            ? error.message
            : "Location context failed.",
      };
    }
  }, [registry, actor, locationId]);

  const readiness = useMemo(() => {
    try {
      return evaluateLocationReadiness(
        registry,
        locationId,
      );
    } catch (error) {
      return {
        status: "ERROR",
        blockers: [
          error instanceof Error
            ? error.message
            : "Readiness failed.",
        ],
        productCount: 0,
        activeSmokerCount: 0,
      };
    }
  }, [registry, locationId]);

  const consolidated = useMemo(() => {
    try {
      return generateConsolidatedLocationReport(
        fixtures.registry,
        contract,
        {
          actor: actors.OWNER,
          tenantId: "tenant-ptt",
          metrics: fixtures.locationMetrics,
        },
      );
    } catch {
      return null;
    }
  }, []);

  const onboarding = useMemo(
    () =>
      evaluateLocationOnboarding(contract, {
        tenantId: "tenant-ptt",
        locationId: "loc-future",
        evidence: {
          ...fixtures.onboardingEvidence,
          training: trainingComplete,
        },
        evaluatedAt: "2026-08-02T20:00:00.000Z",
      }),
    [trainingComplete],
  );

  const deactivation = useMemo(
    () =>
      evaluateLocationDeactivation(
        fixtures.registry,
        contract,
        {
          actor: actors.OWNER,
          locationId: "loc-knoxville-lab",
          evidence: {
            ...fixtures.deactivationEvidence,
            openTransfer,
          },
          reviewedAt: "2026-08-02T20:05:00.000Z",
        },
      ),
    [openTransfer],
  );

  const migration = useMemo(() => {
    const snapshot = clone(fixtures.migrationSnapshot);
    snapshot.tables[0].unscopedRecords =
      unscopedRecords;
    return evaluateSingleLocationMigration(snapshot);
  }, [unscopedRecords]);

  const createSwitch = () => {
    try {
      const record = createLocationSwitchRecord(
        fixtures.registry,
        contract,
        {
          actor,
          fromLocationId:
            locationId === "loc-pigeon-forge"
              ? "loc-knoxville-lab"
              : "loc-pigeon-forge",
          toLocationId: locationId,
          occurredAt: "2026-08-02T20:10:00.000Z",
          reason: "Validation workbench location switch",
          requestId: "workbench-switch-1210",
        },
      );
      setMessage(
        \`Switch record created: \${record.switchId}\`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Switch failed.",
      );
    }
  };

  const resolveBrisket = () => {
    try {
      const result = resolveLocationMasterData(
        registry,
        {
          tenantId: "tenant-ptt",
          locationId,
          productCode: "BRISKET",
        },
      );
      setMessage(
        \`\${locationId} brisket baseline: \${result.product.forecastBaselineCookedLb} cooked lb\`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Master-data lookup failed.",
      );
    }
  };

  const advanceTransfer = () => {
    try {
      if (!transferRecord) {
        const draft = createTransferOrder(
          fixtures.registry,
          contract,
          fixtures.transferRequest,
        );
        setTransferRecord(draft);
        setTransferStatus(draft.status);
        setMessage("Transfer created.");
        return;
      }
      if (transferRecord.status === "DRAFT") {
        const approved = approveTransferOrder(
          fixtures.registry,
          contract,
          transferRecord,
          {
            actor: actors.REGIONAL_KM,
            commandId: "workbench-transfer-approve",
            occurredAt: "2026-08-02T20:15:00.000Z",
            reason: "Workbench approval",
          },
        );
        setTransferRecord(approved.record);
        setTransferStatus(approved.record.status);
        setMessage("Transfer approved.");
        return;
      }
      if (transferRecord.status === "APPROVED") {
        const dispatched = dispatchTransferOrder(
          fixtures.registry,
          contract,
          transferRecord,
          {
            actor: {
              userId: "user-pit-pf",
              tenantId: "tenant-ptt",
            },
            commandId: "workbench-transfer-dispatch",
            occurredAt: "2026-08-02T20:20:00.000Z",
            shippedItems:
              fixtures.transferRequest.items,
          },
        );
        setTransferRecord(dispatched.record);
        setTransferStatus(dispatched.record.status);
        setMessage("Transfer dispatched.");
        return;
      }
      if (transferRecord.status === "IN_TRANSIT") {
        const received = receiveTransferOrder(
          fixtures.registry,
          contract,
          transferRecord,
          {
            actor: {
              userId: "user-kc-kx",
              tenantId: "tenant-ptt",
            },
            commandId: "workbench-transfer-receive",
            occurredAt: "2026-08-02T20:30:00.000Z",
            receivedItems:
              fixtures.transferRequest.items,
          },
        );
        setTransferRecord(received.record);
        setTransferStatus(received.record.status);
        setMessage("Transfer received.");
        return;
      }
      setMessage("Transfer lifecycle is complete.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Transfer action failed.",
      );
    }
  };

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
          Multi-Location Foundation
        </h1>
        <p
          style={{
            maxWidth: 1080,
            fontSize: 18,
            lineHeight: 1.55,
          }}
        >
          Validate explicit location context, scoped permissions,
          location-specific products and smokers, transfer
          reconciliation, consolidated owner reporting, onboarding,
          deactivation, and migration readiness. This lab does not
          perform a database migration or claim durable
          multi-location persistence.
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
          <span style={{ fontWeight: 900 }}>Actor</span>
          <select
            value={actorKey}
            onChange={(event: any) =>
              setActorKey(
                event.target.value as keyof typeof actors,
              )
            }
            style={{ minHeight: 44 }}
          >
            {Object.keys(actors).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
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
          <span style={{ fontWeight: 900 }}>Location</span>
          <select
            value={locationId}
            onChange={(event: any) =>
              setLocationId(event.target.value)
            }
            style={{ minHeight: 44 }}
          >
            {fixtures.registry.locations.map(
              (location: any) => (
                <option
                  key={location.locationId}
                  value={location.locationId}
                >
                  {location.code} · {location.status}
                </option>
              ),
            )}
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
            Required CHICKEN config
          </span>
          <select
            value={missingChicken ? "missing" : "present"}
            onChange={(event: any) =>
              setMissingChicken(
                event.target.value === "missing",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="present">Present</option>
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
            Future-location training
          </span>
          <select
            value={
              trainingComplete ? "complete" : "missing"
            }
            onChange={(event: any) =>
              setTrainingComplete(
                event.target.value === "complete",
              )
            }
            style={{ minHeight: 44 }}
          >
            <option value="complete">Complete</option>
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
            Knoxville open transfer
          </span>
          <select
            value={openTransfer ? "open" : "none"}
            onChange={(event: any) =>
              setOpenTransfer(event.target.value === "open")
            }
            style={{ minHeight: 44 }}
          >
            <option value="none">None</option>
            <option value="open">Open</option>
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
            Unscoped Forecast rows
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={unscopedRecords}
            onChange={(event: any) =>
              setUnscopedRecords(
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
          minHeight: 52,
          border: "1px solid currentColor",
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
          fontWeight: 800,
        }}
      >
        {message ||
          contextResult.error ||
          "Select an actor and location, then exercise location-scoped controls."}
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
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
          <h2 style={{ marginTop: 0 }}>Location context</h2>
          <div>
            Status:{" "}
            {contextResult.value ? "AUTHORIZED" : "BLOCKED"}
          </div>
          <div>
            Active:{" "}
            {contextResult.value?.activeLocationId || "None"}
          </div>
          <div>
            Accessible:{" "}
            {contextResult.value?.accessibleLocations.length ||
              0}
          </div>
          <button
            type="button"
            onClick={createSwitch}
            style={{
              minHeight: 44,
              width: "100%",
              marginTop: 12,
            }}
          >
            Create switch audit record
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
            Location readiness
          </h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {readiness.status}
          </div>
          <div>Products: {readiness.productCount}</div>
          <div>Smokers: {readiness.activeSmokerCount}</div>
          <div>
            Blockers:{" "}
            {(readiness.blockers || []).join(", ") || "None"}
          </div>
          <button
            type="button"
            onClick={resolveBrisket}
            style={{
              minHeight: 44,
              width: "100%",
              marginTop: 12,
            }}
          >
            Resolve location BRISKET config
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
            Inter-location transfer
          </h2>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {transferStatus}
          </div>
          <div>
            Route: PTT-PF → PTT-KX
          </div>
          <div>Quantity: 20 cooked lb</div>
          <button
            type="button"
            onClick={advanceTransfer}
            style={{
              minHeight: 44,
              width: "100%",
              marginTop: 12,
            }}
          >
            Advance transfer lifecycle
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
            Consolidated owner report
          </h2>
          <div>Locations: {consolidated?.locationCount}</div>
          <div>
            Sales: $
            {consolidated?.totals.sales.toLocaleString()}
          </div>
          <div>
            Food: $
            {consolidated?.totals.foodSales.toLocaleString()}
          </div>
          <div>
            Internal transfer net:{" "}
            {consolidated?.totals.netTransferCookedLb} lb
          </div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Onboarding</h2>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            {onboarding.status}
          </div>
          <div>
            Passed:{" "}
            {
              onboarding.controls.filter(
                (row: any) => row.passed,
              ).length
            }{" "}
            / {onboarding.controls.length}
          </div>
          <div>
            Blockers: {onboarding.blockers.join(", ") || "None"}
          </div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Deactivation</h2>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            {deactivation.status}
          </div>
          <div>
            Blockers:{" "}
            {deactivation.blockers.join(", ") || "None"}
          </div>
          <div>Historical data retained: Yes</div>
        </article>

        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 18,
            padding: 17,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Migration readiness
          </h2>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            {migration.status}
          </div>
          <div>
            Total records:{" "}
            {migration.totalRecords.toLocaleString()}
          </div>
          <div>
            Unscoped records: {migration.unscopedRecords}
          </div>
          <div>Automatic migration executed: No</div>
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
            Build 12.1.0 preserves the deployed no-cron
            topology.
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
    "MultiLocationWorkbench1210.tsx",
  ),
  component,
  "utf8",
);

const artifactDir = path.join(
  root,
  "artifacts",
  "build-12.1.0",
);
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(
    artifactDir,
    "multi-location-workbench-route.json",
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
        "components/multi-location/MultiLocationWorkbench1210.tsx",
      productionExposure: "ADMIN_ONLY_OR_DISABLED",
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `PASS — generated Build ${BUILD} Multi-Location Lab at ${routePath}`,
);

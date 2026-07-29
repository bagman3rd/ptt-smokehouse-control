#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.4.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentsRoot = path.join(root, "components", "production-planning");

if (!fs.existsSync(appRoot)) {
  console.error("FAIL — app directory not found.");
  process.exit(1);
}

let routeSlug = "production-lab-1140";
let routeDir = path.join(appRoot, "admin", routeSlug);
let routePath = `/admin/${routeSlug}`;

if (fs.existsSync(path.join(routeDir, "page.tsx"))) {
  const existing = fs.readFileSync(path.join(routeDir, "page.tsx"), "utf8");
  if (!existing.includes("BUILD_11_4_0_GENERATED")) {
    routeSlug = "production-lab-1140-alt";
    routeDir = path.join(appRoot, "admin", routeSlug);
    routePath = `/admin/${routeSlug}`;
  }
}

fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentsRoot, { recursive: true });

fs.writeFileSync(
  path.join(routeDir, "page.tsx"),
  `// BUILD_11_4_0_GENERATED
import ProductionPlanningWorkbench1140 from "../../../components/production-planning/ProductionPlanningWorkbench1140";

export default function ProductionPlanningLabPage() {
  return <ProductionPlanningWorkbench1140 />;
}
`,
  "utf8",
);

const component = `// BUILD_11_4_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  calculateProductionPlan,
  createProductionApprovalRecord,
  type ProductionPlanInput,
  type ProductionProductCode,
} from "../../lib/production-planning/build-11.4.0/production-planning-engine.mjs";

const productNames: Record<ProductionProductCode, string> = {
  BRISKET: "Brisket",
  PORK: "Pork",
  RIBS: "Ribs",
  CHICKEN: "Pulled Chicken",
};

const validationInput: ProductionPlanInput = {
  serviceDate: "2026-08-03",
  forecastCalculationId: "validation-fc-1140",
  demand: { BRISKET: 126, PORK: 126, RIBS: 20, CHICKEN: 20 },
  products: [
    {
      code: "BRISKET", planningMode: "WEIGHT_YIELD", yieldPercent: 50,
      rawWeightPerUnitLb: 14, cookedWeightPerUnitLb: null,
      sealedCarryoverEligible: false, bufferPercent: 0, bufferReason: "",
      carryover: { sourceOperatingDate: "2026-08-02", sealedUnits: 0, openCookedLb: 0 },
      schedule: { classification: "OVERNIGHT", windowStartOffsetMinutes: -900, windowEndOffsetMinutes: -180, durationMinutes: 720 },
    },
    {
      code: "PORK", planningMode: "WEIGHT_YIELD", yieldPercent: 55,
      rawWeightPerUnitLb: 9, cookedWeightPerUnitLb: null,
      sealedCarryoverEligible: true, bufferPercent: 0, bufferReason: "",
      carryover: { sourceOperatingDate: "2026-08-02", sealedUnits: 0, openCookedLb: 0 },
      schedule: { classification: "OVERNIGHT", windowStartOffsetMinutes: -420, windowEndOffsetMinutes: 660, durationMinutes: 720 },
    },
    {
      code: "RIBS", planningMode: "UNIT_COUNT", yieldPercent: 90,
      rawWeightPerUnitLb: 3.3, cookedWeightPerUnitLb: 3,
      sealedCarryoverEligible: true, bufferPercent: 0, bufferReason: "",
      carryover: { sourceOperatingDate: "2026-08-02", sealedUnits: 2, openCookedLb: 3 },
      schedule: { classification: "SAME_DAY", windowStartOffsetMinutes: 0, windowEndOffsetMinutes: 660, durationMinutes: 300 },
    },
    {
      code: "CHICKEN", planningMode: "UNIT_COUNT", yieldPercent: 75,
      rawWeightPerUnitLb: 2.5, cookedWeightPerUnitLb: 1.875,
      sealedCarryoverEligible: true, bufferPercent: 0, bufferReason: "",
      carryover: { sourceOperatingDate: "2026-08-02", sealedUnits: 2, openCookedLb: 1.875 },
      schedule: { classification: "SAME_DAY", windowStartOffsetMinutes: 0, windowEndOffsetMinutes: 660, durationMinutes: 180 },
    },
  ],
  smokers: [
    {
      id: "ole", name: "Ole Hickory EL-ED/X", brand: "Ole Hickory", model: "EL-ED/X",
      location: "Indoors under hood", cookWindow: "All day / flexible", active: true,
      availability: [{ startOffsetMinutes: -1440, endOffsetMinutes: 1440 }],
      capacities: { BRISKET: 40, PORK: 80, RIBS: 30, CHICKEN: 70 },
      validationOnlyCapacities: ["RIBS", "CHICKEN"],
    },
    {
      id: "sp", name: "Southern Pride SPK-700", brand: "Southern Pride", model: "SPK-700",
      location: "Outdoor", cookWindow: "All day / flexible", active: true,
      availability: [{ startOffsetMinutes: -1440, endOffsetMinutes: 1440 }],
      capacities: { BRISKET: 48, PORK: 84, RIBS: 36, CHICKEN: 84 },
      validationOnlyCapacities: ["RIBS", "CHICKEN"],
    },
  ],
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ProductionPlanningWorkbench1140() {
  const [input, setInput] = useState<ProductionPlanInput>(validationInput);
  const [actor, setActor] = useState("Kitchen Manager");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    try {
      return { plan: calculateProductionPlan(input), error: "" };
    } catch (error) {
      return {
        plan: null,
        error: error instanceof Error ? error.message : "Unable to calculate production plan.",
      };
    }
  }, [input]);

  const updateDemand = (code: ProductionProductCode, value: number) => {
    setCopied(false);
    setInput((current) => ({
      ...current,
      demand: { ...current.demand, [code]: value },
    }));
  };

  const updateProduct = (
    code: ProductionProductCode,
    mutate: (product: ProductionPlanInput["products"][number]) => ProductionPlanInput["products"][number],
  ) => {
    setCopied(false);
    setInput((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.code === code ? mutate(product) : product,
      ),
    }));
  };

  const copyApproval = async () => {
    if (!result.plan || !result.plan.review.approvalAllowed) return;
    try {
      const approval = createProductionApprovalRecord(result.plan, {
        actor,
        reason: result.plan.review.warnings.length
          ? "Validation warnings reviewed"
          : "Production validation plan approved",
      });
      await navigator.clipboard.writeText(JSON.stringify(approval, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 18px 64px" }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Build ${BUILD} validation lab
        </p>
        <h1 style={{ margin: "8px 0 12px", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1 }}>
          Production Planning and Smoker Scheduling
        </h1>
        <p style={{ maxWidth: 920, fontSize: 18, lineHeight: 1.55 }}>
          Convert approved demand into carryover-adjusted requirements, raw quantities, whole operational units,
          and non-overlapping smoker batches. This lab does not persist production records.
        </p>
        <p style={{ maxWidth: 920, fontWeight: 800 }}>
          Brisket and pork raw unit weights, pork/rib/chicken durations, and rib/chicken capacities are
          validation inputs—not approved PTT master data. Replace them with measured values before production release.
        </p>
      </header>

      <section aria-labelledby="planning-inputs" style={{ border: "1px solid currentColor", borderRadius: 18, padding: 20, marginBottom: 24 }}>
        <h2 id="planning-inputs" style={{ marginTop: 0 }}>Planning inputs</h2>
        <label style={{ display: "grid", gap: 6, maxWidth: 280, marginBottom: 18 }}>
          <span style={{ fontWeight: 800 }}>Service date</span>
          <input
            type="date"
            value={input.serviceDate}
            onChange={(event: any) => {
              setCopied(false);
              setInput((current) => ({ ...current, serviceDate: event.target.value }));
            }}
          />
        </label>

        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1050 }}>
            <thead>
              <tr>
                {["Product", "Demand", "Yield %", "Raw unit lb", "Buffer %", "Sealed", "Open cooked lb", "Duration min"].map((heading) => (
                  <th key={heading} style={{ textAlign: "left", padding: 9, borderBottom: "2px solid currentColor" }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {input.products.map((product) => (
                <tr key={product.code}>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 900 }}>{productNames[product.code]}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                    <input aria-label={\`\${productNames[product.code]} forecast demand\`} type="number" min="0" step="0.1"
                      value={input.demand[product.code]}
                      onChange={(event: any) => updateDemand(product.code, numberValue(event.target.value))}
                      style={{ width: 90 }} />
                  </td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                    <input aria-label={\`\${productNames[product.code]} yield percent\`} type="number" min="1" max="100" step="0.1"
                      value={product.yieldPercent}
                      onChange={(event: any) => updateProduct(product.code, (current) => ({ ...current, yieldPercent: numberValue(event.target.value) }))}
                      style={{ width: 80 }} />
                  </td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                    <input aria-label={\`\${productNames[product.code]} raw unit weight\`} type="number" min="0" step="0.1"
                      value={product.rawWeightPerUnitLb ?? ""}
                      onChange={(event: any) => updateProduct(product.code, (current) => ({
                        ...current,
                        rawWeightPerUnitLb: event.target.value === "" ? null : numberValue(event.target.value),
                      }))}
                      style={{ width: 90 }} />
                  </td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                    <input aria-label={\`\${productNames[product.code]} buffer percent\`} type="number" min="0" max="50" step="1"
                      value={product.bufferPercent}
                      onChange={(event: any) => updateProduct(product.code, (current) => ({
                        ...current,
                        bufferPercent: numberValue(event.target.value),
                        bufferReason: numberValue(event.target.value) > 10 ? "Validation buffer" : "",
                      }))}
                      style={{ width: 75 }} />
                  </td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                    <input aria-label={\`\${productNames[product.code]} sealed carryover units\`} type="number" min="0" step="1"
                      value={product.carryover.sealedUnits}
                      onChange={(event: any) => updateProduct(product.code, (current) => ({
                        ...current,
                        carryover: { ...current.carryover, sealedUnits: numberValue(event.target.value) },
                      }))}
                      style={{ width: 75 }} />
                  </td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                    <input aria-label={\`\${productNames[product.code]} opened cooked pounds\`} type="number" min="0" step="0.1"
                      value={product.carryover.openCookedLb}
                      onChange={(event: any) => updateProduct(product.code, (current) => ({
                        ...current,
                        carryover: { ...current.carryover, openCookedLb: numberValue(event.target.value) },
                      }))}
                      style={{ width: 90 }} />
                  </td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                    <input aria-label={\`\${productNames[product.code]} cook duration minutes\`} type="number" min="1" step="15"
                      value={product.schedule.durationMinutes ?? ""}
                      onChange={(event: any) => updateProduct(product.code, (current) => ({
                        ...current,
                        schedule: { ...current.schedule, durationMinutes: event.target.value === "" ? null : numberValue(event.target.value) },
                      }))}
                      style={{ width: 95 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {result.error ? (
        <div role="alert" style={{ border: "2px solid currentColor", borderRadius: 14, padding: 16 }}>
          <strong>Planning blocked:</strong> {result.error}
        </div>
      ) : result.plan ? (
        <div style={{ display: "grid", gap: 22 }}>
          <section aria-labelledby="plan-status" style={{ border: "1px solid currentColor", borderRadius: 18, padding: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 id="plan-status" style={{ margin: 0 }}>Plan status: {result.plan.review.status}</h2>
                <p style={{ marginBottom: 0 }}>
                  {result.plan.serviceDayName}, {result.plan.serviceDate} · {result.plan.schedule.batchCount} batches · {result.plan.schedule.unscheduledUnits} unscheduled units
                </p>
              </div>
              <div style={{ fontWeight: 900 }}>{result.plan.planId}</div>
            </div>
            {result.plan.review.blockers.length ? (
              <><h3>Blockers</h3><ul>{result.plan.review.blockers.map((item) => <li key={item}>{item}</li>)}</ul></>
            ) : null}
            {result.plan.review.warnings.length ? (
              <><h3>Warnings</h3><ul>{result.plan.review.warnings.map((item) => <li key={item}>{item}</li>)}</ul></>
            ) : null}
          </section>

          <section aria-labelledby="requirements">
            <h2 id="requirements">Production requirements</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
                <thead><tr>
                  {["Product", "Forecast", "Carryover", "Net demand", "Exact raw lb", "Planned units", "Planned raw lb", "Overage"].map((heading) => (
                    <th key={heading} style={{ textAlign: "left", padding: 9, borderBottom: "2px solid currentColor" }}>{heading}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {result.plan.requirements.map((row) => (
                    <tr key={row.productCode}>
                      <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 900 }}>{row.productName}</td>
                      <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{row.forecastDemand.toFixed(1)}</td>
                      <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{row.carryover.totalCredit.toFixed(1)}</td>
                      <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{row.netDemand.toFixed(1)}</td>
                      <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{row.exactRawLb.toFixed(1)}</td>
                      <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 900 }}>{row.plannedUnits ?? "Blocked"}</td>
                      <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{row.plannedRawLb.toFixed(1)}</td>
                      <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{row.roundingOverage.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="smoker-schedule">
            <h2 id="smoker-schedule">Smoker schedule</h2>
            {result.plan.schedule.bookings.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
                  <thead><tr>
                    {["Start", "End", "Smoker", "Product", "Quantity", "Capacity", "Utilization", "Backup"].map((heading) => (
                      <th key={heading} style={{ textAlign: "left", padding: 9, borderBottom: "2px solid currentColor" }}>{heading}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {result.plan.schedule.bookings.map((booking) => (
                      <tr key={booking.batchId}>
                        <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{booking.start.localLabel}</td>
                        <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{booking.end.localLabel}</td>
                        <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 800 }}>{booking.smokerName}</td>
                        <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{booking.productName}</td>
                        <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{booking.quantity}</td>
                        <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{booking.capacity}</td>
                        <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{booking.utilizationPercent}%</td>
                        <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{booking.backupUsed ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>No smoker batch is currently scheduled.</p>}
          </section>

          <section aria-labelledby="approval-payload" style={{ border: "1px solid currentColor", borderRadius: 18, padding: 20 }}>
            <h2 id="approval-payload" style={{ marginTop: 0 }}>Approval payload</h2>
            <p>This copies the immutable validation payload. It does not save or approve a production record.</p>
            <label style={{ display: "grid", gap: 6, maxWidth: 400 }}>
              <span style={{ fontWeight: 800 }}>Approval actor</span>
              <input value={actor} onChange={(event: any) => { setActor(event.target.value); setCopied(false); }} />
            </label>
            <button type="button" disabled={!result.plan.review.approvalAllowed} onClick={copyApproval}
              style={{ minHeight: 44, marginTop: 12, padding: "9px 15px", fontWeight: 900 }}>
              Copy production approval JSON
            </button>
            <span aria-live="polite" style={{ marginLeft: 10 }}>{copied ? "Copied." : ""}</span>
          </section>
        </div>
      ) : null}
    </main>
  );
}
`;

fs.writeFileSync(
  path.join(componentsRoot, "ProductionPlanningWorkbench1140.tsx"),
  component,
  "utf8",
);

const artifactDir = path.join(root, "artifacts", "build-11.4.0");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "production-workbench-route.json"),
  `${JSON.stringify({
    buildVersion: BUILD,
    route: routePath,
    pageSource: path.relative(root, path.join(routeDir, "page.tsx")).split(path.sep).join("/"),
    componentSource: "components/production-planning/ProductionPlanningWorkbench1140.tsx",
    generatedAt: new Date().toISOString(),
  }, null, 2)}\n`,
  "utf8",
);

console.log(`PASS — generated Build ${BUILD} Production Planning Lab at ${routePath}`);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.3.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentsRoot = path.join(root, "components", "forecasting");

if (!fs.existsSync(appRoot)) {
  console.error("FAIL — app directory not found.");
  process.exit(1);
}

let routeSlug = "forecast-lab-1130";
let routeDir = path.join(appRoot, "admin", routeSlug);
let routePath = `/admin/${routeSlug}`;
const existingPage = path.join(routeDir, "page.tsx");

if (fs.existsSync(existingPage)) {
  const source = fs.readFileSync(existingPage, "utf8");
  if (!source.includes("BUILD_11_3_0_GENERATED")) {
    routeSlug = "forecast-lab-1130-alt";
    routeDir = path.join(appRoot, "admin", routeSlug);
    routePath = `/admin/${routeSlug}`;
  }
}

fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentsRoot, { recursive: true });

const page = `// BUILD_11_3_0_GENERATED
import ForecastWorkbench1130 from "../../../components/forecasting/ForecastWorkbench1130";

export default function ForecastValidationLabPage() {
  return <ForecastWorkbench1130 />;
}
`;
fs.writeFileSync(path.join(routeDir, "page.tsx"), page, "utf8");

const component = `// BUILD_11_3_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  FORECAST_PRODUCTS,
  calculateForecast,
  createForecastApprovalRecord,
  type ForecastInput,
  type ForecastProductCode,
} from "../../lib/forecasting/build-11.3.0/forecast-engine.mjs";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const initialDate = "2026-08-01";

const initialInput: ForecastInput = {
  operatingDate: initialDate,
  baselineDemand: {
    BRISKET: 100,
    PORK: 100,
    RIBS: 40,
    CHICKEN: 70,
  },
  monthlyFactor: 1,
  eventAdjustmentPercent: 0,
  manualAdjustmentPercent: 0,
  reason: "",
  eventCertainty: "HIGH",
  dataFreshnessDays: 3,
  recentSampleDays: 42,
  recentMapePercent: 8,
  modeledSalesDollars: 0,
  smokedFoodShareOfFoodPercent: 50,
};

function numericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ForecastWorkbench1130() {
  const [input, setInput] = useState<ForecastInput>(initialInput);
  const [actor, setActor] = useState("Kitchen Manager");
  const [copied, setCopied] = useState(false);

  const outcome = useMemo(() => {
    try {
      return { calculation: calculateForecast(input), error: "" };
    } catch (error) {
      return {
        calculation: null,
        error: error instanceof Error ? error.message : "Unable to calculate forecast.",
      };
    }
  }, [input]);

  const update = <K extends keyof ForecastInput>(key: K, value: ForecastInput[K]) => {
    setCopied(false);
    setInput((current) => ({ ...current, [key]: value }));
  };

  const updateBaseline = (code: ForecastProductCode, value: number) => {
    setCopied(false);
    setInput((current) => ({
      ...current,
      baselineDemand: { ...current.baselineDemand, [code]: value },
    }));
  };

  const copyApproval = async () => {
    if (!outcome.calculation) return;
    try {
      const record = createForecastApprovalRecord(outcome.calculation, {
        actor,
        reason: input.reason || "Forecast calculation reviewed",
      });
      await navigator.clipboard.writeText(JSON.stringify(record, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 18px 64px" }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Build ${BUILD} validation lab
        </p>
        <h1 style={{ margin: "8px 0 12px", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1 }}>
          Forecast and Demand
        </h1>
        <p style={{ maxWidth: 900, fontSize: 18, lineHeight: 1.55 }}>
          Reproduce and explain the approved forecast formula before production planning. This lab does not
          write production records. It proves demand calculations, confidence, review triggers and approval payloads.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 430px) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        <section aria-labelledby="forecast-inputs" style={{ border: "1px solid currentColor", borderRadius: 18, padding: 20 }}>
          <h2 id="forecast-inputs" style={{ marginTop: 0 }}>Forecast inputs</h2>

          <label style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            <span style={{ fontWeight: 800 }}>Operating date</span>
            <input
              type="date"
              value={input.operatingDate}
              onChange={(event) => update("operatingDate", event.target.value)}
              style={{ minHeight: 44, padding: "8px 10px" }}
            />
          </label>

          <fieldset style={{ border: 0, padding: 0, margin: "0 0 18px" }}>
            <legend style={{ fontWeight: 900, marginBottom: 8 }}>Average-day baseline demand</legend>
            <div style={{ display: "grid", gap: 10 }}>
              {FORECAST_PRODUCTS.map((product) => (
                <label key={product.code} style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10, alignItems: "center" }}>
                  <span>{product.name} <small>({product.unit})</small></span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={input.baselineDemand[product.code]}
                    onChange={(event) => updateBaseline(product.code, numericValue(event.target.value))}
                    style={{ minHeight: 42, padding: "7px 9px" }}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Monthly factor</span>
              <input
                type="number"
                min="0.5"
                max="2"
                step="0.01"
                value={input.monthlyFactor}
                onChange={(event) => update("monthlyFactor", numericValue(event.target.value))}
                style={{ minHeight: 42, padding: "7px 9px" }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Event adjustment %</span>
              <input
                type="number"
                min="-50"
                max="300"
                step="1"
                value={input.eventAdjustmentPercent}
                onChange={(event) => update("eventAdjustmentPercent", numericValue(event.target.value))}
                style={{ minHeight: 42, padding: "7px 9px" }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Event certainty</span>
              <select
                value={input.eventCertainty}
                onChange={(event) => update("eventCertainty", event.target.value as ForecastInput["eventCertainty"])}
                style={{ minHeight: 42, padding: "7px 9px" }}
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Manual adjustment %</span>
              <input
                type="number"
                min="-50"
                max="200"
                step="1"
                value={input.manualAdjustmentPercent}
                onChange={(event) => update("manualAdjustmentPercent", numericValue(event.target.value))}
                style={{ minHeight: 42, padding: "7px 9px" }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6, marginTop: 14 }}>
            <span style={{ fontWeight: 800 }}>Review or override reason</span>
            <textarea
              value={input.reason}
              onChange={(event) => update("reason", event.target.value)}
              rows={3}
              placeholder="Required for manual adjustments or an automatic factor outside 0.50–2.00."
              style={{ padding: 10, resize: "vertical" }}
            />
          </label>

          <h3 style={{ marginBottom: 10 }}>Confidence evidence</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Freshness days</span>
              <input type="number" min="0" value={input.dataFreshnessDays} onChange={(event) => update("dataFreshnessDays", numericValue(event.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Sample days</span>
              <input type="number" min="0" value={input.recentSampleDays} onChange={(event) => update("recentSampleDays", numericValue(event.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Recent MAPE %</span>
              <input type="number" min="0" max="100" value={input.recentMapePercent} onChange={(event) => update("recentMapePercent", numericValue(event.target.value))} />
            </label>
          </div>

          <h3 style={{ marginBottom: 10 }}>Sales display</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Modeled sales</span>
              <input type="number" min="0" step="100" value={input.modeledSalesDollars} onChange={(event) => update("modeledSalesDollars", numericValue(event.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Smoked food % of food</span>
              <input type="number" min="0" max="100" value={input.smokedFoodShareOfFoodPercent} onChange={(event) => update("smokedFoodShareOfFoodPercent", numericValue(event.target.value))} />
            </label>
          </div>
        </section>

        <section aria-labelledby="forecast-result">
          <h2 id="forecast-result" style={{ marginTop: 0 }}>Calculated demand</h2>
          {outcome.error ? (
            <div role="alert" style={{ border: "2px solid currentColor", borderRadius: 14, padding: 16 }}>
              <strong>Calculation blocked:</strong> {outcome.error}
            </div>
          ) : outcome.calculation ? (
            <div style={{ display: "grid", gap: 18 }}>
              <article style={{ border: "1px solid currentColor", borderRadius: 18, padding: 20 }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 900 }}>
                      {outcome.calculation.dayOfWeek.name}, {outcome.calculation.operatingDate}
                    </p>
                    <p style={{ margin: "5px 0 0" }}>
                      DOW share {outcome.calculation.dayOfWeek.share}% · factor {outcome.calculation.dayOfWeek.factor.toFixed(3)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{outcome.calculation.confidence.badge} confidence</strong>
                    <div>{outcome.calculation.confidence.score}/100</div>
                  </div>
                </div>
              </article>

              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 660 }}>
                  <thead>
                    <tr>
                      {["Product", "Baseline", "Automatic", "Final demand", "Unit"].map((heading) => (
                        <th key={heading} style={{ textAlign: "left", padding: 10, borderBottom: "2px solid currentColor" }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {outcome.calculation.demand.lines.map((line) => (
                      <tr key={line.productCode}>
                        <td style={{ padding: 10, borderBottom: "1px solid currentColor", fontWeight: 800 }}>{line.productName}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid currentColor" }}>{number.format(line.baselineDemand)}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid currentColor" }}>{number.format(line.automaticDemand)}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid currentColor", fontWeight: 900 }}>{number.format(line.displayDemand)}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid currentColor" }}>{line.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <article style={{ border: "1px solid currentColor", borderRadius: 18, padding: 20 }}>
                <h3 style={{ marginTop: 0 }}>Formula</h3>
                <p>
                  DOW {outcome.calculation.dayOfWeek.factor.toFixed(3)}
                  {" × "}month {outcome.calculation.factors.monthlyFactor.toFixed(3)}
                  {" × "}event {outcome.calculation.factors.eventFactor.toFixed(3)}
                  {" × "}manual {outcome.calculation.factors.manualFactor.toFixed(3)}
                  {" = "}<strong>{outcome.calculation.factors.finalFactor.toFixed(3)}</strong>
                </p>
                <ul>
                  {outcome.calculation.explanation.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>

              {input.modeledSalesDollars > 0 ? (
                <article style={{ border: "1px solid currentColor", borderRadius: 18, padding: 20 }}>
                  <h3 style={{ marginTop: 0 }}>Sales model display</h3>
                  <p>
                    Modeled sales {currency.format(outcome.calculation.salesDisplay.modeledSalesDollars)}:
                    {" "}bar {currency.format(outcome.calculation.salesDisplay.barSalesDollars)} (20%),
                    {" "}food {currency.format(outcome.calculation.salesDisplay.foodSalesDollars)} (80%),
                    {" "}smoked food {currency.format(outcome.calculation.salesDisplay.smokedFoodSalesDollars)}.
                  </p>
                </article>
              ) : null}

              <article style={{ border: "1px solid currentColor", borderRadius: 18, padding: 20 }}>
                <h3 style={{ marginTop: 0 }}>Review and approval payload</h3>
                <p>
                  {outcome.calculation.review.approvalRequired
                    ? "Manager review is required before this forecast is treated as approved."
                    : "No adjustment-triggered approval is required; normal workflow approval still applies."}
                </p>
                {outcome.calculation.review.warnings.length ? (
                  <ul>
                    {outcome.calculation.review.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                ) : <p>No calculation warning is active.</p>}
                <label style={{ display: "grid", gap: 6, maxWidth: 420 }}>
                  <span style={{ fontWeight: 800 }}>Approval actor</span>
                  <input value={actor} onChange={(event) => { setActor(event.target.value); setCopied(false); }} />
                </label>
                <button
                  type="button"
                  onClick={copyApproval}
                  style={{ minHeight: 44, marginTop: 12, padding: "9px 15px", fontWeight: 900, cursor: "pointer" }}
                >
                  Copy approval record JSON
                </button>
                <span aria-live="polite" style={{ marginLeft: 10 }}>{copied ? "Copied." : ""}</span>
              </article>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
`;
fs.writeFileSync(
  path.join(componentsRoot, "ForecastWorkbench1130.tsx"),
  component,
  "utf8",
);

const artifactDir = path.join(root, "artifacts", "build-11.3.0");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "forecast-workbench-route.json"),
  `${JSON.stringify({
    buildVersion: BUILD,
    route: routePath,
    pageSource: path.relative(root, path.join(routeDir, "page.tsx")).split(path.sep).join("/"),
    componentSource: "components/forecasting/ForecastWorkbench1130.tsx",
    generatedAt: new Date().toISOString(),
  }, null, 2)}\n`,
  "utf8",
);

console.log(`PASS — generated Build ${BUILD} Forecast Validation Lab at ${routePath}`);

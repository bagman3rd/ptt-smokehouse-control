#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.7.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentRoot = path.join(
  root,
  "components",
  "reporting-learning",
);

if (!fs.existsSync(appRoot)) {
  console.error("FAIL — app directory not found.");
  process.exit(1);
}

const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "reporting-learning-fixtures-11.7.0.json",
    ),
    "utf8",
  ),
);

let routeSlug = "reports-lab-1170";
let routeDir = path.join(appRoot, routeSlug);
let routePath = `/${routeSlug}`;
if (fs.existsSync(path.join(routeDir, "page.tsx"))) {
  const existing = fs.readFileSync(
    path.join(routeDir, "page.tsx"),
    "utf8",
  );
  if (!existing.includes("BUILD_11_7_0_GENERATED")) {
    routeSlug = "reports-lab-1170-alt";
    routeDir = path.join(appRoot, routeSlug);
    routePath = `/${routeSlug}`;
  }
}

fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentRoot, { recursive: true });

fs.writeFileSync(
  path.join(routeDir, "page.tsx"),
  `// BUILD_11_7_0_GENERATED
import ReportingLearningWorkbench1170 from "../../components/reporting-learning/ReportingLearningWorkbench1170";

export default function ReportingLearningLabPage() {
  return <ReportingLearningWorkbench1170 />;
}
`,
  "utf8",
);

const component = `// BUILD_11_7_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  FORMULA_GLOSSARY,
  approveForecastLearningRecommendation,
  createReportExport,
  generateDailyOperationsReport,
  generateForecastLearningRecommendation,
  generateWeeklyOperationsReport,
  type DailyReportingSource,
  type ReportProductCode,
  type ReportRole,
} from "../../lib/reporting-learning/build-11.7.0/reporting-learning-engine.mjs";

const baseSource = ${JSON.stringify(fixtures.baseDailySource, null, 2)} as DailyReportingSource;
const weeklySources = ${JSON.stringify(fixtures.weeklySources, null, 2)} as DailyReportingSource[];

const productCodes: ReportProductCode[] = [
  "BRISKET",
  "PORK",
  "RIBS",
  "CHICKEN",
];

const actors: Record<ReportRole, { id: string; name: string; role: ReportRole }> = {
  ADMIN: { id: "admin-1170", name: "Admin Validation", role: "ADMIN" },
  OWNER: { id: "owner-1170", name: "Owner Validation", role: "OWNER" },
  KM: { id: "km-1170", name: "Kitchen Manager", role: "KM" },
  PITMASTER: { id: "pit-1170", name: "Pitmaster", role: "PITMASTER" },
  KC: { id: "kc-1170", name: "Kitchen Coordinator", role: "KC" },
  VIEWER: { id: "viewer-1170", name: "Viewer", role: "VIEWER" },
};

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function display(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined
    ? "N/A"
    : \`\${Number(value).toFixed(2)}\${suffix}\`;
}

export default function ReportingLearningWorkbench1170() {
  const [source, setSource] = useState<DailyReportingSource>(baseSource);
  const [role, setRole] = useState<ReportRole>("KM");
  const [recommendationProduct, setRecommendationProduct] =
    useState<ReportProductCode>("BRISKET");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  const dailyResult = useMemo(() => {
    try {
      return {
        report: generateDailyOperationsReport(source),
        error: "",
      };
    } catch (error) {
      return {
        report: null,
        error:
          error instanceof Error
            ? error.message
            : "Daily report failed.",
      };
    }
  }, [source]);

  const weeklyResult = useMemo(() => {
    try {
      return {
        report: generateWeeklyOperationsReport(weeklySources),
        error: "",
      };
    } catch (error) {
      return {
        report: null,
        error:
          error instanceof Error
            ? error.message
            : "Weekly report failed.",
      };
    }
  }, []);

  const recommendation = useMemo(
    () =>
      generateForecastLearningRecommendation(weeklySources, {
        productCode: recommendationProduct,
        dayType: "NORMAL_WEEKDAY",
      }),
    [recommendationProduct],
  );

  const updateProduct = (
    code: ReportProductCode,
    field: string,
    value: number,
  ) => {
    setCopied("");
    setSource((current) => ({
      ...current,
      products: {
        ...current.products,
        [code]: {
          ...current.products[code],
          [field]: value,
        },
      },
    }));
  };

  const copyExport = async (
    report: any,
    format: "CSV" | "JSON",
  ) => {
    try {
      const value = createReportExport(report, format);
      await navigator.clipboard.writeText(value.content);
      setCopied(\`\${format} report export copied.\`);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Export failed.",
      );
    }
  };

  const copyApproval = async () => {
    try {
      const record =
        approveForecastLearningRecommendation(
          recommendation,
          {
            actor: actors[role],
            approvedAt: "2026-08-03T23:00:00.000Z",
            reason:
              "Validation recommendation and source evidence reviewed",
            effectiveDate: "2026-08-10",
          },
        );
      await navigator.clipboard.writeText(
        JSON.stringify(record, null, 2),
      );
      setCopied("Recommendation approval record copied.");
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Approval failed.",
      );
    }
  };

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
          Reporting and Forecast Learning
        </h1>
        <p
          style={{
            maxWidth: 980,
            fontSize: 18,
            lineHeight: 1.55,
          }}
        >
          Reconcile forecast, production, execution, smoker,
          inventory, waste, and count sources. Every metric exposes
          its formula and source lineage. Learning recommendations
          are bounded, reviewable, and never applied automatically.
          This lab does not persist production records.
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
          <span style={{ fontWeight: 900 }}>Approval role</span>
          <select
            value={role}
            onChange={(event: any) =>
              setRole(event.target.value as ReportRole)
            }
            style={{ minHeight: 44 }}
          >
            {Object.keys(actors).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <strong>Daily report</strong>
          <div>{source.operatingDate}</div>
          <div>
            Status:{" "}
            {dailyResult.report?.reconciliation.status ||
              "ERROR"}
          </div>
        </article>
        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <strong>Weekly report</strong>
          <div>
            {weeklyResult.report?.periodStart} to{" "}
            {weeklyResult.report?.periodEnd}
          </div>
          <div>
            {weeklyResult.report?.observationCount || 0} days
          </div>
        </article>
        <article
          style={{
            border: "1px solid currentColor",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <strong>Lineage</strong>
          <div>
            {dailyResult.report?.lineage.sourceHash ||
              "Unavailable"}
          </div>
          <small>Deterministic source hash</small>
        </article>
      </section>

      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: 48,
          border: "1px solid currentColor",
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
          fontWeight: 800,
        }}
      >
        {message ||
          copied ||
          "Adjust the source values and verify that every report remains explainable and reconciled."}
      </div>

      <section aria-labelledby="daily-source">
        <h2 id="daily-source">Daily source and product KPIs</h2>
        {dailyResult.error ? (
          <div role="alert">{dailyResult.error}</div>
        ) : null}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: 1450,
            }}
          >
            <thead>
              <tr>
                {[
                  "Product",
                  "Forecast lb",
                  "Usage lb",
                  "Forecast variance",
                  "Accuracy",
                  "Planned production",
                  "Actual production",
                  "Raw input",
                  "Yield",
                  "Waste lb",
                  "Waste rate",
                  "Closing lb",
                  "Unexplained",
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
              {productCodes.map((code) => {
                const metric =
                  dailyResult.report?.products.find(
                    (row) => row.productCode === code,
                  );
                const row = source.products[code];
                return (
                  <tr key={code}>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                        fontWeight: 900,
                      }}
                    >
                      {code}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      <input
                        aria-label={\`\${code} forecast cooked pounds\`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.forecastCookedLb}
                        onChange={(event: any) =>
                          updateProduct(
                            code,
                            "forecastCookedLb",
                            numeric(event.target.value),
                          )
                        }
                        style={{ width: 90 }}
                      />
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      <input
                        aria-label={\`\${code} service usage cooked pounds\`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.serviceUsageCookedLb}
                        onChange={(event: any) =>
                          updateProduct(
                            code,
                            "serviceUsageCookedLb",
                            numeric(event.target.value),
                          )
                        }
                        style={{ width: 90 }}
                      />
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      {display(
                        metric?.forecastVarianceCookedLb,
                        " lb",
                      )}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      {display(
                        metric?.forecastAccuracyPercent,
                        "%",
                      )}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      {display(row.plannedCookedLb, " lb")}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      <input
                        aria-label={\`\${code} actual cooked production pounds\`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.actualCookedProductionLb}
                        onChange={(event: any) =>
                          updateProduct(
                            code,
                            "actualCookedProductionLb",
                            numeric(event.target.value),
                          )
                        }
                        style={{ width: 90 }}
                      />
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      <input
                        aria-label={\`\${code} actual raw input pounds\`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.actualRawInputLb}
                        onChange={(event: any) =>
                          updateProduct(
                            code,
                            "actualRawInputLb",
                            numeric(event.target.value),
                          )
                        }
                        style={{ width: 90 }}
                      />
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      {display(
                        metric?.actualYieldPercent,
                        "%",
                      )}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      <input
                        aria-label={\`\${code} waste cooked pounds\`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.wasteCookedLb}
                        onChange={(event: any) =>
                          updateProduct(
                            code,
                            "wasteCookedLb",
                            numeric(event.target.value),
                          )
                        }
                        style={{ width: 80 }}
                      />
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      {display(
                        metric?.wasteRatePercent,
                        "%",
                      )}
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                      }}
                    >
                      <input
                        aria-label={\`\${code} closing on hand cooked pounds\`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.closingOnHandCookedLb}
                        onChange={(event: any) =>
                          updateProduct(
                            code,
                            "closingOnHandCookedLb",
                            numeric(event.target.value),
                          )
                        }
                        style={{ width: 90 }}
                      />
                    </td>
                    <td
                      style={{
                        padding: 9,
                        borderBottom:
                          "1px solid currentColor",
                        fontWeight: 900,
                      }}
                    >
                      {display(
                        metric?.unexplainedDifferenceCookedLb,
                        " lb",
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {dailyResult.report ? (
        <section
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          <article
            style={{
              border: "1px solid currentColor",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Reconciliation
            </h2>
            <strong>
              {dailyResult.report.reconciliation.status}
            </strong>
            <div>
              Unexplained:{" "}
              {display(
                dailyResult.report.reconciliation
                  .unexplainedDifferenceCookedLb,
                " lb",
              )}
            </div>
            {dailyResult.report.reconciliation.blockers
              .length ? (
              <ul>
                {dailyResult.report.reconciliation.blockers.map(
                  (item) => (
                    <li key={item}>{item}</li>
                  ),
                )}
              </ul>
            ) : (
              <p>Every source quantity reconciles.</p>
            )}
          </article>
          <article
            style={{
              border: "1px solid currentColor",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Plan adherence
            </h2>
            <div style={{ fontSize: 30, fontWeight: 900 }}>
              {display(
                dailyResult.report.planAdherence
                  .adherencePercent as number | null,
                "%",
              )}
            </div>
            <p>
              {
                dailyResult.report.planAdherence
                  .explanation as string
              }
            </p>
          </article>
          <article
            style={{
              border: "1px solid currentColor",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Smoker utilization
            </h2>
            <div style={{ fontSize: 30, fontWeight: 900 }}>
              {display(
                dailyResult.report.smokerUtilization
                  .utilizationPercent as number | null,
                "%",
              )}
            </div>
            <p>
              {
                dailyResult.report.smokerUtilization
                  .explanation as string
              }
            </p>
          </article>
          <article
            style={{
              border: "1px solid currentColor",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Exports</h2>
            <button
              type="button"
              onClick={() =>
                copyExport(dailyResult.report, "CSV")
              }
              style={{
                minHeight: 44,
                width: "100%",
                marginBottom: 8,
              }}
            >
              Copy daily CSV
            </button>
            <button
              type="button"
              onClick={() =>
                copyExport(dailyResult.report, "JSON")
              }
              style={{ minHeight: 44, width: "100%" }}
            >
              Copy daily JSON
            </button>
          </article>
        </section>
      ) : null}

      <section style={{ marginTop: 30 }}>
        <h2>Weekly management report</h2>
        {weeklyResult.error ? (
          <div role="alert">{weeklyResult.error}</div>
        ) : weeklyResult.report ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <article
                style={{
                  border: "1px solid currentColor",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <strong>Status</strong>
                <div>
                  {weeklyResult.report.reconciliation.status}
                </div>
              </article>
              <article
                style={{
                  border: "1px solid currentColor",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <strong>Plan adherence</strong>
                <div>
                  {display(
                    weeklyResult.report.planAdherence
                      .adherencePercent as number | null,
                    "%",
                  )}
                </div>
              </article>
              <article
                style={{
                  border: "1px solid currentColor",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <strong>Smoker utilization</strong>
                <div>
                  {display(
                    weeklyResult.report.smokerUtilization
                      .utilizationPercent as number | null,
                    "%",
                  )}
                </div>
              </article>
              <article
                style={{
                  border: "1px solid currentColor",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <strong>Source days</strong>
                <div>
                  {weeklyResult.report.observationCount}
                </div>
              </article>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  minWidth: 950,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Product",
                      "Forecast lb",
                      "Usage lb",
                      "WAPE",
                      "Accuracy",
                      "Yield",
                      "Waste rate",
                      "Ending inventory rate",
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
                  {weeklyResult.report.products.map(
                    (row: any) => (
                      <tr key={row.productCode}>
                        <td
                          style={{
                            padding: 9,
                            borderBottom:
                              "1px solid currentColor",
                            fontWeight: 900,
                          }}
                        >
                          {row.productCode}
                        </td>
                        <td
                          style={{
                            padding: 9,
                            borderBottom:
                              "1px solid currentColor",
                          }}
                        >
                          {display(
                            row.forecastCookedLb,
                            " lb",
                          )}
                        </td>
                        <td
                          style={{
                            padding: 9,
                            borderBottom:
                              "1px solid currentColor",
                          }}
                        >
                          {display(
                            row.serviceUsageCookedLb,
                            " lb",
                          )}
                        </td>
                        <td
                          style={{
                            padding: 9,
                            borderBottom:
                              "1px solid currentColor",
                          }}
                        >
                          {display(row.wapePercent, "%")}
                        </td>
                        <td
                          style={{
                            padding: 9,
                            borderBottom:
                              "1px solid currentColor",
                          }}
                        >
                          {display(
                            row.forecastAccuracyPercent,
                            "%",
                          )}
                        </td>
                        <td
                          style={{
                            padding: 9,
                            borderBottom:
                              "1px solid currentColor",
                          }}
                        >
                          {display(
                            row.actualYieldPercent,
                            "%",
                          )}
                        </td>
                        <td
                          style={{
                            padding: 9,
                            borderBottom:
                              "1px solid currentColor",
                          }}
                        >
                          {display(
                            row.wasteRatePercent,
                            "%",
                          )}
                        </td>
                        <td
                          style={{
                            padding: 9,
                            borderBottom:
                              "1px solid currentColor",
                          }}
                        >
                          {display(
                            row.endingInventoryRatePercent,
                            "%",
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() =>
                  copyExport(weeklyResult.report, "CSV")
                }
                style={{
                  minHeight: 44,
                  marginRight: 8,
                }}
              >
                Copy weekly CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  copyExport(weeklyResult.report, "JSON")
                }
                style={{ minHeight: 44 }}
              >
                Copy weekly JSON
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section
        style={{
          marginTop: 30,
          border: "1px solid currentColor",
          borderRadius: 18,
          padding: 18,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          Bounded forecast-learning recommendation
        </h2>
        <label
          style={{
            display: "grid",
            gap: 6,
            maxWidth: 330,
          }}
        >
          <span style={{ fontWeight: 900 }}>Product</span>
          <select
            value={recommendationProduct}
            onChange={(event: any) =>
              setRecommendationProduct(
                event.target.value as ReportProductCode,
              )
            }
            style={{ minHeight: 44 }}
          >
            {productCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          <article>
            <strong>Status</strong>
            <div>{recommendation.status}</div>
          </article>
          <article>
            <strong>Observations</strong>
            <div>{recommendation.observationCount}</div>
          </article>
          <article>
            <strong>Confidence</strong>
            <div>{recommendation.confidence || "N/A"}</div>
          </article>
          <article>
            <strong>Recommended factor</strong>
            <div>
              {display(
                recommendation.recommendedFactor,
              )}
            </div>
          </article>
          <article>
            <strong>Adjustment</strong>
            <div>
              {display(
                recommendation.adjustmentPercent,
                "%",
              )}
            </div>
          </article>
          <article>
            <strong>Bound</strong>
            <div>0.85 through 1.15</div>
          </article>
        </div>
        <p>
          Recommendations are generated only from complete,
          reconciled observations. They require human approval and
          cannot auto-apply.
        </p>
        <button
          type="button"
          onClick={copyApproval}
          disabled={
            recommendation.status !== "READY_FOR_REVIEW"
          }
          style={{
            minHeight: 48,
            padding: "10px 16px",
            fontWeight: 900,
          }}
        >
          Copy approval record
        </button>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>Calculation glossary</h2>
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {Object.entries(FORMULA_GLOSSARY).map(
            ([key, formula]) => (
              <article
                key={key}
                style={{
                  border: "1px solid currentColor",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <strong>{key}</strong>
                <div>{formula}</div>
              </article>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
`;

fs.writeFileSync(
  path.join(
    componentRoot,
    "ReportingLearningWorkbench1170.tsx",
  ),
  component,
  "utf8",
);

const artifactDir = path.join(
  root,
  "artifacts",
  "build-11.7.0",
);
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "reporting-workbench-route.json"),
  `${JSON.stringify(
    {
      buildVersion: BUILD,
      route: routePath,
      pageSource: path
        .relative(root, path.join(routeDir, "page.tsx"))
        .split(path.sep)
        .join("/"),
      componentSource:
        "components/reporting-learning/ReportingLearningWorkbench1170.tsx",
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `PASS — generated Build ${BUILD} Reporting and Learning Lab at ${routePath}`,
);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.6.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentRoot = path.join(root, "components", "inventory-control");

if (!fs.existsSync(appRoot)) {
  console.error("FAIL — app directory not found.");
  process.exit(1);
}

let routeSlug = "inventory-lab-1160";
let routeDir = path.join(appRoot, routeSlug);
let routePath = `/${routeSlug}`;
if (fs.existsSync(path.join(routeDir, "page.tsx"))) {
  const existing = fs.readFileSync(path.join(routeDir, "page.tsx"), "utf8");
  if (!existing.includes("BUILD_11_6_0_GENERATED")) {
    routeSlug = "inventory-lab-1160-alt";
    routeDir = path.join(appRoot, routeSlug);
    routePath = `/${routeSlug}`;
  }
}

fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentRoot, { recursive: true });

const base = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "inventory-control-fixtures-11.6.0.json"),
    "utf8",
  ),
).baseInput;

fs.writeFileSync(
  path.join(routeDir, "page.tsx"),
  `// BUILD_11_6_0_GENERATED
import InventoryControlWorkbench1160 from "../../components/inventory-control/InventoryControlWorkbench1160";

export default function InventoryControlLabPage() {
  return <InventoryControlWorkbench1160 />;
}
`,
  "utf8",
);

const component = `// BUILD_11_6_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  WASTE_REASONS,
  createInventoryContingencySnapshot,
  createInventoryDay,
  deriveInventoryBoard,
  executeInventoryCommand,
  type InventoryDayInput,
  type InventoryDayState,
  type InventoryProductCode,
  type InventoryRole,
} from "../../lib/inventory-control/build-11.6.0/inventory-control-engine.mjs";

const validationInput: InventoryDayInput = ${JSON.stringify(base, null, 2)} as InventoryDayInput;

const actors: Record<InventoryRole, { id: string; name: string; role: InventoryRole }> = {
  ADMIN: { id: "admin-1160", name: "Admin Validation", role: "ADMIN" },
  OWNER: { id: "owner-1160", name: "Owner Validation", role: "OWNER" },
  KM: { id: "km-1160", name: "Kitchen Manager", role: "KM" },
  PITMASTER: { id: "pit-1160", name: "Pitmaster", role: "PITMASTER" },
  KC: { id: "kc-1160", name: "Kitchen Coordinator", role: "KC" },
  VIEWER: { id: "viewer-1160", name: "Viewer", role: "VIEWER" },
};

const codes: InventoryProductCode[] = ["BRISKET", "PORK", "RIBS", "CHICKEN"];

function initialValues(value = 0) {
  return {
    BRISKET: value,
    PORK: value,
    RIBS: value,
    CHICKEN: value,
  } as Record<InventoryProductCode, number>;
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function InventoryControlWorkbench1160() {
  const [day, setDay] = useState<InventoryDayState>(() => createInventoryDay(validationInput));
  const [role, setRole] = useState<InventoryRole>("KM");
  const [counter, setCounter] = useState(1);
  const [nowLocal, setNowLocal] = useState("2026-08-03T20:00");
  const [quantity, setQuantity] = useState(initialValues(1));
  const [observedAvailable, setObservedAvailable] = useState(initialValues(0));
  const [observedHeld, setObservedHeld] = useState(initialValues(0));
  const [wasteReason, setWasteReason] = useState("SERVICE_ERROR");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  const board = useMemo(
    () => deriveInventoryBoard(day, \`\${nowLocal}:00.000Z\`),
    [day, nowLocal],
  );

  const send = (type: string, payload: Record<string, unknown>) => {
    const commandId = \`ui-\${counter}-\${type.toLowerCase()}\`;
    try {
      const result = executeInventoryCommand(day, {
        commandId,
        type,
        actor: actors[role],
        tenantId: day.tenantId,
        occurredAt: \`\${nowLocal}:00.000Z\`,
        payload,
      });
      setDay(result.state);
      setCounter((value) => value + 1);
      setMessage(\`\${result.result.status}: \${type}\`);
      setCopied("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Inventory action failed.");
    }
  };

  const balance = (code: InventoryProductCode) =>
    board.balances.find((row) => row.productCode === code)!;

  const setCountToExpected = (code: InventoryProductCode) => {
    const row = balance(code);
    setObservedAvailable((current) => ({ ...current, [code]: row.availableCookedLb }));
    setObservedHeld((current) => ({ ...current, [code]: row.heldCookedLb }));
  };

  const submitCount = (code: InventoryProductCode) => {
    const existing = (day.counts as any)[code];
    send(existing ? "CORRECT_INVENTORY_COUNT" : "COUNT_INVENTORY", {
      productCode: code,
      observedAvailableCookedLb: observedAvailable[code],
      observedHeldCookedLb: observedHeld[code],
      ...(existing ? { reason: "Validation recount correction" } : {}),
    });
  };

  const adjustToCount = (code: InventoryProductCode) => {
    const count = (day.counts as any)[code];
    if (!count) {
      setMessage("Submit a count before adjusting.");
      return;
    }
    send("ADJUST_INVENTORY", {
      productCode: code,
      deltaCookedLb: count.varianceCookedLb,
      reason: "Manager adjustment to confirmed physical count",
    });
  };

  const resolveFirstHold = (discard: boolean) => {
    const hold = (day.holds as any[]).find((row) => row.status === "OPEN");
    if (!hold) {
      setMessage("No open quality hold exists.");
      return;
    }
    send(discard ? "DISCARD_QUALITY_HOLD" : "RELEASE_QUALITY_HOLD", {
      holdId: hold.holdId,
      resolution: discard
        ? "Validation review requires disposal"
        : "Validation review cleared product for service",
      ...(discard ? { wasteReason: "QUALITY_FAILURE" } : {}),
    });
  };

  const manageFirstException = (action: "assign" | "ack" | "resolve") => {
    const exception = (day.exceptions as any[]).find((row) => row.status !== "RESOLVED");
    if (!exception) {
      setMessage("No open inventory exception exists.");
      return;
    }
    if (action === "assign") {
      send("ASSIGN_EXCEPTION", { exceptionId: exception.exceptionId, owner: actors.KM });
    } else if (action === "ack") {
      send("ACKNOWLEDGE_EXCEPTION", { exceptionId: exception.exceptionId });
    } else {
      send("RESOLVE_EXCEPTION", {
        exceptionId: exception.exceptionId,
        resolution: "Validation exception reviewed and resolved",
      });
    }
  };

  const copySnapshot = async () => {
    try {
      const snapshot = createInventoryContingencySnapshot(day, \`\${nowLocal}:00.000Z\`);
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setCopied("Inventory contingency snapshot copied.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Snapshot failed.");
    }
  };

  return (
    <main style={{ maxWidth: 1380, margin: "0 auto", padding: "22px 16px 64px" }}>
      <header style={{ marginBottom: 22 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Build ${BUILD} validation workbench
        </p>
        <h1 style={{ margin: "7px 0 10px", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1 }}>
          Inventory, Waste, Holds, and Exceptions
        </h1>
        <p style={{ maxWidth: 980, fontSize: 18, lineHeight: 1.55 }}>
          Reconcile cooked inventory through production receipts, service usage, waste, quality holds,
          physical counts, manager adjustments, exception ownership, and close gates. This lab does not persist production records.
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
        <label style={{ display: "grid", gap: 6, border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <span style={{ fontWeight: 900 }}>Acting role</span>
          <select value={role} onChange={(event: any) => setRole(event.target.value as InventoryRole)} style={{ minHeight: 44 }}>
            {Object.keys(actors).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6, border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <span style={{ fontWeight: 900 }}>Validation clock</span>
          <input type="datetime-local" value={nowLocal} onChange={(event: any) => setNowLocal(event.target.value)} style={{ minHeight: 44 }} />
        </label>
        <article style={{ border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <strong>{day.operatingDate}</strong>
          <div>Status: {day.status}</div>
          <div>Ledger entries: {day.ledger.length}</div>
        </article>
        <article style={{ border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <strong>Waste total</strong>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{board.wasteTotalCookedLb.toFixed(1)} lb</div>
        </article>
      </section>

      <div role="status" aria-live="polite" style={{ minHeight: 48, border: "1px solid currentColor", borderRadius: 12, padding: 12, marginBottom: 20, fontWeight: 800 }}>
        {message || "Use the labeled controls to execute the inventory reconciliation UAT."}
      </div>

      <section aria-labelledby="inventory-risks" style={{ marginBottom: 24 }}>
        <h2 id="inventory-risks">Urgent inventory actions ({board.urgentActionCount})</h2>
        {board.urgentActions.length ? (
          <div style={{ display: "grid", gap: 9 }}>
            {board.urgentActions.map((action) => (
              <article key={\`\${action.type}-\${action.referenceId}\`} style={{ border: "1px solid currentColor", borderRadius: 12, padding: 12 }}>
                <strong>{action.severity} · {action.type}</strong>
                <div>{action.message}</div>
              </article>
            ))}
          </div>
        ) : <p>No active inventory risk is detected.</p>}
      </section>

      <section aria-labelledby="inventory-products">
        <h2 id="inventory-products">Product inventory</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16 }}>
          {codes.map((code) => {
            const row = balance(code);
            const count = (day.counts as any)[code];
            return (
              <article key={code} style={{ border: "1px solid currentColor", borderRadius: 18, padding: 17, display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0 }}>{code}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <div><small>Available</small><div style={{ fontSize: 24, fontWeight: 900 }}>{row.availableCookedLb.toFixed(1)}</div></div>
                  <div><small>Held</small><div style={{ fontSize: 24, fontWeight: 900 }}>{row.heldCookedLb.toFixed(1)}</div></div>
                  <div><small>On hand</small><div style={{ fontSize: 24, fontWeight: 900 }}>{row.onHandCookedLb.toFixed(1)}</div></div>
                </div>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontWeight: 800 }}>Action quantity, cooked lb</span>
                  <input type="number" min="0.1" step="0.1" value={quantity[code]}
                    onChange={(event: any) => setQuantity((current) => ({ ...current, [code]: numeric(event.target.value) }))}
                    style={{ minHeight: 42 }} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  <button type="button" onClick={() => send("RECEIVE_PRODUCTION", {
                    productCode: code, quantityCookedLb: quantity[code], loadId: \`validation-\${code}\`,
                  })} disabled={day.status !== "OPEN"} style={{ minHeight: 44, fontWeight: 900 }}>
                    Receive production
                  </button>
                  <button type="button" onClick={() => send("RECORD_SERVICE_USAGE", {
                    productCode: code, quantityCookedLb: quantity[code], servicePeriodId: "validation-service",
                  })} disabled={day.status !== "OPEN"} style={{ minHeight: 44 }}>
                    Record service usage
                  </button>
                  <button type="button" onClick={() => send("RECORD_WASTE", {
                    productCode: code, quantityCookedLb: quantity[code], reason: wasteReason, note: "Validation waste record",
                  })} disabled={day.status !== "OPEN"} style={{ minHeight: 44 }}>
                    Record waste
                  </button>
                  <button type="button" onClick={() => send("OPEN_QUALITY_HOLD", {
                    productCode: code, quantityCookedLb: quantity[code], reason: "QUALITY_REVIEW",
                    severity: "P1", blocking: true, owner: actors.KM,
                  })} disabled={day.status !== "OPEN"} style={{ minHeight: 44 }}>
                    Open quality hold
                  </button>
                </div>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontWeight: 800 }}>Waste reason</span>
                  <select value={wasteReason} onChange={(event: any) => setWasteReason(event.target.value)} style={{ minHeight: 42 }}>
                    {WASTE_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                  </select>
                </label>
                <hr style={{ width: "100%" }} />
                <strong>Physical count</strong>
                <button type="button" onClick={() => setCountToExpected(code)} style={{ minHeight: 40 }}>
                  Fill expected count
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label>Available
                    <input type="number" min="0" step="0.1" value={observedAvailable[code]}
                      onChange={(event: any) => setObservedAvailable((current) => ({ ...current, [code]: numeric(event.target.value) }))}
                      style={{ width: "100%", minHeight: 40 }} />
                  </label>
                  <label>Held
                    <input type="number" min="0" step="0.1" value={observedHeld[code]}
                      onChange={(event: any) => setObservedHeld((current) => ({ ...current, [code]: numeric(event.target.value) }))}
                      style={{ width: "100%", minHeight: 40 }} />
                  </label>
                </div>
                <button type="button" onClick={() => submitCount(code)} disabled={day.status !== "OPEN"} style={{ minHeight: 44, fontWeight: 900 }}>
                  {count ? "Correct physical count" : "Submit physical count"}
                </button>
                {count ? (
                  <div>
                    <strong>{count.classification}</strong> · variance {count.varianceCookedLb} lb ({count.variancePercent}%)
                    {count.classification === "BLOCKING" && !count.resolvedByAdjustment ? (
                      <button type="button" onClick={() => adjustToCount(code)} style={{ display: "block", minHeight: 42, marginTop: 8, width: "100%" }}>
                        Manager adjust to count
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Quality holds</h2>
          <p>{(day.holds as any[]).filter((row) => row.status === "OPEN").length} open hold(s)</p>
          <button type="button" onClick={() => resolveFirstHold(false)} style={{ minHeight: 44, width: "100%", marginBottom: 8 }}>
            Release first open hold
          </button>
          <button type="button" onClick={() => resolveFirstHold(true)} style={{ minHeight: 44, width: "100%" }}>
            Discard first open hold
          </button>
        </article>

        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Exception ownership</h2>
          <p>{(day.exceptions as any[]).filter((row) => row.status !== "RESOLVED").length} open exception(s)</p>
          <button type="button" onClick={() => send("OPEN_EXCEPTION", {
            severity: "P1", summary: "Validation inventory exception requires ownership", productCode: "PORK",
          })} style={{ minHeight: 44, width: "100%", marginBottom: 8 }}>
            Open unowned P1 exception
          </button>
          <button type="button" onClick={() => manageFirstException("assign")} style={{ minHeight: 44, width: "100%", marginBottom: 8 }}>
            Assign first exception to KM
          </button>
          <button type="button" onClick={() => manageFirstException("ack")} style={{ minHeight: 44, width: "100%", marginBottom: 8 }}>
            Acknowledge first exception
          </button>
          <button type="button" onClick={() => manageFirstException("resolve")} style={{ minHeight: 44, width: "100%" }}>
            Resolve first exception
          </button>
        </article>

        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Close reconciliation</h2>
          {board.closeBlockers.length ? <ul>{board.closeBlockers.map((item) => <li key={item}>{item}</li>)}</ul> : <p>All close gates are satisfied.</p>}
          <button type="button" onClick={() => send("CLOSE_INVENTORY_DAY", {
            reason: "Validation inventory reconciliation complete",
          })} disabled={day.status !== "OPEN"} style={{ minHeight: 48, width: "100%", fontWeight: 900 }}>
            Close inventory day
          </button>
        </article>

        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Contingency export</h2>
          <p>Copy balances, holds, exceptions, counts, notes, and ledger/event sequence.</p>
          <button type="button" onClick={copySnapshot} style={{ minHeight: 48, width: "100%", fontWeight: 900 }}>
            Copy inventory snapshot
          </button>
          <div aria-live="polite">{copied}</div>
        </article>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Append-only ledger ({day.ledger.length})</h2>
        <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid currentColor", borderRadius: 14 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 960 }}>
            <thead><tr>
              {["Seq", "Time", "Product", "Transaction", "Available Δ", "Held Δ", "On-hand Δ", "Reason"].map((heading) => (
                <th key={heading} style={{ textAlign: "left", padding: 9, borderBottom: "2px solid currentColor" }}>{heading}</th>
              ))}
            </tr></thead>
            <tbody>
              {(day.ledger as any[]).map((entry) => (
                <tr key={entry.ledgerEntryId}>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.sequence}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.occurredAt}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 800 }}>{entry.productCode}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.transactionType}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.availableDeltaCookedLb}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.heldDeltaCookedLb}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.onHandDeltaCookedLb}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{entry.reason}</td>
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
  path.join(componentRoot, "InventoryControlWorkbench1160.tsx"),
  component,
  "utf8",
);

const artifactDir = path.join(root, "artifacts", "build-11.6.0");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "inventory-workbench-route.json"),
  `${JSON.stringify({
    buildVersion: BUILD,
    route: routePath,
    pageSource: path.relative(root, path.join(routeDir, "page.tsx")).split(path.sep).join("/"),
    componentSource: "components/inventory-control/InventoryControlWorkbench1160.tsx",
    generatedAt: new Date().toISOString(),
  }, null, 2)}\n`,
  "utf8",
);

console.log(`PASS — generated Build ${BUILD} Inventory Control Lab at ${routePath}`);

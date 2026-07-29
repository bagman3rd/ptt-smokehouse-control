#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.5.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const componentRoot = path.join(root, "components", "today-operations");

if (!fs.existsSync(appRoot)) {
  console.error("FAIL — app directory not found.");
  process.exit(1);
}

let routeSlug = "today-lab-1150";
let routeDir = path.join(appRoot, routeSlug);
let routePath = `/${routeSlug}`;

if (fs.existsSync(path.join(routeDir, "page.tsx"))) {
  const existing = fs.readFileSync(path.join(routeDir, "page.tsx"), "utf8");
  if (!existing.includes("BUILD_11_5_0_GENERATED")) {
    routeSlug = "today-lab-1150-alt";
    routeDir = path.join(appRoot, routeSlug);
    routePath = `/${routeSlug}`;
  }
}

fs.mkdirSync(routeDir, { recursive: true });
fs.mkdirSync(componentRoot, { recursive: true });

fs.writeFileSync(
  path.join(routeDir, "page.tsx"),
  `// BUILD_11_5_0_GENERATED
import TodayOperationsWorkbench1150 from "../../components/today-operations/TodayOperationsWorkbench1150";

export default function TodayOperationsLabPage() {
  return <TodayOperationsWorkbench1150 />;
}
`,
  "utf8",
);

const component = `// BUILD_11_5_0_GENERATED
"use client";

import { useMemo, useState } from "react";
import {
  STANDARD_STATUS_FLOW,
  createContingencySnapshot,
  createOperatingDay,
  deriveTodayBoard,
  executeOperatingDayCommand,
  rolloverOperatingDay,
  type LoadStatus,
  type OperatingDayInput,
  type OperatingDayState,
  type TodayProductCode,
  type TodayRole,
} from "../../lib/today-operations/build-11.5.0/today-operations-engine.mjs";

const productNames: Record<TodayProductCode, string> = {
  BRISKET: "Brisket",
  PORK: "Pork",
  RIBS: "Ribs",
  CHICKEN: "Pulled Chicken",
};

const validationInput: OperatingDayInput = ${JSON.stringify(
  JSON.parse(fs.readFileSync(path.join(root, "config", "today-operations-fixtures-11.5.0.json"), "utf8")).baseDayInput,
  null,
  2
)} as OperatingDayInput;

const actors: Record<TodayRole, { id: string; name: string; role: TodayRole }> = {
  ADMIN: { id: "admin-validation", name: "Admin Validation", role: "ADMIN" },
  OWNER: { id: "owner-validation", name: "Owner Validation", role: "OWNER" },
  KM: { id: "km-validation", name: "Kitchen Manager", role: "KM" },
  PITMASTER: { id: "pit-validation", name: "Pitmaster", role: "PITMASTER" },
  KC: { id: "kc-validation", name: "Kitchen Coordinator", role: "KC" },
  VIEWER: { id: "viewer-validation", name: "Viewer", role: "VIEWER" },
};

const nextStatus: Partial<Record<LoadStatus, LoadStatus>> = {
  PLANNED: "READY",
  READY: "LOADED",
  LOADED: "COOKING",
  COOKING: "RESTING",
  RESTING: "HOLDING",
  HOLDING: "READY_FOR_SERVICE",
  READY_FOR_SERVICE: "COMPLETED",
};

function addOneDay(value: string) {
  const date = new Date(\`\${value}T12:00:00Z\`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function offsetLabel(operatingDate: string, offsetMinutes: number) {
  const date = new Date(\`\${operatingDate}T00:00:00Z\`);
  date.setUTCMinutes(date.getUTCMinutes() + offsetMinutes);
  return \`\${date.toISOString().slice(0, 10)} \${date.toISOString().slice(11, 16)}\`;
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function initialActualQuantities(input: OperatingDayInput) {
  return Object.fromEntries(
    input.loads.map((load) => [load.loadId, load.plannedQuantity]),
  ) as Record<string, number>;
}

function initialEodValues() {
  return {
    BRISKET: { sealedUnits: 0, openCookedLb: 0 },
    PORK: { sealedUnits: 0, openCookedLb: 0 },
    RIBS: { sealedUnits: 0, openCookedLb: 0 },
    CHICKEN: { sealedUnits: 0, openCookedLb: 0 },
  } as Record<TodayProductCode, { sealedUnits: number; openCookedLb: number }>;
}

export default function TodayOperationsWorkbench1150() {
  const [day, setDay] = useState<OperatingDayState>(() =>
    createOperatingDay(validationInput),
  );
  const [role, setRole] = useState<TodayRole>("KM");
  const [counter, setCounter] = useState(1);
  const [nowLocal, setNowLocal] = useState("2026-08-03T08:00");
  const [actualQuantities, setActualQuantities] = useState<Record<string, number>>(
    initialActualQuantities(validationInput),
  );
  const [eodValues, setEodValues] = useState(initialEodValues);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [lastCarryover, setLastCarryover] = useState<Array<Record<string, unknown>>>([]);
  const [copied, setCopied] = useState("");

  const board = useMemo(
    () => deriveTodayBoard(day, \`\${nowLocal}:00.000Z\`),
    [day, nowLocal],
  );

  const currentActor = actors[role];

  const send = (type: string, payload: Record<string, unknown>) => {
    const commandId = \`ui-\${counter}-\${type.toLowerCase()}\`;
    try {
      const result = executeOperatingDayCommand(day, {
        commandId,
        occurredAt: \`\${nowLocal}:00.000Z\`,
        type: type as any,
        actor: currentActor,
        payload,
      });
      setDay(result.state);
      setCounter((value) => value + 1);
      setMessage(\`\${result.result.status}: \${type}\`);
      setCopied("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  };

  const assignPitmaster = (loadId: string) => {
    send("ASSIGN_LOAD_OWNER", {
      loadId,
      owner: actors.PITMASTER,
    });
  };

  const advanceLoad = (loadId: string, status: LoadStatus) => {
    const target = nextStatus[status];
    if (!target) return;
    const payload: Record<string, unknown> = { loadId, status: target };
    if (target === "LOADED") {
      payload.actualQuantity = actualQuantities[loadId];
      payload.reason = "Validation quantity confirmation";
    }
    send("SET_LOAD_STATUS", payload);
  };

  const advanceAll = () => {
    let current = day;
    let nextCounter = counter;
    let applied = 0;
    try {
      for (const load of current.loads as any[]) {
        const target = nextStatus[load.status as LoadStatus];
        if (!target) continue;
        const payload: Record<string, unknown> = {
          loadId: load.loadId,
          status: target,
        };
        if (target === "LOADED") {
          payload.actualQuantity = actualQuantities[load.loadId];
          payload.reason = "Validation quantity confirmation";
        }
        const result = executeOperatingDayCommand(current, {
          commandId: \`ui-\${nextCounter}-advance-\${load.loadId}\`,
          occurredAt: \`\${nowLocal}:00.000Z\`,
          type: "SET_LOAD_STATUS",
          actor: currentActor,
          payload,
        } as any);
        current = result.state;
        nextCounter += 1;
        applied += 1;
      }
      setDay(current);
      setCounter(nextCounter);
      setMessage(\`Advanced \${applied} load\${applied === 1 ? "" : "s"} one step.\`);
      setCopied("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Advance-all failed.");
    }
  };

  const addNote = (loadId: string) => {
    const note = noteDrafts[loadId] || "";
    send("ADD_LOAD_NOTE", {
      loadId,
      note,
      offlineDraftRecovered: false,
    });
    setNoteDrafts((current) => ({ ...current, [loadId]: "" }));
  };

  const submitOrCorrectEod = (productCode: TodayProductCode) => {
    const current = (day.eod.submissions as any)[productCode];
    const values = eodValues[productCode];
    if (current) {
      send("CORRECT_EOD_PRODUCT", {
        productCode,
        ...values,
        reason: "Validation recount correction",
        note: "Corrected in Build 11.5.0 validation lab",
      });
    } else {
      send("SUBMIT_EOD_PRODUCT", {
        productCode,
        ...values,
        note: "Submitted in Build 11.5.0 validation lab",
      });
    }
  };

  const closeDay = () => {
    send("CLOSE_OPERATING_DAY", {
      reason: "Validation operating day completed",
    });
  };

  const rollover = () => {
    try {
      const nextInput: OperatingDayInput = {
        ...validationInput,
        operatingDate: addOneDay(day.operatingDate),
        planId: \`\${validationInput.planId}-next\`,
        forecastCalculationId: \`\${validationInput.forecastCalculationId}-next\`,
      };
      const result = rolloverOperatingDay(day, nextInput, {
        commandId: \`ui-\${counter}-rollover\`,
        occurredAt: \`\${nowLocal}:00.000Z\`,
        type: "ROLLOVER_OPERATING_DAY",
        actor: currentActor,
        payload: {},
      });
      if (result.nextDay) {
        setDay(result.nextDay);
        setActualQuantities(initialActualQuantities(nextInput));
        setEodValues(initialEodValues());
        setLastCarryover(result.carryover);
        setCounter((value) => value + 1);
        setMessage(\`Rolled forward to \${result.nextDay.operatingDate}.\`);
        setCopied("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rollover failed.");
    }
  };

  const copySnapshot = async () => {
    try {
      const snapshot = createContingencySnapshot(
        day,
        \`\${nowLocal}:00.000Z\`,
      );
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setCopied("Contingency snapshot copied.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Snapshot failed.");
    }
  };

  return (
    <main style={{ maxWidth: 1320, margin: "0 auto", padding: "22px 16px 64px" }}>
      <header style={{ marginBottom: 22 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Build ${BUILD} validation workbench
        </p>
        <h1 style={{ margin: "7px 0 10px", fontSize: "clamp(2rem, 5vw, 3.6rem)", lineHeight: 1 }}>
          Today Operations and Quick EOD
        </h1>
        <p style={{ maxWidth: 940, fontSize: 18, lineHeight: 1.55 }}>
          Execute a complete operating day using large, labeled actions. This workbench validates status flow,
          ownership, exceptions, EOD counts, correction, close and rollover. It does not persist production records.
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
        <label style={{ display: "grid", gap: 6, border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <span style={{ fontWeight: 900 }}>Acting role</span>
          <select value={role} onChange={(event: any) => setRole(event.target.value as TodayRole)} style={{ minHeight: 44 }}>
            {Object.keys(actors).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6, border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <span style={{ fontWeight: 900 }}>Validation clock</span>
          <input type="datetime-local" value={nowLocal} onChange={(event: any) => setNowLocal(event.target.value)} style={{ minHeight: 44 }} />
        </label>
        <article style={{ border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <strong>{board.dayOfWeek}, {board.operatingDate}</strong>
          <div>Day status: {board.status}</div>
          <div>EOD: {board.eodStatus}</div>
        </article>
        <article style={{ border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
          <strong>Context</strong>
          <div>{day.weatherNote || "No weather note"}</div>
          <div>{day.eventNote || "No event note"}</div>
        </article>
      </section>

      <div role="status" aria-live="polite" style={{ minHeight: 48, border: "1px solid currentColor", borderRadius: 12, padding: 12, marginBottom: 20, fontWeight: 800 }}>
        {message || "Select a labeled action to begin the operating-day UAT."}
      </div>

      <section aria-labelledby="urgent-actions" style={{ marginBottom: 24 }}>
        <h2 id="urgent-actions">Urgent actions ({board.urgentActionCount})</h2>
        {board.urgentActions.length ? (
          <div style={{ display: "grid", gap: 9 }}>
            {board.urgentActions.map((action: any, index: number) => (
              <article key={\`\${action.type}-\${action.loadId || index}\`} style={{ border: "1px solid currentColor", borderRadius: 12, padding: 12 }}>
                <strong>{action.severity} · {action.type}</strong>
                <div>{action.message}</div>
              </article>
            ))}
          </div>
        ) : <p>No urgent action is active at the selected validation time.</p>}
      </section>

      <section aria-labelledby="load-operations">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 id="load-operations">Load execution</h2>
          <button type="button" onClick={advanceAll} disabled={day.status !== "OPEN"} style={{ minHeight: 48, padding: "10px 16px", fontWeight: 900 }}>
            Advance all eligible loads one step
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {(board.loadCards as any[]).map((card) => {
            const load = (day.loads as any[]).find((row) => row.loadId === card.loadId);
            const target = nextStatus[card.status as LoadStatus];
            return (
              <article key={card.loadId} style={{ border: "1px solid currentColor", borderRadius: 18, padding: 17, display: "grid", gap: 11 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{card.productName}</h3>
                  <div>{card.plannedQuantity} {card.unit} · {card.smokerName}</div>
                  <div>Planned: {offsetLabel(day.operatingDate, card.plannedStartOffsetMinutes)} → {offsetLabel(day.operatingDate, card.plannedEndOffsetMinutes)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>Status: {card.status}</strong>
                  <span>Next: {card.nextAction}</span>
                </div>
                <div>
                  <strong>Owner:</strong> {card.owner?.name || "Unassigned"}
                </div>
                {!card.owner ? (
                  <button type="button" onClick={() => assignPitmaster(card.loadId)} disabled={day.status !== "OPEN"} style={{ minHeight: 44, fontWeight: 900 }}>
                    Assign Pitmaster
                  </button>
                ) : null}
                {target === "LOADED" ? (
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ fontWeight: 800 }}>Actual load quantity</span>
                    <input type="number" min="0.01" step="0.1" value={actualQuantities[card.loadId]}
                      onChange={(event: any) => setActualQuantities((current) => ({ ...current, [card.loadId]: numeric(event.target.value) }))}
                      style={{ minHeight: 42 }} />
                  </label>
                ) : null}
                {target ? (
                  <button type="button" onClick={() => advanceLoad(card.loadId, card.status)} disabled={day.status !== "OPEN"} style={{ minHeight: 48, fontWeight: 900 }}>
                    {card.nextAction}
                  </button>
                ) : null}
                {card.status !== "EXCEPTION" && card.status !== "COMPLETED" && card.status !== "CANCELLED" ? (
                  <button type="button" onClick={() => send("FLAG_EXCEPTION", {
                    loadId: card.loadId,
                    severity: "P1",
                    reason: "Validation exception requires manager review",
                  })} disabled={day.status !== "OPEN"} style={{ minHeight: 44 }}>
                    Flag exception
                  </button>
                ) : null}
                {card.status === "EXCEPTION" ? (
                  <button type="button" onClick={() => send("RESOLVE_EXCEPTION", {
                    loadId: card.loadId,
                    resolution: "Validation exception reviewed and resolved",
                  })} style={{ minHeight: 44, fontWeight: 900 }}>
                    Resolve exception
                  </button>
                ) : null}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input value={noteDrafts[card.loadId] || ""} placeholder="Operational note"
                    onChange={(event: any) => setNoteDrafts((current) => ({ ...current, [card.loadId]: event.target.value }))}
                    style={{ minHeight: 42 }} />
                  <button type="button" onClick={() => addNote(card.loadId)} disabled={!noteDrafts[card.loadId]} style={{ minHeight: 42 }}>
                    Add note
                  </button>
                </div>
                <small>{load?.notes?.length || 0} note(s) · {load?.correctionHistory?.length || 0} correction(s)</small>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="quick-eod" style={{ marginTop: 30 }}>
        <h2 id="quick-eod">Guided Quick EOD</h2>
        <p>Sealed quantities accept whole units only. Open quantities are cooked pounds.</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 780 }}>
            <thead><tr>
              {["Product", "Produced cooked lb", "Sealed units", "Open cooked lb", "Current status", "Action"].map((heading) => (
                <th key={heading} style={{ textAlign: "left", padding: 9, borderBottom: "2px solid currentColor" }}>{heading}</th>
              ))}
            </tr></thead>
            <tbody>
              {(day.eod.products as any[]).map((product) => {
                const current = (day.eod.submissions as any)[product.productCode];
                const produced = (day.loads as any[])
                  .filter((load) => load.productCode === product.productCode && load.status === "COMPLETED" && load.actualQuantity !== null)
                  .reduce((sum, load) => sum + load.actualQuantity * (load.cookedEquivalentPerOperationalUnitLb || 0), 0);
                const values = eodValues[product.productCode as TodayProductCode];
                return (
                  <tr key={product.productCode}>
                    <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 900 }}>{product.productName}</td>
                    <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{produced.toFixed(1)}</td>
                    <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                      <input aria-label={\`\${product.productName} sealed units\`} type="number" min="0" step="1" value={values.sealedUnits}
                        onChange={(event: any) => setEodValues((existing) => ({
                          ...existing,
                          [product.productCode]: { ...existing[product.productCode as TodayProductCode], sealedUnits: numeric(event.target.value) },
                        }))}
                        style={{ width: 90 }} />
                    </td>
                    <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                      <input aria-label={\`\${product.productName} open cooked pounds\`} type="number" min="0" step="0.1" value={values.openCookedLb}
                        onChange={(event: any) => setEodValues((existing) => ({
                          ...existing,
                          [product.productCode]: { ...existing[product.productCode as TodayProductCode], openCookedLb: numeric(event.target.value) },
                        }))}
                        style={{ width: 105 }} />
                    </td>
                    <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                      {current ? \`Submitted v\${current.version}\` : "Not submitted"}
                    </td>
                    <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>
                      <button type="button" onClick={() => submitOrCorrectEod(product.productCode)} disabled={day.status !== "OPEN"} style={{ minHeight: 42, fontWeight: 900 }}>
                        {current ? "Correct EOD count" : "Submit EOD count"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Operating-day close</h2>
          {(board.closeBlockers as string[]).length ? (
            <ul>{(board.closeBlockers as string[]).map((item) => <li key={item}>{item}</li>)}</ul>
          ) : <p>All close gates are satisfied.</p>}
          <button type="button" onClick={closeDay} disabled={day.status !== "OPEN"} style={{ minHeight: 48, width: "100%", fontWeight: 900 }}>
            Close operating day
          </button>
        </article>
        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Rollover</h2>
          <p>Create the next consecutive operating date from the final EOD submissions.</p>
          <button type="button" onClick={rollover} disabled={day.status !== "CLOSED"} style={{ minHeight: 48, width: "100%", fontWeight: 900 }}>
            Roll to next operating day
          </button>
        </article>
        <article style={{ border: "1px solid currentColor", borderRadius: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Contingency export</h2>
          <p>Copy the latest approved plan, current statuses, notes, exceptions and EOD state.</p>
          <button type="button" onClick={copySnapshot} style={{ minHeight: 48, width: "100%", fontWeight: 900 }}>
            Copy contingency snapshot
          </button>
          <div aria-live="polite">{copied}</div>
        </article>
      </section>

      {lastCarryover.length ? (
        <section style={{ marginTop: 28 }}>
          <h2>Prior-day carryover applied to the new day</h2>
          <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap", border: "1px solid currentColor", borderRadius: 14, padding: 14 }}>
            {JSON.stringify(lastCarryover, null, 2)}
          </pre>
        </section>
      ) : null}

      <section style={{ marginTop: 28 }}>
        <h2>Append-only event history ({day.eventLog.length})</h2>
        <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid currentColor", borderRadius: 14 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
            <thead><tr>
              {["Seq", "Time", "Event", "Actor", "Command"].map((heading) => (
                <th key={heading} style={{ position: "sticky", top: 0, textAlign: "left", padding: 9, borderBottom: "2px solid currentColor" }}>{heading}</th>
              ))}
            </tr></thead>
            <tbody>
              {(day.eventLog as any[]).map((event) => (
                <tr key={event.eventId}>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{event.sequence}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{event.occurredAt}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor", fontWeight: 800 }}>{event.type}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{event.actor.name} ({event.actor.role})</td>
                  <td style={{ padding: 9, borderBottom: "1px solid currentColor" }}>{event.commandId}</td>
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
  path.join(componentRoot, "TodayOperationsWorkbench1150.tsx"),
  component,
  "utf8",
);

const artifactDir = path.join(root, "artifacts", "build-11.5.0");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "today-workbench-route.json"),
  `${JSON.stringify({
    buildVersion: BUILD,
    route: routePath,
    pageSource: path.relative(root, path.join(routeDir, "page.tsx")).split(path.sep).join("/"),
    componentSource: "components/today-operations/TodayOperationsWorkbench1150.tsx",
    generatedAt: new Date().toISOString(),
  }, null, 2)}\n`,
  "utf8",
);

console.log(`PASS — generated Build ${BUILD} Today Operations Lab at ${routePath}`);

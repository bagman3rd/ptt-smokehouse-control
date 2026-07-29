#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  STANDARD_STATUS_FLOW,
  TodayOperationsValidationError,
  createContingencySnapshot,
  createOperatingDay,
  deriveTodayBoard,
  executeOperatingDayCommand,
  rolloverOperatingDay,
} from "../lib/today-operations/build-11.5.0/today-operations-engine.mjs";

const root = process.cwd();
const fixtureSet = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "today-operations-fixtures-11.5.0.json"),
    "utf8",
  ),
);
const failures = [];

const actors = {
  km: { id: "km-1", name: "Kitchen Manager", role: "KM" },
  pit: { id: "pit-1", name: "Pitmaster", role: "PITMASTER" },
  kc: { id: "kc-1", name: "Kitchen Coordinator", role: "KC" },
  viewer: { id: "viewer-1", name: "Read Only", role: "VIEWER" },
};

function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL — ${message}`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function command(commandId, occurredAt, type, actor, payload = {}) {
  return { commandId, occurredAt, type, actor, payload };
}

function apply(state, cmd) {
  return executeOperatingDayCommand(state, cmd).state;
}

function assignAll(state, prefix = "assign") {
  let current = state;
  for (const load of current.loads) {
    current = apply(
      current,
      command(
        `${prefix}-${load.loadId}`,
        "2026-08-02T08:00:00.000Z",
        "ASSIGN_LOAD_OWNER",
        actors.km,
        {
          loadId: load.loadId,
          owner: actors.pit,
        },
      ),
    );
  }
  return current;
}

function advanceLoadToCompleted(state, loadId, actualQuantity, prefix) {
  let current = state;
  const statuses = STANDARD_STATUS_FLOW.slice(1);
  const times = [
    "2026-08-02T09:00:00.000Z",
    "2026-08-02T09:05:00.000Z",
    "2026-08-02T09:10:00.000Z",
    "2026-08-02T21:00:00.000Z",
    "2026-08-02T21:15:00.000Z",
    "2026-08-03T10:00:00.000Z",
    "2026-08-03T21:00:00.000Z",
  ];
  for (let index = 0; index < statuses.length; index += 1) {
    const status = statuses[index];
    const payload = { loadId, status };
    if (status === "LOADED") payload.actualQuantity = actualQuantity;
    current = apply(
      current,
      command(
        `${prefix}-${status.toLowerCase()}`,
        times[index],
        "SET_LOAD_STATUS",
        actors.pit,
        payload,
      ),
    );
  }
  return current;
}

function completeAllLoads(state, prefix = "complete") {
  let current = state;
  for (const load of current.loads) {
    current = advanceLoadToCompleted(
      current,
      load.loadId,
      load.plannedQuantity,
      `${prefix}-${load.loadId}`,
    );
  }
  return current;
}

function submitAllEod(state, values, prefix = "eod") {
  let current = state;
  for (const productCode of ["BRISKET", "PORK", "RIBS", "CHICKEN"]) {
    const value = values[productCode] || { sealedUnits: 0, openCookedLb: 0 };
    current = apply(
      current,
      command(
        `${prefix}-${productCode.toLowerCase()}`,
        "2026-08-03T21:30:00.000Z",
        "SUBMIT_EOD_PRODUCT",
        actors.kc,
        {
          productCode,
          sealedUnits: value.sealedUnits,
          openCookedLb: value.openCookedLb,
          note: "Quick EOD validation count",
        },
      ),
    );
  }
  return current;
}

function buildClosedDay() {
  let state = createOperatingDay(clone(fixtureSet.baseDayInput));
  state = assignAll(state, "normal-assign");
  state = completeAllLoads(state, "normal-complete");
  state = submitAllEod(
    state,
    {
      BRISKET: { sealedUnits: 1, openCookedLb: 0 },
      PORK: { sealedUnits: 1, openCookedLb: 0 },
      RIBS: { sealedUnits: 1, openCookedLb: 0 },
      CHICKEN: { sealedUnits: 1, openCookedLb: 0 },
    },
    "normal-eod",
  );
  state = apply(
    state,
    command(
      "normal-close",
      "2026-08-03T22:00:00.000Z",
      "CLOSE_OPERATING_DAY",
      actors.km,
      { reason: "Full operating day UAT complete" },
    ),
  );
  return state;
}

// TO-001 — complete a full operating day.
const closedDay = buildClosedDay();
pass(closedDay.status === "CLOSED", "TO-001: operating day closes");
pass(
  closedDay.loads.filter((load) => load.status === "COMPLETED").length === 4,
  "TO-001: four loads complete",
);
pass(
  Object.keys(closedDay.eod.submissions).length === 4 &&
    closedDay.eod.status === "COMPLETE",
  "TO-001: four EOD products complete",
);
pass(
  closedDay.loads.filter((load) => load.exception).length === 0,
  "TO-001: no open exceptions",
);

// TO-002 — invalid status jump.
let invalidJumpError = null;
const jumpState = createOperatingDay(clone(fixtureSet.baseDayInput));
try {
  executeOperatingDayCommand(
    jumpState,
    command(
      "jump-001",
      "2026-08-02T09:00:00.000Z",
      "SET_LOAD_STATUS",
      actors.pit,
      { loadId: "load-brisket", status: "COOKING" },
    ),
  );
} catch (error) {
  invalidJumpError = error;
}
pass(
  invalidJumpError instanceof TodayOperationsValidationError,
  "TO-002: invalid jump throws validation error",
);
pass(
  invalidJumpError?.field === "payload.status",
  "TO-002: invalid jump identifies payload.status",
);
pass(
  jumpState.loads.find((load) => load.loadId === "load-brisket")?.status ===
    "PLANNED",
  "TO-002: invalid jump leaves load planned",
);

// TO-003 — duplicate command.
const duplicateState = createOperatingDay(clone(fixtureSet.baseDayInput));
const duplicateCommand = command(
  "duplicate-ready",
  "2026-08-02T08:30:00.000Z",
  "SET_LOAD_STATUS",
  actors.pit,
  { loadId: "load-brisket", status: "READY" },
);
const firstDuplicateResult = executeOperatingDayCommand(
  duplicateState,
  duplicateCommand,
);
const secondDuplicateResult = executeOperatingDayCommand(
  firstDuplicateResult.state,
  duplicateCommand,
);
pass(
  firstDuplicateResult.result.status === "APPLIED",
  "TO-003: first command applies",
);
pass(
  secondDuplicateResult.result.status === "DUPLICATE",
  "TO-003: duplicate command is idempotent",
);
pass(
  secondDuplicateResult.state.eventLog.length === 1,
  "TO-003: duplicate command creates only one event",
);

// TO-004 — viewer mutation denied.
let viewerError = null;
const viewerState = createOperatingDay(clone(fixtureSet.baseDayInput));
try {
  executeOperatingDayCommand(
    viewerState,
    command(
      "viewer-ready",
      "2026-08-02T08:30:00.000Z",
      "SET_LOAD_STATUS",
      actors.viewer,
      { loadId: "load-brisket", status: "READY" },
    ),
  );
} catch (error) {
  viewerError = error;
}
pass(
  viewerError instanceof TodayOperationsValidationError,
  "TO-004: viewer mutation throws validation error",
);
pass(
  viewerError?.field === "actor.role",
  "TO-004: viewer mutation identifies actor.role",
);
pass(
  viewerState.loads[0].status === "PLANNED",
  "TO-004: viewer mutation does not alter load",
);

// TO-005 — urgent action derivation.
const urgentState = createOperatingDay(clone(fixtureSet.baseDayInput));
const board = deriveTodayBoard(urgentState, "2026-08-03T22:30:00.000Z");
const urgentTypes = new Set(board.urgentActions.map((item) => item.type));
for (const type of fixtureSet.scenarios.find((row) => row.id === "TO-005").expected.contains) {
  pass(urgentTypes.has(type), `TO-005: urgent board contains ${type}`);
}

// TO-006 — EOD validation.
let eodState = createOperatingDay(clone(fixtureSet.baseDayInput));
eodState = advanceLoadToCompleted(
  eodState,
  "load-brisket",
  18,
  "eod-validation-brisket",
);
let decimalSealedError = null;
try {
  executeOperatingDayCommand(
    eodState,
    command(
      "decimal-sealed",
      "2026-08-03T21:00:00.000Z",
      "SUBMIT_EOD_PRODUCT",
      actors.kc,
      { productCode: "BRISKET", sealedUnits: 1.5, openCookedLb: 0 },
    ),
  );
} catch (error) {
  decimalSealedError = error;
}
pass(
  decimalSealedError instanceof TodayOperationsValidationError,
  "TO-006: decimal sealed value is rejected",
);
pass(
  decimalSealedError?.field === "payload.sealedUnits",
  "TO-006: decimal sealed value identifies payload.sealedUnits",
);

let impossibleEodError = null;
try {
  executeOperatingDayCommand(
    eodState,
    command(
      "impossible-eod",
      "2026-08-03T21:05:00.000Z",
      "SUBMIT_EOD_PRODUCT",
      actors.kc,
      { productCode: "BRISKET", sealedUnits: 100, openCookedLb: 0 },
    ),
  );
} catch (error) {
  impossibleEodError = error;
}
pass(
  impossibleEodError instanceof TodayOperationsValidationError,
  "TO-006: impossible EOD value is rejected",
);
pass(
  impossibleEodError?.field === "payload",
  "TO-006: impossible EOD value identifies payload",
);

// TO-007 — manager correction preserves original.
let correctionState = createOperatingDay(clone(fixtureSet.baseDayInput));
correctionState = advanceLoadToCompleted(
  correctionState,
  "load-pork",
  26,
  "correction-pork",
);
correctionState = apply(
  correctionState,
  command(
    "pork-eod-original",
    "2026-08-03T21:00:00.000Z",
    "SUBMIT_EOD_PRODUCT",
    actors.kc,
    { productCode: "PORK", sealedUnits: 2, openCookedLb: 0 },
  ),
);
correctionState = apply(
  correctionState,
  command(
    "pork-eod-correction",
    "2026-08-03T21:10:00.000Z",
    "CORRECT_EOD_PRODUCT",
    actors.km,
    {
      productCode: "PORK",
      sealedUnits: 1,
      openCookedLb: 0,
      reason: "Physical recount found one sealed unit",
    },
  ),
);
pass(
  correctionState.eod.corrections.length === 1,
  "TO-007: one correction history record exists",
);
pass(
  correctionState.eod.submissions.PORK.sealedUnits === 1,
  "TO-007: current corrected sealed quantity is one",
);
pass(
  correctionState.eod.corrections[0].priorSubmission.sealedUnits === 2,
  "TO-007: original sealed quantity remains preserved",
);

// TO-008 — exception blocks close until resolved.
let exceptionState = createOperatingDay(clone(fixtureSet.baseDayInput));
exceptionState = apply(
  exceptionState,
  command(
    "open-exception",
    "2026-08-02T08:00:00.000Z",
    "FLAG_EXCEPTION",
    actors.pit,
    {
      loadId: "load-brisket",
      severity: "P1",
      reason: "Smoker ignition requires inspection",
    },
  ),
);
let closeWithExceptionError = null;
try {
  executeOperatingDayCommand(
    exceptionState,
    command(
      "close-with-exception",
      "2026-08-03T22:00:00.000Z",
      "CLOSE_OPERATING_DAY",
      actors.km,
      {},
    ),
  );
} catch (error) {
  closeWithExceptionError = error;
}
pass(
  closeWithExceptionError instanceof TodayOperationsValidationError,
  "TO-008: exception blocks day close",
);
pass(
  closeWithExceptionError?.field === "day",
  "TO-008: blocked close identifies day",
);
exceptionState = apply(
  exceptionState,
  command(
    "resolve-exception",
    "2026-08-02T08:15:00.000Z",
    "RESOLVE_EXCEPTION",
    actors.km,
    {
      loadId: "load-brisket",
      resolution: "Igniter inspected and smoker cleared for use",
    },
  ),
);
pass(
  exceptionState.loads.find((load) => load.loadId === "load-brisket")?.status ===
    "PLANNED",
  "TO-008: resolved exception returns to prior status",
);

// TO-009 — rollover and carryover.
const nextInput = clone(fixtureSet.baseDayInput);
nextInput.operatingDate = "2026-08-04";
nextInput.planId = "pp-validation-1150-next";
nextInput.forecastCalculationId = "fc-validation-1150-next";
const rollover = rolloverOperatingDay(
  closedDay,
  nextInput,
  command(
    "rollover-001",
    "2026-08-03T22:05:00.000Z",
    "ROLLOVER_OPERATING_DAY",
    actors.km,
    {},
  ),
);
pass(
  rollover.nextDay?.operatingDate === "2026-08-04",
  "TO-009: next operating date is consecutive",
);
pass(
  rollover.carryover.find((row) => row.productCode === "BRISKET")
    ?.eligibleSealedUnits === 0,
  "TO-009: sealed brisket is excluded from rollover",
);
pass(
  rollover.carryover.find((row) => row.productCode === "PORK")
    ?.eligibleSealedUnits === 1,
  "TO-009: sealed pork rolls to the next day",
);

// TO-010 — audited load correction.
let loadCorrectionState = createOperatingDay(clone(fixtureSet.baseDayInput));
loadCorrectionState = apply(
  loadCorrectionState,
  command(
    "ready-before-correction",
    "2026-08-02T08:30:00.000Z",
    "SET_LOAD_STATUS",
    actors.pit,
    { loadId: "load-ribs", status: "READY" },
  ),
);
loadCorrectionState = apply(
  loadCorrectionState,
  command(
    "loaded-before-correction",
    "2026-08-02T08:35:00.000Z",
    "SET_LOAD_STATUS",
    actors.pit,
    {
      loadId: "load-ribs",
      status: "LOADED",
      actualQuantity: 17,
    },
  ),
);
loadCorrectionState = apply(
  loadCorrectionState,
  command(
    "correct-load-status",
    "2026-08-02T08:40:00.000Z",
    "CORRECT_LOAD_STATUS",
    actors.km,
    {
      loadId: "load-ribs",
      status: "READY",
      reason: "Loaded status was selected before product entered smoker",
    },
  ),
);
pass(
  loadCorrectionState.loads.find((load) => load.loadId === "load-ribs")
    ?.status === "READY",
  "TO-010: manager correction changes status to READY",
);
pass(
  loadCorrectionState.eventLog.at(-1)?.type === "LOAD_STATUS_CORRECTED",
  "TO-010: correction creates append-only correction event",
);

// Supplemental contingency and notes evidence.
let noteState = createOperatingDay(clone(fixtureSet.baseDayInput));
noteState = apply(
  noteState,
  command(
    "offline-note",
    "2026-08-02T08:10:00.000Z",
    "ADD_LOAD_NOTE",
    actors.pit,
    {
      loadId: "load-pork",
      note: "Recovered note entered during transient network interruption",
      offlineDraftRecovered: true,
    },
  ),
);
const snapshot = createContingencySnapshot(
  noteState,
  "2026-08-02T08:15:00.000Z",
);
pass(snapshot.snapshotId.startsWith("snapshot-"), "contingency snapshot has deterministic ID");
pass(
  snapshot.loads.find((load) => load.loadId === "load-pork")?.notes.length === 1,
  "contingency snapshot preserves recovered operational note",
);

if (failures.length) {
  console.error(`\nBuild 11.5.0 Today Operations test failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log("\nBuild 11.5.0 Today Operations fixture test passed.");

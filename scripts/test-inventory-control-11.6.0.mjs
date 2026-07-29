#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  InventoryControlValidationError,
  createInventoryContingencySnapshot,
  createInventoryDay,
  deriveInventoryBoard,
  executeInventoryCommand,
} from "../lib/inventory-control/build-11.6.0/inventory-control-engine.mjs";

const root = process.cwd();
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(root, "config", "inventory-control-fixtures-11.6.0.json"),
    "utf8",
  ),
);
const failures = [];

const actors = {
  km: { id: "km-1160", name: "Kitchen Manager", role: "KM" },
  pit: { id: "pit-1160", name: "Pitmaster", role: "PITMASTER" },
  kc: { id: "kc-1160", name: "Kitchen Coordinator", role: "KC" },
  viewer: { id: "view-1160", name: "Read Only", role: "VIEWER" },
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
function cmd(commandId, type, actor, payload = {}, tenantId = undefined, occurredAt = "2026-08-03T12:00:00.000Z") {
  return { commandId, type, actor, payload, tenantId, occurredAt };
}
function apply(state, command) {
  return executeInventoryCommand(state, command).state;
}
function board(state) {
  return deriveInventoryBoard(state, "2026-08-03T22:00:00.000Z");
}
function balance(state, productCode) {
  return board(state).balances.find((row) => row.productCode === productCode);
}
function countExact(state, productCode, prefix) {
  const row = balance(state, productCode);
  return apply(
    state,
    cmd(
      `${prefix}-${productCode.toLowerCase()}`,
      "COUNT_INVENTORY",
      actors.kc,
      {
        productCode,
        observedAvailableCookedLb: row.availableCookedLb,
        observedHeldCookedLb: row.heldCookedLb,
      },
      state.tenantId,
      "2026-08-03T21:30:00.000Z",
    ),
  );
}
function countAllExact(state, prefix = "count") {
  let current = state;
  for (const code of ["BRISKET", "PORK", "RIBS", "CHICKEN"]) {
    current = countExact(current, code, prefix);
  }
  return current;
}

function buildBalancedDay() {
  let state = createInventoryDay(clone(fixtures.baseInput));
  const receipts = { BRISKET: 50, PORK: 60, RIBS: 30, CHICKEN: 20 };
  for (const [code, quantity] of Object.entries(receipts)) {
    state = apply(
      state,
      cmd(
        `balanced-receipt-${code}`,
        "RECEIVE_PRODUCTION",
        actors.pit,
        { productCode: code, quantityCookedLb: quantity, loadId: `load-${code}` },
        state.tenantId,
        "2026-08-03T10:00:00.000Z",
      ),
    );
  }
  const usage = { BRISKET: 42, PORK: 50, RIBS: 24, CHICKEN: 18 };
  for (const [code, quantity] of Object.entries(usage)) {
    state = apply(
      state,
      cmd(
        `balanced-usage-${code}`,
        "RECORD_SERVICE_USAGE",
        actors.kc,
        { productCode: code, quantityCookedLb: quantity, servicePeriodId: "dinner" },
        state.tenantId,
        "2026-08-03T20:30:00.000Z",
      ),
    );
  }
  state = apply(
    state,
    cmd(
      "balanced-waste-pork",
      "RECORD_WASTE",
      actors.kc,
      { productCode: "PORK", quantityCookedLb: 2, reason: "SERVICE_ERROR", note: "End-of-line service loss" },
      state.tenantId,
      "2026-08-03T20:45:00.000Z",
    ),
  );
  state = countAllExact(state, "balanced-count");
  state = apply(
    state,
    cmd(
      "balanced-close",
      "CLOSE_INVENTORY_DAY",
      actors.km,
      { reason: "Inventory reconciled after full operating day" },
      state.tenantId,
      "2026-08-03T22:00:00.000Z",
    ),
  );
  return state;
}

// IC-001 — balanced operating day.
const closed = buildBalancedDay();
pass(closed.status === "CLOSED", "IC-001: balanced inventory day closes");
pass(Object.keys(closed.counts).length === 4, "IC-001: four products are counted");
pass(board(closed).balances.every((row) => row.availableCookedLb >= 0 && row.heldCookedLb >= 0), "IC-001: no negative balances");

// IC-002 — negative inventory prevention.
let negativeState = createInventoryDay(clone(fixtures.baseInput));
let negativeError = null;
try {
  executeInventoryCommand(
    negativeState,
    cmd(
      "negative-usage",
      "RECORD_SERVICE_USAGE",
      actors.kc,
      { productCode: "CHICKEN", quantityCookedLb: 100, servicePeriodId: "test" },
      negativeState.tenantId,
    ),
  );
} catch (error) {
  negativeError = error;
}
pass(negativeError instanceof InventoryControlValidationError, "IC-002: excessive removal throws validation error");
pass(negativeError?.field === "payload.quantityCookedLb", "IC-002: excessive removal identifies quantity field");

// IC-003 — waste reason required.
let wasteError = null;
try {
  executeInventoryCommand(
    negativeState,
    cmd(
      "waste-no-reason",
      "RECORD_WASTE",
      actors.kc,
      { productCode: "PORK", quantityCookedLb: 1, reason: "" },
      negativeState.tenantId,
    ),
  );
} catch (error) {
  wasteError = error;
}
pass(wasteError instanceof InventoryControlValidationError, "IC-003: missing waste reason throws validation error");
pass(wasteError?.field === "payload.reason", "IC-003: missing waste reason identifies reason");

// IC-004 — quality hold and release.
let holdState = createInventoryDay(clone(fixtures.baseInput));
const beforeHold = balance(holdState, "BRISKET").availableCookedLb;
const openedHold = executeInventoryCommand(
  holdState,
  cmd(
    "hold-open-release",
    "OPEN_QUALITY_HOLD",
    actors.pit,
    {
      productCode: "BRISKET",
      quantityCookedLb: 4,
      reason: "TEMPERATURE_REVIEW",
      severity: "P1",
      blocking: true,
      owner: actors.km,
    },
    holdState.tenantId,
  ),
);
holdState = openedHold.state;
pass(balance(holdState, "BRISKET").availableCookedLb === beforeHold - 4, "IC-004: open hold removes quantity from available");
holdState = apply(
  holdState,
  cmd(
    "hold-release",
    "RELEASE_QUALITY_HOLD",
    actors.km,
    { holdId: openedHold.result.holdId, resolution: "Temperature log confirmed product remained within limits" },
    holdState.tenantId,
  ),
);
pass(holdState.holds[0].status === "RELEASED", "IC-004: quality hold is released");
pass(balance(holdState, "BRISKET").availableCookedLb === beforeHold, "IC-004: released quantity returns to available");

// IC-005 — discard held inventory creates waste.
let discardState = createInventoryDay(clone(fixtures.baseInput));
const openedDiscard = executeInventoryCommand(
  discardState,
  cmd(
    "hold-open-discard",
    "OPEN_QUALITY_HOLD",
    actors.pit,
    {
      productCode: "CHICKEN",
      quantityCookedLb: 2,
      reason: "QUALITY_REVIEW",
      severity: "P1",
      blocking: true,
      owner: actors.km,
    },
    discardState.tenantId,
  ),
);
discardState = executeInventoryCommand(
  openedDiscard.state,
  cmd(
    "hold-discard",
    "DISCARD_QUALITY_HOLD",
    actors.km,
    {
      holdId: openedDiscard.result.holdId,
      resolution: "Texture and aroma failed quality review",
      wasteReason: "QUALITY_FAILURE",
    },
    openedDiscard.state.tenantId,
  ),
).state;
pass(discardState.holds[0].status === "DISCARDED", "IC-005: quality hold is discarded");
pass(discardState.ledger.at(-1)?.transactionType === "QUALITY_DISCARD", "IC-005: discard creates quality-discard ledger entry");
pass(discardState.ledger.at(-1)?.reason === "QUALITY_FAILURE", "IC-005: discard retains waste reason");

// IC-006 — critical exception ownership and resolution.
let exceptionState = createInventoryDay(clone(fixtures.baseInput));
const openedException = executeInventoryCommand(
  exceptionState,
  cmd(
    "exception-open-p1",
    "OPEN_EXCEPTION",
    actors.kc,
    {
      severity: "P1",
      summary: "Inventory count sheet is missing for pork",
      productCode: "PORK",
      dueAt: "2026-08-03T21:00:00.000Z",
    },
    exceptionState.tenantId,
  ),
);
exceptionState = openedException.state;
exceptionState = countAllExact(exceptionState, "exception-count");
let exceptionCloseError = null;
try {
  executeInventoryCommand(
    exceptionState,
    cmd("exception-close-attempt", "CLOSE_INVENTORY_DAY", actors.km, {}, exceptionState.tenantId),
  );
} catch (error) {
  exceptionCloseError = error;
}
pass(exceptionCloseError instanceof InventoryControlValidationError, "IC-006: unowned P1 blocks close");
pass(exceptionCloseError?.field === "day", "IC-006: blocked close identifies day");
exceptionState = apply(
  exceptionState,
  cmd(
    "exception-assign",
    "ASSIGN_EXCEPTION",
    actors.km,
    { exceptionId: openedException.result.exceptionId, owner: actors.pit },
    exceptionState.tenantId,
  ),
);
exceptionState = apply(
  exceptionState,
  cmd(
    "exception-ack",
    "ACKNOWLEDGE_EXCEPTION",
    actors.pit,
    { exceptionId: openedException.result.exceptionId },
    exceptionState.tenantId,
  ),
);
exceptionState = apply(
  exceptionState,
  cmd(
    "exception-resolve",
    "RESOLVE_EXCEPTION",
    actors.km,
    { exceptionId: openedException.result.exceptionId, resolution: "Paper count sheet was located and attached" },
    exceptionState.tenantId,
  ),
);
pass(exceptionState.exceptions[0].status === "RESOLVED", "IC-006: assigned critical exception resolves");

// IC-007 — duplicate command.
let duplicateState = createInventoryDay(clone(fixtures.baseInput));
const duplicateCommand = cmd(
  "duplicate-receipt",
  "RECEIVE_PRODUCTION",
  actors.pit,
  { productCode: "PORK", quantityCookedLb: 5, loadId: "load-pork" },
  duplicateState.tenantId,
);
const first = executeInventoryCommand(duplicateState, duplicateCommand);
const second = executeInventoryCommand(first.state, duplicateCommand);
pass(first.result.status === "APPLIED", "IC-007: first command applies");
pass(second.result.status === "DUPLICATE", "IC-007: repeated command is duplicate");
pass(second.state.events.length === 1 && second.state.ledger.length === 1, "IC-007: duplicate creates one event and ledger entry total");

// IC-008 — warning and blocking count variance.
let warningState = createInventoryDay(clone(fixtures.baseInput));
const porkExpected = balance(warningState, "PORK").onHandCookedLb;
warningState = apply(
  warningState,
  cmd(
    "count-warning",
    "COUNT_INVENTORY",
    actors.kc,
    {
      productCode: "PORK",
      observedAvailableCookedLb: porkExpected - 0.75,
      observedHeldCookedLb: 0,
    },
    warningState.tenantId,
  ),
);
pass(warningState.counts.PORK.classification === "WARNING", "IC-008: 5% count variance is warning");
let blockingState = createInventoryDay(clone(fixtures.baseInput));
const ribExpected = balance(blockingState, "RIBS").onHandCookedLb;
blockingState = apply(
  blockingState,
  cmd(
    "count-blocking",
    "COUNT_INVENTORY",
    actors.kc,
    {
      productCode: "RIBS",
      observedAvailableCookedLb: ribExpected - 2,
      observedHeldCookedLb: 0,
    },
    blockingState.tenantId,
  ),
);
pass(blockingState.counts.RIBS.classification === "BLOCKING", "IC-008: variance above 10% is blocking");
pass(blockingState.counts.RIBS.resolvedByAdjustment === false, "IC-008: blocking variance requires adjustment");

// IC-009 — append-only manager adjustment.
const originalCount = clone(blockingState.counts.RIBS);
blockingState = apply(
  blockingState,
  cmd(
    "adjust-ribs-to-count",
    "ADJUST_INVENTORY",
    actors.km,
    {
      productCode: "RIBS",
      deltaCookedLb: -2,
      reason: "Physical count confirmed two cooked pounds unaccounted for",
    },
    blockingState.tenantId,
  ),
);
pass(originalCount.observedTotalCookedLb === ribExpected - 2, "IC-009: original count snapshot remains preserved");
pass(blockingState.events.at(-1)?.type === "INVENTORY_ADJUSTED", "IC-009: adjustment creates audited event");
pass(blockingState.counts.RIBS.resolvedByAdjustment === true, "IC-009: adjustment resolves blocking variance");

// IC-010 — transfer pairing.
let transferState = createInventoryDay(clone(fixtures.baseInput));
transferState = apply(
  transferState,
  cmd(
    "transfer-out-001",
    "TRANSFER_OUT",
    actors.km,
    { productCode: "BRISKET", quantityCookedLb: 2, transferId: "tx-001", note: "Move to satellite service station" },
    transferState.tenantId,
  ),
);
transferState = apply(
  transferState,
  cmd(
    "transfer-in-001",
    "TRANSFER_IN",
    actors.km,
    { productCode: "BRISKET", quantityCookedLb: 2, transferId: "tx-001", note: "Return from satellite service station" },
    transferState.tenantId,
  ),
);
pass(transferState.ledger.at(-2)?.transactionType === "TRANSFER_OUT", "IC-010: outbound transfer is recorded");
pass(transferState.ledger.at(-1)?.transactionType === "TRANSFER_IN", "IC-010: inbound transfer is recorded");

// IC-011 — viewer mutation denied.
let viewerError = null;
try {
  executeInventoryCommand(
    createInventoryDay(clone(fixtures.baseInput)),
    cmd(
      "viewer-waste",
      "RECORD_WASTE",
      actors.viewer,
      { productCode: "PORK", quantityCookedLb: 1, reason: "SERVICE_ERROR" },
      fixtures.baseInput.tenantId,
    ),
  );
} catch (error) {
  viewerError = error;
}
pass(viewerError instanceof InventoryControlValidationError, "IC-011: viewer mutation throws validation error");
pass(viewerError?.field === "actor.role", "IC-011: viewer mutation identifies actor.role");

// IC-012 — tenant isolation.
let tenantError = null;
try {
  executeInventoryCommand(
    createInventoryDay(clone(fixtures.baseInput)),
    cmd(
      "cross-tenant",
      "RECEIVE_PRODUCTION",
      actors.pit,
      { productCode: "PORK", quantityCookedLb: 1, loadId: "load-other" },
      "tenant-other",
    ),
  );
} catch (error) {
  tenantError = error;
}
pass(tenantError instanceof InventoryControlValidationError, "IC-012: cross-tenant command throws validation error");
pass(tenantError?.field === "tenantId", "IC-012: cross-tenant command identifies tenantId");

// Supplemental board and contingency evidence.
const riskBoard = board(exceptionState);
pass(riskBoard.urgentActions.length === 0, "resolved exception does not remain urgent");
const snapshot = createInventoryContingencySnapshot(closed, "2026-08-03T22:05:00.000Z");
pass(snapshot.snapshotId.startsWith("isnap-"), "contingency snapshot has deterministic ID");
pass(snapshot.balances.length === 4, "contingency snapshot contains four product balances");

if (failures.length) {
  console.error(`\nBuild 11.6.0 Inventory Control test failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log("\nBuild 11.6.0 Inventory Control fixture test passed.");

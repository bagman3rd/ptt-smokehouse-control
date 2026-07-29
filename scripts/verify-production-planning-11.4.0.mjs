#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { calculateProductionPlan } from "../lib/production-planning/build-11.4.0/production-planning-engine.mjs";

const BUILD = "11.4.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.4.0");
const failures = [];

function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else {
    failures.push(message);
    console.error(`FAIL — ${message}`);
  }
}
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function exact(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

const contractPath = path.join(root, "config", "production-planning-contract-11.4.0.json");
const fixturesPath = path.join(root, "config", "production-planning-fixtures-11.4.0.json");
pass(fs.existsSync(contractPath), "production contract exists");
pass(fs.existsSync(fixturesPath), "production fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturesPath)) process.exit(1);

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixtureSet = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));

pass(contract.buildVersion === BUILD, "contract build version is 11.4.0");
pass(contract.calculationVersion === "PTT_PRODUCTION_PLAN_11_4_0", "production calculation version is controlled");
pass(contract.carryoverRules.sourceDate === "PRIOR_OPERATING_DATE_ONLY", "carryover is prior-day only");
pass(contract.carryoverRules.visibleHistoryDays === 10, "ten EOD days remain visible");
pass(contract.carryoverRules.sealedBrisketEligible === false, "sealed brisket is excluded");
pass(contract.carryoverRules.sealedPorkEligible === true, "sealed pork is eligible");
pass(contract.carryoverRules.sealedRibsEligible === true, "sealed ribs are eligible");
pass(contract.carryoverRules.sealedChickenEligible === true, "sealed chicken is eligible");
pass(contract.roundingRules.negativeProductionAllowed === false, "negative production is prohibited");
pass(contract.roundingRules.roundingDirection === "UP", "operational rounding is upward");
pass(exact(contract.scheduleRules.smokerCookWindows, [
  "Overnight only",
  "Same-day only",
  "All day / flexible",
  "Backup / overflow only",
  "Not currently active",
]), "cook-window values exactly match the approved list");
pass(contract.canonicalProducts.length === 4, "four core products are configured");
pass(fixtureSet.fixtures.length >= 8, "at least eight production fixtures exist");

for (const fixture of fixtureSet.fixtures) {
  let plan = null;
  try {
    plan = calculateProductionPlan(fixture.input);
  } catch (error) {
    pass(false, `${fixture.id} calculates without error: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  pass(plan.calculationVersion === contract.calculationVersion, `${fixture.id} retains calculation version`);
  pass(plan.requirements.length === 4, `${fixture.id} returns four product requirements`);
  pass(plan.requirements.every((row) => row.netDemand >= 0), `${fixture.id} has no negative net demand`);
  pass(plan.schedule.bookings.every((booking) => booking.quantity > 0), `${fixture.id} has positive batch quantities`);
}

const requiredOutputs = [
  "production-workbench-route.json",
  "production-capability-map.csv",
  "production-source-evidence.csv",
  "production-known-scenarios.csv",
  "seven-day-production-plan.csv",
  "production-uat-workbook.csv",
  "production-findings.csv",
  "production-readiness.json",
  "production-contract-snapshot.json",
  "production-fixture-snapshot.json",
  "production-readiness-summary.md",
  "production-hash-manifest.json",
];
for (const name of requiredOutputs) {
  pass(fs.existsSync(path.join(outDir, name)), `required output exists: ${name}`);
}

const routeRecordPath = path.join(outDir, "production-workbench-route.json");
if (fs.existsSync(routeRecordPath)) {
  const routeRecord = JSON.parse(fs.readFileSync(routeRecordPath, "utf8"));
  pass(routeRecord.buildVersion === BUILD, "Production Workbench route record uses Build 11.4.0");
  pass(routeRecord.route.startsWith("/admin/production-lab-1140"), "Production Workbench uses an isolated admin route");
  const pageSource = path.join(root, routeRecord.pageSource);
  const componentSource = path.join(root, routeRecord.componentSource);
  pass(fs.existsSync(pageSource), "Production Workbench page exists");
  pass(fs.existsSync(componentSource), "Production Workbench component exists");
  if (fs.existsSync(pageSource)) {
    pass(fs.readFileSync(pageSource, "utf8").includes("BUILD_11_4_0_GENERATED"), "Production page has generated marker");
  }
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(componentSource, "utf8");
    pass(source.includes("Production Planning and Smoker Scheduling"), "Production Workbench has the correct title");
    pass(source.includes("does not persist production records"), "Production Workbench does not falsely claim persistence");
    pass(source.includes("validation inputs—not approved PTT master data"), "Production Workbench distinguishes validation values");
  }
}

const readinessPath = path.join(outDir, "production-readiness.json");
if (fs.existsSync(readinessPath)) {
  const report = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
  pass(report.buildVersion === BUILD, "production readiness report uses Build 11.4.0");
  pass(report.counts.fixtures === fixtureSet.fixtures.length, "readiness fixture count matches fixture set");
  pass(report.counts.sevenDayRows === 7, "seven-day evidence contains seven operating dates");
  pass(report.sevenDayRows.every((row) => row.unscheduledUnits >= 0), "seven-day evidence has no negative shortfall");
  pass(report.findings.every((finding) => ["P0", "P1", "P2", "P3"].includes(finding.severity)), "all findings use approved severities");
}

const manifestPath = path.join(outDir, "production-hash-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  pass(manifest.buildVersion === BUILD, "production hash manifest uses Build 11.4.0");
  for (const [name, expected] of Object.entries(manifest.files || {})) {
    const file = path.join(outDir, name);
    pass(fs.existsSync(file), `hash target exists: ${name}`);
    if (fs.existsSync(file)) pass(hash(fs.readFileSync(file)) === expected, `hash matches: ${name}`);
  }
}

const renderPath = path.join(root, "render.yaml");
pass(fs.existsSync(renderPath), "render.yaml exists");
if (fs.existsSync(renderPath)) {
  const render = fs.readFileSync(renderPath, "utf8");
  pass(/key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"11\.(?:4|5)\.0"/m.test(render), "Render APP_BUILD_VERSION is compatible with the Build 11.4.0 production baseline");
  pass(/databases:\s*[\s\S]*?name:\s*ptt-smokehouse-control-db[\s\S]*?plan:\s*basic-256mb/m.test(render), "database plan remains basic-256mb");
  pass((render.match(/^\s*runtime:\s*node\s*$/gm) || []).length === 4, "all four Render services use runtime: node");
}

if (failures.length) {
  console.error(`\nBuild ${BUILD} verification failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log(`\nBuild ${BUILD} Production Planning verification passed.`);

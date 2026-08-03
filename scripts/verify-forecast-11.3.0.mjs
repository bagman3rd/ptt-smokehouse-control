#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { calculateForecast } from "../lib/forecasting/build-11.3.0/forecast-engine.mjs";

const BUILD = "11.3.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.3.0");
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

const contractPath = path.join(root, "config", "forecast-contract-11.3.0.json");
const fixturesPath = path.join(root, "config", "forecast-fixtures-11.3.0.json");
pass(fs.existsSync(contractPath), "forecast contract exists");
pass(fs.existsSync(fixturesPath), "forecast fixtures exist");
if (!fs.existsSync(contractPath) || !fs.existsSync(fixturesPath)) process.exit(1);

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const fixtureSet = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));

pass(contract.buildVersion === BUILD, "contract build version is 11.3.0");
pass(contract.calculationVersion === "PTT_FORECAST_11_3_0", "calculation version is controlled");
pass(exact(contract.dayOfWeekShares, {
  MONDAY: 9,
  TUESDAY: 8,
  WEDNESDAY: 10,
  THURSDAY: 12,
  FRIDAY: 17,
  SATURDAY: 25,
  SUNDAY: 19,
}), "day-of-week shares exactly match the approved PTT distribution");
pass(contract.salesDisplay.barAllocationPercent === 20, "bar allocation display is 20%");
pass(contract.salesDisplay.foodAllocationPercent === 80, "food allocation display is 80%");
pass(contract.products.length === 4, "four core products are forecast");
pass(fixtureSet.fixtures.length >= 8, "at least eight known forecast fixtures exist");

for (const fixture of fixtureSet.fixtures) {
  let calculation = null;
  try {
    calculation = calculateForecast(fixture.input);
  } catch (error) {
    pass(false, `${fixture.id} calculates without error: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  pass(calculation.calculationVersion === contract.calculationVersion, `${fixture.id} retains calculation version`);
  pass(calculation.demand.lines.length === 4, `${fixture.id} returns four product lines`);
}

const requiredOutputs = [
  "forecast-workbench-route.json",
  "forecast-capability-map.csv",
  "forecast-source-evidence.csv",
  "forecast-known-scenarios.csv",
  "forecast-uat-workbook.csv",
  "forecast-findings.csv",
  "forecast-readiness.json",
  "forecast-contract-snapshot.json",
  "forecast-fixture-snapshot.json",
  "forecast-readiness-summary.md",
  "forecast-hash-manifest.json",
];
for (const name of requiredOutputs) {
  pass(fs.existsSync(path.join(outDir, name)), `required output exists: ${name}`);
}

const routePath = path.join(outDir, "forecast-workbench-route.json");
if (fs.existsSync(routePath)) {
  const routeRecord = JSON.parse(fs.readFileSync(routePath, "utf8"));
  pass(routeRecord.buildVersion === BUILD, "Forecast Workbench route record uses Build 11.3.0");
  pass(routeRecord.route.startsWith("/admin/forecast-lab-1130"), "Forecast Workbench uses an isolated admin route");
  const pageSource = path.join(root, routeRecord.pageSource);
  const componentSource = path.join(root, routeRecord.componentSource);
  pass(fs.existsSync(pageSource), "Forecast Workbench page exists");
  pass(fs.existsSync(componentSource), "Forecast Workbench component exists");
  if (fs.existsSync(pageSource)) pass(fs.readFileSync(pageSource, "utf8").includes("BUILD_11_3_0_GENERATED"), "Forecast page has generated marker");
  if (fs.existsSync(componentSource)) {
    const source = fs.readFileSync(componentSource, "utf8");
    pass(source.includes("Forecast and Demand"), "Forecast Workbench has the correct title");
    pass(source.includes("This lab does not"), "Forecast Workbench does not falsely claim persistence");
  }
}

const readinessPath = path.join(outDir, "forecast-readiness.json");
if (fs.existsSync(readinessPath)) {
  const report = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
  pass(report.buildVersion === BUILD, "forecast readiness report uses Build 11.3.0");
  pass(report.counts.fixtures === fixtureSet.fixtures.length, "readiness fixture count matches fixture set");
  pass(report.findings.every((finding) => ["P0", "P1", "P2", "P3"].includes(finding.severity)), "all findings use approved severities");
}

const manifestPath = path.join(outDir, "forecast-hash-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  pass(manifest.buildVersion === BUILD, "forecast hash manifest uses Build 11.3.0");
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
  pass(/key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"(?:11\.(?:3|4|5|6|7|8|9)|12\.0)\.0"/m.test(render), "Render APP_BUILD_VERSION is compatible with the Build 11.3.0 forecast baseline");
  pass(/databases:\s*[\s\S]*?name:\s*ptt-smokehouse-control-db[\s\S]*?plan:\s*basic-256mb/m.test(render), "database plan remains basic-256mb");
  pass((render.match(/^\s*runtime:\s*node\s*$/gm) || []).length === 1, "the single Render web service uses runtime: node");
}

if (failures.length) {
  console.error(`\nBuild ${BUILD} verification failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log(`\nBuild ${BUILD} Forecast and Demand verification passed.`);

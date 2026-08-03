#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.2.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.2.0");
const contractPath = path.join(root, "config", "ptt-master-data-contract-11.2.0.json");
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
function exact(values, expected) {
  return JSON.stringify(values) === JSON.stringify(expected);
}

pass(fs.existsSync(contractPath), "master-data contract exists");
if (!fs.existsSync(contractPath)) process.exit(1);
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));

pass(contract.buildVersion === BUILD, "contract build version is 11.2.0");
pass(contract.schemaVersion === 1, "contract schema version is 1");
pass(
  contract.acceptanceStatement.includes("without direct database edits"),
  "acceptance statement prohibits direct database edits"
);

pass(exact(contract.smokerLocationValues, [
  "Outdoor",
  "Indoors under hood",
  "In the wall",
  "Outdoors in smoke house"
]), "smoker location values exactly match the approved list");

pass(exact(contract.cookWindowValues, [
  "Overnight only",
  "Same-day only",
  "All day / flexible",
  "Backup / overflow only",
  "Not currently active"
]), "cook-window values exactly match the approved list");

pass(exact(contract.canonicalRoles.map((role) => role.code), [
  "ADMIN", "OWNER", "KM", "KC", "PITMASTER", "VIEWER"
]), "canonical roles exactly match the approved role set");

const products = new Map(contract.products.map((product) => [product.code, product]));
pass(products.size === 4, "four core smoked products are defined");
pass(products.has("BRISKET") && products.has("PORK") && products.has("RIBS") && products.has("CHICKEN"), "all four core products are present");
pass(products.get("PORK")?.yieldPercent === 55, "pork baseline yield is 55%");
pass(products.get("CHICKEN")?.yieldPercent === 75, "chicken baseline yield is 75%");
pass(products.get("RIBS")?.yieldPercent === 90, "rib baseline yield is 90%");
pass(products.get("BRISKET")?.yieldPercent === null, "brisket yield is not silently hard-coded");
pass(products.get("BRISKET")?.yieldPolicy === "CONFIGURABLE_EFFECTIVE_DATED_REQUIRED", "brisket requires an effective-dated configured yield");
pass(products.get("RIBS")?.planningDisplayUnit === "rack", "ribs display in racks");
pass(products.get("CHICKEN")?.rawWeightPerDisplayUnitLb === 2.5, "chicken display unit is 2.5 lb raw");
pass(products.get("CHICKEN")?.smokerSpaceUnitsPerDisplayUnit === 1, "chicken display unit consumes one smoker-space unit");
pass(products.get("BRISKET")?.sealedCarryoverEligible === false, "sealed brisket is not carryover eligible");
pass(products.get("PORK")?.sealedCarryoverEligible === true, "sealed pork is carryover eligible");
pass(products.get("RIBS")?.sealedCarryoverEligible === true, "sealed ribs are carryover eligible");
pass(products.get("CHICKEN")?.sealedCarryoverEligible === true, "sealed chicken is carryover eligible");
pass(contract.inventoryRules.sealedQuantityType === "NON_NEGATIVE_INTEGER", "sealed quantity is integer-only");
pass(contract.inventoryRules.openQuantityType === "NON_NEGATIVE_COOKED_POUNDS", "open quantity is cooked pounds");
pass(contract.operatingRules.carryoverLookbackDays === 10, "ten EOD days remain visible");
pass(contract.operatingRules.serviceHours.open === "11:00" && contract.operatingRules.serviceHours.close === "22:00", "service hours are 11:00–22:00");

const requiredFiles = [
  "setup-center-route.json",
  "master-data-readiness.json",
  "canonical-master-data.json",
  "fresh-tenant-configuration-template.json",
  "master-data-capability-map.csv",
  "master-data-field-evidence.csv",
  "master-data-route-evidence.csv",
  "canonical-value-evidence.csv",
  "fresh-tenant-uat-workbook.csv",
  "master-data-findings.csv",
  "master-data-readiness-summary.md",
  "master-data-hash-manifest.json"
];
for (const fileName of requiredFiles) {
  pass(fs.existsSync(path.join(outDir, fileName)), `required output exists: ${fileName}`);
}

const routeRecordPath = path.join(outDir, "setup-center-route.json");
if (fs.existsSync(routeRecordPath)) {
  const routeRecord = JSON.parse(fs.readFileSync(routeRecordPath, "utf8"));
  pass(routeRecord.buildVersion === BUILD, "Setup Center route record uses Build 11.2.0");
  pass(routeRecord.route.startsWith("/admin/setup-center"), "Setup Center is under the admin route");
  const sourcePath = path.join(root, "app", ...routeRecord.route.split("/").filter(Boolean), "page.tsx");
  pass(fs.existsSync(sourcePath), "generated Setup Center page exists");
  if (fs.existsSync(sourcePath)) {
    const source = fs.readFileSync(sourcePath, "utf8");
    pass(source.includes("BUILD_11_2_0_GENERATED"), "Setup Center contains the generated-build marker");
    pass(source.includes("Direct database editing is not an accepted setup method"), "Setup Center states the no-direct-database-edit rule");
  }
}

const readinessPath = path.join(outDir, "master-data-readiness.json");
if (fs.existsSync(readinessPath)) {
  const readiness = JSON.parse(fs.readFileSync(readinessPath, "utf8"));
  pass(readiness.buildVersion === BUILD, "readiness report uses Build 11.2.0");
  pass(readiness.capabilityMap.length === contract.requiredCapabilities.length, "all required capabilities are mapped");
  pass(readiness.findings.every((finding) => ["P0", "P1", "P2", "P3"].includes(finding.severity)), "all findings use approved severity values");
}

const manifestPath = path.join(outDir, "master-data-hash-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  pass(manifest.buildVersion === BUILD, "hash manifest uses Build 11.2.0");
  for (const [fileName, expected] of Object.entries(manifest.files || {})) {
    const file = path.join(outDir, fileName);
    pass(fs.existsSync(file), `hash target exists: ${fileName}`);
    if (fs.existsSync(file)) pass(hash(fs.readFileSync(file)) === expected, `hash matches: ${fileName}`);
  }
}

const renderPath = path.join(root, "render.yaml");
pass(fs.existsSync(renderPath), "render.yaml exists");
if (fs.existsSync(renderPath)) {
  const render = fs.readFileSync(renderPath, "utf8");
  pass(/key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"(?:11\.(?:2|3|4|5|6|7|8|9)|12\.(?:0|1|2))\.0"/m.test(render), "Render APP_BUILD_VERSION is compatible with the Build 11.2.0 master-data baseline");
  pass(/databases:\s*[\s\S]*?name:\s*ptt-smokehouse-control-db[\s\S]*?plan:\s*basic-256mb/m.test(render), "database plan remains basic-256mb");
  pass((render.match(/^\s*runtime:\s*node\s*$/gm) || []).length === 1, "the single Render web service uses runtime: node");
}

if (failures.length) {
  console.error(`\nBuild ${BUILD} verification failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log(`\nBuild ${BUILD} Setup and Master Data verification passed.`);

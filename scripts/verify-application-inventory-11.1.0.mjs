#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";

const BUILD_VERSION = "11.1.0";
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const root = path.resolve(argValue("--root", process.cwd()));
const outDir = path.resolve(root, argValue("--out", "artifacts/build-11.1.0"));
const policyPath = path.resolve(root, argValue("--policy", "config/application-inventory-policy-11.1.0.json"));
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL — ${message}`);
}
function pass(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else fail(message);
}
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const requiredFiles = [
  "application-inventory.json",
  "route-inventory.csv",
  "control-inventory.csv",
  "form-inventory.csv",
  "navigation-inventory.csv",
  "server-action-inventory.csv",
  "environment-inventory.csv",
  "feature-flag-inventory.csv",
  "integration-inventory.csv",
  "cron-inventory.csv",
  "prisma-inventory.csv",
  "test-inventory.csv",
  "screen-disposition-register.csv",
  "role-route-matrix.csv",
  "live-screen-audit-workbook.csv",
  "inventory-findings.csv",
  "inventory-summary.md",
  "inventory-hash-manifest.json",
];

pass(fs.existsSync(policyPath), "inventory policy exists");
if (!fs.existsSync(policyPath)) process.exit(1);
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
pass(policy.buildVersion === BUILD_VERSION, "policy build version is 11.1.0");

for (const fileName of requiredFiles) {
  pass(fs.existsSync(path.join(outDir, fileName)), `required output exists: ${fileName}`);
}

if (!fs.existsSync(path.join(outDir, "application-inventory.json"))) process.exit(1);
const inventory = JSON.parse(fs.readFileSync(path.join(outDir, "application-inventory.json"), "utf8"));
pass(inventory.buildVersion === BUILD_VERSION, "inventory build version is 11.1.0");
pass(inventory.inventorySchemaVersion === policy.inventorySchemaVersion, "inventory schema matches policy");
pass(Array.isArray(inventory.routes), "route inventory is an array");
pass(Array.isArray(inventory.screenDispositions), "screen disposition register is an array");
pass(Array.isArray(inventory.roleMatrix), "role-route matrix is an array");

const routeKeys = inventory.routes.map((row) => `${row.kind}:${row.route}`);
const duplicateRouteKeys = routeKeys.filter((key, index) => routeKeys.indexOf(key) !== index);
pass(duplicateRouteKeys.length === 0, "no duplicate route/kind keys");

const screens = inventory.routes.filter((row) => row.kind === "screen");
pass(inventory.screenDispositions.length === screens.length, "every screen has one disposition row");
const allowed = new Set(policy.allowedDispositions || []);
const invalidDispositions = inventory.screenDispositions.filter((row) => !allowed.has(row.disposition));
pass(invalidDispositions.length === 0, "every screen uses an allowed disposition");
const unclassified = inventory.screenDispositions.filter((row) => !row.disposition || row.disposition === "UNCLASSIFIED");
pass(unclassified.length === 0, "no screen is unclassified");

const expectedMatrixRows = screens.length * (policy.canonicalRoles || []).length;
pass(inventory.roleMatrix.length === expectedMatrixRows, "role-route matrix covers every screen and canonical role");
for (const role of policy.canonicalRoles || []) {
  pass(inventory.roleMatrix.some((row) => row.role === role), `role matrix contains ${role}`);
}

const manifestPath = path.join(outDir, "inventory-hash-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  pass(manifest.buildVersion === BUILD_VERSION, "hash manifest build version is 11.1.0");
  for (const [fileName, expectedHash] of Object.entries(manifest.files || {})) {
    const fullPath = path.join(outDir, fileName);
    if (!fs.existsSync(fullPath)) {
      fail(`hash target missing: ${fileName}`);
      continue;
    }
    pass(sha256(fs.readFileSync(fullPath)) === expectedHash, `hash matches: ${fileName}`);
  }
}

const renderPath = path.join(root, "render.yaml");
pass(fs.existsSync(renderPath), "render.yaml exists");
if (fs.existsSync(renderPath)) {
  const render = fs.readFileSync(renderPath, "utf8");
  pass(/key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"11\.(?:1|2|3|4)\.0"/m.test(render), "Render APP_BUILD_VERSION is compatible with the cumulative 11.1.0 inventory baseline");
  pass(/databases:\s*[\s\S]*?name:\s*ptt-smokehouse-control-db[\s\S]*?plan:\s*basic-256mb/m.test(render), "database plan remains basic-256mb");
  pass((render.match(/^\s*runtime:\s*node\s*$/gm) || []).length === 4, "all four services use runtime: node");
}

if (failures.length) {
  console.error(`\nBuild ${BUILD_VERSION} inventory verification failed: ${failures.length} control(s).`);
  process.exit(1);
}
console.log(`\nBuild ${BUILD_VERSION} inventory verification passed.`);

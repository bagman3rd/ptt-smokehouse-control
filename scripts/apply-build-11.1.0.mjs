#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const BUILD_VERSION = "11.1.0";
const root = process.cwd();
const packagePath = path.join(root, "package.json");
const renderPath = path.join(root, "render.yaml");
const readmePath = path.join(root, "README.md");

function updatePackageJson() {
  if (!fs.existsSync(packagePath)) {
    console.log("SKIP — package.json not found; inventory scripts remain directly executable.");
    return;
  }
  const original = fs.readFileSync(packagePath, "utf8");
  const data = JSON.parse(original);
  data.version = BUILD_VERSION;
  data.scripts = data.scripts || {};
  data.scripts["inventory:generate"] = "node scripts/application-inventory-11.1.0.mjs";
  data.scripts["inventory:verify"] = "node scripts/verify-application-inventory-11.1.0.mjs";
  data.scripts["inventory:release"] = "node scripts/application-inventory-11.1.0.mjs && node scripts/verify-application-inventory-11.1.0.mjs";
  fs.writeFileSync(packagePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("UPDATED — package.json version and inventory scripts.");
}

function verifyRender() {
  if (!fs.existsSync(renderPath)) throw new Error("render.yaml is missing.");
  const render = fs.readFileSync(renderPath, "utf8");
  if (!/key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"11\.1\.0"/m.test(render)) {
    throw new Error("render.yaml does not declare APP_BUILD_VERSION 11.1.0.");
  }
  console.log("PASS — render.yaml declares Build 11.1.0.");
}

function updateReadmeHeading() {
  if (!fs.existsSync(readmePath)) return;
  const original = fs.readFileSync(readmePath, "utf8");
  const updated = original.replace(
    /^# PTT Smokehouse Control(?:\s+[—-]\s+Build\s+\d+\.\d+\.\d+)?/m,
    "# PTT Smokehouse Control — Build 11.1.0",
  );
  if (updated !== original) {
    fs.writeFileSync(readmePath, updated, "utf8");
    console.log("UPDATED — README build heading.");
  }
}

function run(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

updatePackageJson();
verifyRender();
updateReadmeHeading();
run("scripts/application-inventory-11.1.0.mjs");
run("scripts/verify-application-inventory-11.1.0.mjs");

console.log("\nBuild 11.1.0 overlay applied and repository inventory generated.");

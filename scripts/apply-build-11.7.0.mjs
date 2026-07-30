#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const BUILD = "11.7.0";
const root = process.cwd();

function run(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function updatePackage() {
  const packagePath = path.join(root, "package.json");
  if (!fs.existsSync(packagePath)) {
    console.log(
      "SKIP — package.json not found; scripts remain directly executable.",
    );
    return;
  }
  const data = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  data.version = BUILD;
  data.scripts = data.scripts || {};
  data.scripts["inventory:generate"] =
    "node scripts/application-inventory-11.1.0.mjs";
  data.scripts["inventory:verify"] =
    "node scripts/verify-application-inventory-11.1.0.mjs";
  data.scripts["master-data:generate"] =
    "node scripts/master-data-control-plane-11.2.0.mjs";
  data.scripts["master-data:verify"] =
    "node scripts/verify-master-data-11.2.0.mjs";
  data.scripts["forecast:test"] =
    "node scripts/test-forecast-engine-11.3.0.mjs";
  data.scripts["forecast:evidence"] =
    "node scripts/forecast-control-plane-11.3.0.mjs";
  data.scripts["forecast:verify"] =
    "node scripts/verify-forecast-11.3.0.mjs";
  data.scripts["production:test"] =
    "node scripts/test-production-planning-11.4.0.mjs";
  data.scripts["production:evidence"] =
    "node scripts/production-control-plane-11.4.0.mjs";
  data.scripts["production:verify"] =
    "node scripts/verify-production-planning-11.4.0.mjs";
  data.scripts["today:test"] =
    "node scripts/test-today-operations-11.5.0.mjs";
  data.scripts["today:evidence"] =
    "node scripts/today-operations-control-plane-11.5.0.mjs";
  data.scripts["today:verify"] =
    "node scripts/verify-today-operations-11.5.0.mjs";
  data.scripts["inventory-control:test"] =
    "node scripts/test-inventory-control-11.6.0.mjs";
  data.scripts["inventory-control:evidence"] =
    "node scripts/inventory-control-plane-11.6.0.mjs";
  data.scripts["inventory-control:verify"] =
    "node scripts/verify-inventory-control-11.6.0.mjs";
  data.scripts["reporting:test"] =
    "node scripts/test-reporting-learning-11.7.0.mjs";
  data.scripts["reporting:workbench"] =
    "node scripts/generate-reporting-workbench-11.7.0.mjs";
  data.scripts["reporting:evidence"] =
    "node scripts/reporting-learning-control-plane-11.7.0.mjs";
  data.scripts["reporting:verify"] =
    "node scripts/verify-reporting-learning-11.7.0.mjs";
  data.scripts["build:11.7.0"] =
    "node scripts/apply-build-11.7.0.mjs";
  fs.writeFileSync(
    packagePath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
  console.log(
    "UPDATED — package.json version and Build 11.7.0 scripts.",
  );
}

function updateReadme() {
  const readmePath = path.join(root, "README.md");
  if (!fs.existsSync(readmePath)) return;
  const original = fs.readFileSync(readmePath, "utf8");
  const updated = original.replace(
    /^# PTT Smokehouse Control(?:\s+[—-]\s+Build\s+\d+\.\d+\.\d+)?/m,
    "# PTT Smokehouse Control — Build 11.7.0",
  );
  if (updated !== original) {
    fs.writeFileSync(readmePath, updated, "utf8");
    console.log("UPDATED — README build heading.");
  }
}

function verifyRender() {
  const renderPath = path.join(root, "render.yaml");
  if (!fs.existsSync(renderPath)) {
    throw new Error("render.yaml is missing.");
  }
  const render = fs.readFileSync(renderPath, "utf8");
  if (
    !/key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"11\.7\.0"/m.test(
      render,
    )
  ) {
    throw new Error(
      "render.yaml does not declare APP_BUILD_VERSION 11.7.0.",
    );
  }
  console.log("PASS — render.yaml declares Build 11.7.0.");
}

updatePackage();
updateReadme();
verifyRender();

run("scripts/application-inventory-11.1.0.mjs");
run("scripts/verify-application-inventory-11.1.0.mjs");
run("scripts/generate-setup-center-11.2.0.mjs");
run("scripts/master-data-control-plane-11.2.0.mjs");
run("scripts/verify-master-data-11.2.0.mjs");
run("scripts/test-forecast-engine-11.3.0.mjs");
run("scripts/generate-forecast-workbench-11.3.0.mjs");
run("scripts/forecast-control-plane-11.3.0.mjs");
run("scripts/verify-forecast-11.3.0.mjs");
run("scripts/test-production-planning-11.4.0.mjs");
run("scripts/generate-production-workbench-11.4.0.mjs");
run("scripts/production-control-plane-11.4.0.mjs");
run("scripts/verify-production-planning-11.4.0.mjs");
run("scripts/test-today-operations-11.5.0.mjs");
run("scripts/generate-today-workbench-11.5.0.mjs");
run("scripts/today-operations-control-plane-11.5.0.mjs");
run("scripts/verify-today-operations-11.5.0.mjs");
run("scripts/test-inventory-control-11.6.0.mjs");
run("scripts/generate-inventory-workbench-11.6.0.mjs");
run("scripts/inventory-control-plane-11.6.0.mjs");
run("scripts/verify-inventory-control-11.6.0.mjs");
run("scripts/test-reporting-learning-11.7.0.mjs");
run("scripts/generate-reporting-workbench-11.7.0.mjs");
run("scripts/reporting-learning-control-plane-11.7.0.mjs");
run("scripts/verify-reporting-learning-11.7.0.mjs");

console.log(
  "\nBuild 11.7.0 overlay applied, Reporting and Learning Lab generated, and reconciliation evidence produced.",
);

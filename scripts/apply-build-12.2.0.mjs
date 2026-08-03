#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const BUILD = "12.2.0";
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
  const data = JSON.parse(
    fs.readFileSync(packagePath, "utf8"),
  );
  data.version = BUILD;
  data.scripts = data.scripts || {};
  Object.assign(data.scripts, {
    "inventory:generate":
      "node scripts/application-inventory-11.1.0.mjs",
    "inventory:verify":
      "node scripts/verify-application-inventory-11.1.0.mjs",
    "master-data:generate":
      "node scripts/master-data-control-plane-11.2.0.mjs",
    "master-data:verify":
      "node scripts/verify-master-data-11.2.0.mjs",
    "forecast:test":
      "node scripts/test-forecast-engine-11.3.0.mjs",
    "forecast:evidence":
      "node scripts/forecast-control-plane-11.3.0.mjs",
    "forecast:verify":
      "node scripts/verify-forecast-11.3.0.mjs",
    "production:test":
      "node scripts/test-production-planning-11.4.0.mjs",
    "production:evidence":
      "node scripts/production-control-plane-11.4.0.mjs",
    "production:verify":
      "node scripts/verify-production-planning-11.4.0.mjs",
    "today:test":
      "node scripts/test-today-operations-11.5.0.mjs",
    "today:evidence":
      "node scripts/today-operations-control-plane-11.5.0.mjs",
    "today:verify":
      "node scripts/verify-today-operations-11.5.0.mjs",
    "inventory-control:test":
      "node scripts/test-inventory-control-11.6.0.mjs",
    "inventory-control:evidence":
      "node scripts/inventory-control-plane-11.6.0.mjs",
    "inventory-control:verify":
      "node scripts/verify-inventory-control-11.6.0.mjs",
    "reporting:test":
      "node scripts/test-reporting-learning-11.7.0.mjs",
    "reporting:evidence":
      "node scripts/reporting-learning-control-plane-11.7.0.mjs",
    "reporting:verify":
      "node scripts/verify-reporting-learning-11.7.0.mjs",
    "notification-admin:test":
      "node scripts/test-notification-admin-11.8.0.mjs",
    "notification-admin:evidence":
      "node scripts/notification-admin-control-plane-11.8.0.mjs",
    "notification-admin:verify":
      "node scripts/verify-notification-admin-11.8.0.mjs",
    "hardening:test":
      "node scripts/test-security-performance-recovery-11.9.0.mjs",
    "hardening:evidence":
      "node scripts/security-performance-recovery-control-plane-11.9.0.mjs",
    "hardening:verify":
      "node scripts/verify-security-performance-recovery-11.9.0.mjs",
    "release:test":
      "node scripts/test-production-release-12.0.0.mjs",
    "release:evidence":
      "node scripts/production-release-control-plane-12.0.0.mjs",
    "release:verify":
      "node scripts/verify-production-release-12.0.0.mjs",
    "multi-location:test":
      "node scripts/test-multi-location-12.1.0.mjs",
    "multi-location:workbench":
      "node scripts/generate-multi-location-workbench-12.1.0.mjs",
    "multi-location:evidence":
      "node scripts/multi-location-control-plane-12.1.0.mjs",
    "multi-location:verify":
      "node scripts/verify-multi-location-12.1.0.mjs",
    "integration:test":
      "node scripts/test-pos-data-integrations-12.2.0.mjs",
    "integration:workbench":
      "node scripts/generate-pos-data-integrations-workbench-12.2.0.mjs",
    "integration:evidence":
      "node scripts/pos-data-integrations-control-plane-12.2.0.mjs",
    "integration:verify":
      "node scripts/verify-pos-data-integrations-12.2.0.mjs",
    "build:12.2.0":
      "node scripts/apply-build-12.2.0.mjs",
  });
  fs.writeFileSync(
    packagePath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
  console.log(
    "UPDATED — package.json version and Build 12.2.0 scripts.",
  );
}

function updateReadme() {
  const readmePath = path.join(root, "README.md");
  if (!fs.existsSync(readmePath)) return;
  const original = fs.readFileSync(readmePath, "utf8");
  const updated = original.replace(
    /^# PTT Smokehouse Control(?:\s+[—-]\s+Build\s+\d+\.\d+\.\d+)?/m,
    "# PTT Smokehouse Control — Build 12.2.0",
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
    !/key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"12\.2\.0"/m.test(
      render,
    )
  ) {
    throw new Error(
      "render.yaml does not declare APP_BUILD_VERSION 12.2.0.",
    );
  }
  const webCount = (
    render.match(/^\s*-\s*type:\s*web\s*$/gm) || []
  ).length;
  const cronCount = (
    render.match(/^\s*-\s*type:\s*cron\s*$/gm) || []
  ).length;
  if (webCount !== 1 || cronCount !== 0) {
    throw new Error(
      `render.yaml topology must be one web and zero cron services; found web=${webCount}, cron=${cronCount}.`,
    );
  }
  console.log(
    "PASS — render.yaml declares Build 12.2.0 with one web service and zero cron services.",
  );
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
run("scripts/test-notification-admin-11.8.0.mjs");
run("scripts/generate-notification-admin-workbench-11.8.0.mjs");
run("scripts/notification-admin-control-plane-11.8.0.mjs");
run("scripts/verify-notification-admin-11.8.0.mjs");
run("scripts/test-security-performance-recovery-11.9.0.mjs");
run("scripts/generate-hardening-workbench-11.9.0.mjs");
run("scripts/security-performance-recovery-control-plane-11.9.0.mjs");
run("scripts/verify-security-performance-recovery-11.9.0.mjs");
run("scripts/test-production-release-12.0.0.mjs");
run("scripts/generate-production-release-workbench-12.0.0.mjs");
run("scripts/production-release-control-plane-12.0.0.mjs");
run("scripts/verify-production-release-12.0.0.mjs");
run("scripts/test-multi-location-12.1.0.mjs");
run("scripts/generate-multi-location-workbench-12.1.0.mjs");
run("scripts/multi-location-control-plane-12.1.0.mjs");
run("scripts/verify-multi-location-12.1.0.mjs");
run("scripts/test-pos-data-integrations-12.2.0.mjs");
run("scripts/generate-pos-data-integrations-workbench-12.2.0.mjs");
run("scripts/pos-data-integrations-control-plane-12.2.0.mjs");
run("scripts/verify-pos-data-integrations-12.2.0.mjs");

console.log(
  "\nBuild 12.2.0 overlay applied. Integration-domain evidence is complete; live provider credentials, durable adapters, schema migration, and deployed UAT remain pending.",
);

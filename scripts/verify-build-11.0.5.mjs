#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";

const path = new URL("../render.yaml", import.meta.url);
const yaml = fs.readFileSync(path, "utf8");
const failures = [];

function check(condition, message) {
  if (condition) console.log(`PASS — ${message}`);
  else failures.push(message);
}

check(!/^\s*env:\s*node\s*$/m.test(yaml), "discouraged env: node declarations are absent");
check((yaml.match(/^\s*runtime:\s*node\s*$/gm) || []).length === 4, "four Node services use runtime: node");
check((yaml.match(/^\s*-\s*type:\s*web\s*$/gm) || []).length === 1, "one web service is declared");
check((yaml.match(/^\s*-\s*type:\s*cron\s*$/gm) || []).length === 3, "three cron jobs are declared");
check((yaml.match(/^\s*plan:\s*starter\s*$/gm) || []).length === 4, "web and three cron jobs explicitly use starter");
check(/databases:\s*[\s\S]*?name:\s*ptt-smokehouse-control-db[\s\S]*?plan:\s*basic-256mb/m.test(yaml), "database uses basic-256mb");
check(/key:\s*APP_BUILD_VERSION\s*\n\s*value:\s*"11\.0\.5"/m.test(yaml), "APP_BUILD_VERSION is 11.0.5");
check(/key:\s*AI_DAILY_CENTS_CAP\s*\n\s*value:\s*"200"/m.test(yaml), "AI daily cap is 200 cents");
check(/key:\s*AI_DAILY_ALERT_CENTS\s*\n\s*value:\s*"100"/m.test(yaml), "AI alert threshold is 100 cents");
check(yaml.includes("ptt-smokehouse-control-weekly-backup"), "weekly backup cron is present");
check(yaml.includes("ptt-smokehouse-control-daily-retention"), "daily retention cron is present");
check(yaml.includes("ptt-smokehouse-control-daily-digest"), "daily digest cron is present");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL — ${failure}`);
  console.error(`\nBuild 11.0.5 verification failed: ${failures.length} control(s).`);
  process.exit(1);
}

console.log("\nBuild 11.0.5 Blueprint contract verification passed.");

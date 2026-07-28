#!/usr/bin/env node
// Build 11.0.4 — R-PERF Lighthouse runner (v3.0 §27.1).
//
// Runs Lighthouse (mobile emulation, throttled) against the live/staging site
// for a set of key routes, then evaluates the results against
// performance-budget.json and writes a pass/fail report.
//
// Requires the `lighthouse` CLI and Chrome. It is intentionally NOT a repo
// dependency (it needs a real browser and network, which the build sandbox
// lacks) — install it where you run it:
//
//   npm i -g lighthouse   # or npx lighthouse
//
// Usage:
//   node scripts/lighthouse-perf-check.mjs --base https://ptt-smokehouse-control.onrender.com
//   node scripts/lighthouse-perf-check.mjs --base http://localhost:3000 --routes /login,/signup
//
// Output:
//   artifacts/perf/lighthouse-<route>-<ts>.json   (raw)
//   artifacts/perf/perf-report-<ts>.md            (summary + pass/fail)
//   exit 1 if any budgeted metric fails on any route.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const base = arg('base', process.env.PERF_BASE_URL || '').replace(/\/$/, '');
if (!base) {
  console.error('Missing --base <url> (or PERF_BASE_URL). Example: --base https://ptt-smokehouse-control.onrender.com');
  process.exit(2);
}
// Public, unauthenticated routes are the honest Lighthouse targets. Authenticated
// routes need a logged-in session (see the runbook for the Playwright-timing path).
const routes = arg('routes', '/login,/signup,/privacy,/terms').split(',').map((r) => r.trim());

const budget = JSON.parse(fs.readFileSync('performance-budget.json', 'utf8'));
const B = {
  LCP_ms: budget.webVitals.LCP_ms.threshold,
  CLS: budget.webVitals.CLS.threshold,
  TBT_ms: 300, // Total Blocking Time — lab proxy for INP (Lighthouse doesn't emit INP in lab)
  initialPageLoad_ms: budget.webVitals.initialPageLoad_ms.threshold,
  perfScoreMin: 0.85 // overall Lighthouse performance score floor
};

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('artifacts', 'perf');
fs.mkdirSync(outDir, { recursive: true });

function haveLighthouse() {
  try {
    execSync('npx --no-install lighthouse --version', { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync('lighthouse --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

if (!haveLighthouse()) {
  console.error('Lighthouse CLI not found. Install it where you run this:');
  console.error('  npm i -g lighthouse    (or: npx lighthouse ...)');
  console.error('This runner is environment-external by design (needs Chrome + network).');
  process.exit(2);
}

const rows = [];
let anyFail = false;

for (const route of routes) {
  const url = base + route;
  const jsonPath = path.join(outDir, `lighthouse-${route.replace(/\W+/g, '_') || 'root'}-${ts}.json`);
  console.log(`\n▶ Lighthouse (mobile): ${url}`);
  try {
    execSync(
      `npx --no-install lighthouse "${url}" ` +
        `--only-categories=performance --form-factor=mobile --screenEmulation.mobile ` +
        `--throttling-method=simulate --quiet --chrome-flags="--headless --no-sandbox" ` +
        `--output=json --output-path="${jsonPath}"`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    console.error(`  Lighthouse failed for ${url}: ${e.message}`);
    anyFail = true;
    rows.push({ route, error: 'lighthouse_failed' });
    continue;
  }

  const lhr = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const a = lhr.audits;
  const score = lhr.categories.performance.score;
  const lcp = a['largest-contentful-paint']?.numericValue ?? NaN;
  const cls = a['cumulative-layout-shift']?.numericValue ?? NaN;
  const tbt = a['total-blocking-time']?.numericValue ?? NaN;
  const fcp = a['first-contentful-paint']?.numericValue ?? NaN;
  const interactive = a['interactive']?.numericValue ?? NaN;

  const checks = {
    perfScore: { value: score, threshold: B.perfScoreMin, pass: score >= B.perfScoreMin, higherIsBetter: true },
    LCP_ms: { value: Math.round(lcp), threshold: B.LCP_ms, pass: lcp <= B.LCP_ms },
    CLS: { value: +cls.toFixed(3), threshold: B.CLS, pass: cls <= B.CLS },
    TBT_ms: { value: Math.round(tbt), threshold: B.TBT_ms, pass: tbt <= B.TBT_ms },
    initialPageLoad_ms: { value: Math.round(interactive), threshold: B.initialPageLoad_ms, pass: interactive <= B.initialPageLoad_ms }
  };
  const routePass = Object.values(checks).every((c) => c.pass);
  if (!routePass) anyFail = true;
  rows.push({ route, score, fcp: Math.round(fcp), checks, pass: routePass });

  for (const [k, c] of Object.entries(checks)) {
    console.log(`   ${c.pass ? '✓' : '✗'} ${k}: ${c.value} (budget ${c.higherIsBetter ? '≥' : '≤'} ${c.threshold})`);
  }
}

// ---- Write markdown report ------------------------------------------------
const L = [];
L.push(`# Performance Report (R-PERF, v3.0 §27.1)`);
L.push('');
L.push(`**Base URL:** ${base} · **Run:** ${ts} · **Tool:** Lighthouse mobile (simulated throttling)`);
L.push('');
L.push(`**Result:** ${anyFail ? '❌ FAIL — one or more budgeted metrics exceeded' : '✅ PASS — all routes within budget'}`);
L.push('');
L.push('| Route | Perf score | LCP (ms) | CLS | TBT (ms) | TTI (ms) | Verdict |');
L.push('|---|---|---|---|---|---|---|');
for (const r of rows) {
  if (r.error) { L.push(`| ${r.route} | — | — | — | — | — | ⚠ ${r.error} |`); continue; }
  const c = r.checks;
  const cell = (x) => `${x.value}${x.pass ? '' : ' ⚠'}`;
  L.push(`| ${r.route} | ${(r.score * 100).toFixed(0)} | ${cell(c.LCP_ms)} | ${cell(c.CLS)} | ${cell(c.TBT_ms)} | ${cell(c.initialPageLoad_ms)} | ${r.pass ? '✅' : '❌'} |`);
}
L.push('');
L.push('Budgets: perf score ≥ 0.85, LCP ≤ 2500ms, CLS ≤ 0.1, TBT ≤ 300ms (INP lab proxy), TTI ≤ 3000ms.');
L.push('');
L.push('> Note: Lighthouse lab runs do not emit INP (a field metric). TBT is the accepted lab proxy; capture real INP from field/RUM data (`web-vitals` in the browser) for the Appendix E evidence.');
const reportPath = path.join(outDir, `perf-report-${ts}.md`);
fs.writeFileSync(reportPath, L.join('\n') + '\n');

console.log(`\nReport: ${reportPath}`);
console.log(anyFail ? 'R-PERF: FAIL' : 'R-PERF: PASS');
process.exit(anyFail ? 1 : 0);

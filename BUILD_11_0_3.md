# Build 11.0.3 — R-PERF Performance Evidence Tooling (v3.0 §27.1)

11.0.3 makes the R-PERF release gate **executable against the live site**. Before this, `performance-budget.json` defined the thresholds but nothing measured against them. This build adds both halves of the evidence: lab (Lighthouse) and field (Web Vitals RUM).

## Lab — Lighthouse runner
- **`scripts/lighthouse-perf-check.mjs`** (`pnpm run perf:lighthouse -- --base <url>`) runs Lighthouse mobile (simulated throttling) against a set of routes, evaluates LCP / CLS / TBT / TTI / overall score against `performance-budget.json`, writes raw JSON + a markdown pass/fail report to `artifacts/perf/`, and exits non-zero on any breach (CI-gate-ready). Environment-external by design — needs Chrome + network, which the build sandbox lacks; install `lighthouse` where you run it.

## Field — Web Vitals RUM (real INP)
Lighthouse lab runs cannot measure **INP** (a field-only metric), so this build adds real-user monitoring:
- **`components/WebVitalsReporter.tsx`** — native `PerformanceObserver` (no `web-vitals` dependency, zero bundle risk) captures LCP, CLS, INP, FCP, TTFB and beacons them via `navigator.sendBeacon` to `/api/vitals`. Wired into the root layout.
- **`app/api/vitals/route.ts`** — strictly-validated, unauthenticated ingest (allow-listed metric names, bounded values) storing to the new `WebVitalSample` model.
- **`app/api/vitals/summary/route.ts`** — ADMIN-only; computes **p75 per metric** over a window vs. Google "good" thresholds, returning an overall `coreWebVitalsPass` verdict (the standard Core Web Vitals aggregation).

## Runbook
- **`docs/RUNBOOK_R_PERF.md`** — step-by-step: run Lighthouse against the live URL, generate field data by using the site on real devices, read `/api/vitals/summary`, and record both into the Appendix E evidence. Includes the authenticated-route and bundle-size paths, and remediation levers.

## Database
Additive, idempotent migration `20260727000000_build_1103_web_vitals` adds the `WebVitalSample` model. Drift-verified by `scripts/build-1103-migration-drift-test.mjs` (added to the `test:compliance` bundle). No destructive DDL.

## Verified
- Both static guards PASS (imports 228 files, ts-antipatterns 150 files) — the new routes were checked, and a `requireApiRole` usage bug was caught and fixed during development.
- Full `test:compliance` bundle PASS (now 11 sub-tests); regression sweep PASS; lint clean.

## What R-PERF still needs from you (human/staging execution)
The tooling is ready; the evidence requires running it:
1. `node scripts/lighthouse-perf-check.mjs --base https://ptt-smokehouse-control.onrender.com`
2. Use the live site on a phone and desktop to seed field data, then GET `/api/vitals/summary` as an admin.
3. Record both into `docs/UAT_SIGNOFF_APPENDIX_E.md`.

Local ZIP files remain source packages. Only the artifact produced by `.github/workflows/release.yml` is an audited production release.

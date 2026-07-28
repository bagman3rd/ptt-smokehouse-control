# R-PERF Runbook — Performance Threshold Evidence (v3.0 §27.1)

**Requirement:** R-PERF — "Performance thresholds gate the release."
**Goal:** produce the pass/fail evidence attached to the Appendix E sign-off.

Performance evidence has **two halves**. You need both, because neither alone is complete:

1. **Lab (Lighthouse)** — reproducible, controlled; gives LCP, CLS, TBT, TTI, and an overall score. Cannot measure INP (a field-only metric).
2. **Field (Web Vitals RUM)** — real users/devices; the only way to get true **INP** and real-world LCP/CLS at p75. Built into the app as of 11.0.3.

---

## Part A — Lab: Lighthouse against the live site

Run from any machine with Chrome and network access (not the build sandbox):

```bash
# one-time
npm i -g lighthouse

# run against the live service (public routes)
node scripts/lighthouse-perf-check.mjs \
  --base https://ptt-smokehouse-control.onrender.com \
  --routes /login,/signup,/privacy,/terms
```

Outputs to `artifacts/perf/`:
- `lighthouse-<route>-<ts>.json` — raw Lighthouse result per route
- `perf-report-<ts>.md` — summary table with pass/fail per budgeted metric

**Budgets enforced** (from `performance-budget.json`): perf score ≥ 0.85, LCP ≤ 2500ms, CLS ≤ 0.1, TBT ≤ 300ms (INP lab proxy), TTI ≤ 3000ms. The script exits non-zero if any route breaches, so it can gate CI.

### Authenticated routes (dashboard, reports)
Lighthouse needs a logged-in session for `/today`, `/reports`, etc. Two options:
- Quick: run Lighthouse in Chrome DevTools while logged in (Application → Lighthouse), export JSON into `artifacts/perf/`.
- Automated: use the Playwright timing checks (dashboardLoad/reportGeneration/search budgets in `performance-budget.json`) against an authenticated context — see `e2e/` for the login helper.

### Bundle size (already wired)
After a production build on a Prisma-enabled machine:
```bash
pnpm build && node scripts/performance-budget-check.mjs
```
Fails if first-load JS exceeds 300 KB gzipped.

---

## Part B — Field: Web Vitals RUM (real INP)

The app now ships `components/WebVitalsReporter.tsx` (native PerformanceObserver, zero dependencies) which beacons LCP/CLS/INP/FCP/TTFB to `POST /api/vitals`. Samples are stored in `WebVitalSample`.

**To generate data:** simply use the live site on real devices — click around the dashboard, submit an end-of-day log, generate a report, on both a phone and a desktop. Each page-hide flushes a sample.

**To read the evidence:** as an ADMIN, GET:
```
https://ptt-smokehouse-control.onrender.com/api/vitals/summary?days=28
```
Returns **p75 per metric** vs. Google "good" thresholds and an overall `coreWebVitalsPass` verdict (LCP ≤ 2500, INP ≤ 200, CLS ≤ 0.1). p75 is the standard Core Web Vitals aggregation.

> Collect at least a few dozen samples across mobile and desktop before treating the p75 as representative. For a launch of this size, a day or two of real internal use is enough.

---

## Part C — Record the result

1. Save the Lighthouse `perf-report-<ts>.md` and the `/api/vitals/summary` JSON into the release evidence.
2. In `docs/UAT_SIGNOFF_APPENDIX_E.md`, tick "Performance thresholds (§27.1) met" and reference both files.
3. If anything fails: the usual levers are image sizing (`next/image`), code-splitting heavy client components, reducing layout shift (reserve space for dynamic content), and caching/CDN for static assets. Re-run and re-record.

**Pass criteria for R-PERF:** Lighthouse budgets green on public + key authenticated routes **and** field Core Web Vitals p75 within "good" for LCP, INP, CLS.

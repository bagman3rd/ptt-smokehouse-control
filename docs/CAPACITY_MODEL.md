# Smokehouse Control — Capacity Model (v3.0 §64.1)

**Build:** 11.0.0 · **Owner:** Archer Bagley · **Last updated:** July 2026

This document translates "100,000 users" into an explicit operating model, as required by v3.0 Section 64.1. Registered accounts are not concurrent sessions. The acceptance profiles in `load/k6-capacity-model.js` are derived from the numbers below.

## Capacity model inputs

| Model input | Definition for Smokehouse Control |
|---|---|
| Registered users | 100,000 target ceiling. Realistic near-term: 1,000 restaurants × ~8 staff = ~8,000 users. Model is built to the 100k ceiling for headroom. |
| Tenant distribution | 1 restaurant = 1 tenant. Largest tenant ≤ 25 staff; typical 5–8. Long tail of single-location operators. |
| Active mix (DAU) | ~12% of registered users active on a given day (restaurant staff use the app on shift days). At 100k → ~12,000 DAU. |
| Peak-hour concentration | ~20% of daily activity in the busiest hour (pre-service prep window, ~2–4pm and ~9–11am). At 12k DAU → ~2,400 users in the peak hour. |
| Busiest 5-min window | ~8% of the peak hour → ~192 users active in the busiest 5 minutes (shift start, EOD submission crunch). |
| Concurrent sessions (peak) | ~250 authenticated sessions at peak, including long-lived dashboards on kitchen tablets and mobile check-ins. **This is the `FORECAST_PEAK_VUS` used by the load harness.** |
| Request behavior | Read/write ≈ 80/20. Reads: dashboard, cook plan, reports. Writes: EOD submission, cook-plan create/edit, protein logs. Payloads small (< 50 KB) except report exports. |
| Transaction criticality | Payments (Stripe webhooks — idempotent), subscription state, EOD logs, and audit entries require strict consistency. Cook-plan forecasts are decision-support (eventual OK). |
| Background workload | POS imports, report generation, notification dispatch (email/SMS), AI (Archer) calls, daily retention + digest crons, weekly backups. |
| Data volume | Largest tenant: ~3 years × 365 EOD logs × ~8 proteins ≈ 8,760 protein-log rows + cook plans + audit. Platform total at 1,000 tenants ≈ low millions of rows. Audit/consent retained ≥ 4 years. |
| Service objective | Availability target 99.9%. API p95 < 500 ms, p99 < 1,000 ms. Error rate < 1%. Report generation < 5 s. Backup RTO < 1 h. Max tolerable stale forecast data: 15 min. |

## Derived acceptance profiles (executed via k6)

| Profile | Load | Duration | Purpose |
|---|---|---|---|
| `normal` | 0.6 × peak (~150 VUs) | 30 min after warm-up | Ordinary peak steady-state |
| `peak` | 1.2 × peak (~300 VUs) | 20 min sustained | Busiest sustained period + headroom |
| `spike` | 2 × peak (~500 VUs) | 30 s rise, 3 min hold, recover | Shift-start / marketing-campaign surge |
| `endurance` | 0.7 × peak (~175 VUs) | 8 h (24 h for connection/queue/cache/memory changes) | Leak & degradation detection |
| `volume` | 40 VUs, report-heavy | 15 min | Largest tenant + years of history |
| `degraded` | peak load with a dependency (DB/Stripe/mail) throttled | 15 min | Graceful degradation |

## Platform reality (v3.0 §27.2)

Render starter-tier instances have hard memory/CPU limits and may cold-start. **Load tests must run against a staging instance of the same tier as production** so results are honest. The `normal`, `peak`, and `spike` profiles are the minimum gate before a Tier 1 release; `endurance` and `volume` are required for releases that affect connections, queues, caches, memory, file processing, or background jobs.

## How to run

```bash
# Same-tier staging, peak profile
k6 run -e PROFILE=peak \
       -e BASE_URL=https://smokehouse-staging.onrender.com \
       -e ADMIN_USER=loadtest -e ADMIN_PASSWORD=*** \
       load/k6-capacity-model.js
```

Thresholds (`api_latency p95<500`, `errors rate<0.01`) are encoded in the script and fail the run if breached. Record results in the UAT evidence package and Document Control.

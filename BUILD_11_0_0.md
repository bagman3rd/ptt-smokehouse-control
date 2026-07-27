# Build 11.0.0 — Tier 1 UAT, Scale, Performance, Payments & Observability

Build 11.0.0 closes the five release-blocking gaps identified when Build 10.0.0 was assessed against **Master Testing Plan v3.0**, which added the release-blocking **Part V — Tier 1 SaaS User Acceptance Testing** program (Sections 48–67) for products serving up to 100,000 users.

## Gap 1 — Tier 1 UAT program (Part V, §48–67)

- **Requirements traceability matrix + inventory** generator (`scripts/generate-uat-traceability.mjs`) producing `docs/UAT_TRACEABILITY.md` and `artifacts/uat-traceability.json`: 34 routes, 394 controls (from the interaction manifest), 12 critical journeys, and 12 traced requirements — each with a **disposition** (per §50.3, "not tested" is not acceptable; items without automated evidence are explicitly `PENDING`/`PENDING_EXTERNAL`). All 12 critical journeys carry in-repo automated evidence.
- **Novice-user protocol** (`docs/UAT_NOVICE_PROTOCOL.md`): 12+ participants, ≥3 per persona, moderated think-aloud protocol, 8 critical tasks, and the §57.3 acceptance thresholds (≥90% unassisted completion, mean ease ≥5.5/7).
- **Appendix E sign-off** (`docs/UAT_SIGNOFF_APPENDIX_E.md`): entry criteria, stop conditions, mandatory gates, evidence references, and the four decision outcomes with artifact-lock.
- CI gate: `test:uat-traceability` verifies the matrix is current.

## Gap 2 — 100,000-user capacity model + scale profiles (§27.2, §64)

- **Explicit capacity model** (`docs/CAPACITY_MODEL.md`): registered→DAU→peak-hour→concurrent-session derivation (100k registered → ~250 peak concurrent), read/write mix, data-volume, and service objectives.
- **k6 load harness** (`load/k6-capacity-model.js`) implementing the §64 profiles: `normal`, `peak` (1.2×), `spike` (2×), `endurance` (8–24h), `volume`, and `smoke`, with §27.1 thresholds (`api_latency p95<500ms`, `errors<1%`) encoded as k6 thresholds. Runs against same-tier staging.

## Gap 3 — Performance threshold gating (§27.1)

- **`performance-budget.json`**: LCP<2.5s, CLS<0.1, INP<200ms, initial load<3s, API p95<500ms, dashboard<2s, report<5s, search<1s, payment<6s, bundle<300 KB gzipped.
- **Bundle-size gate** (`scripts/performance-budget-check.mjs`) wired into CI after `next build`.

## Gap 4 — Payments & payment stop-conditions (§30, §50.2)

- **Stripe webhook handler** (`app/api/webhooks/stripe/route.ts`) with:
  - **Signature verification before any parsing** (`lib/stripeWebhook.ts`, HMAC-SHA256 + replay-window).
  - **Idempotency** via a unique `PaymentEvent.stripeEventId` (pre-check + unique-violation catch) — a replayed or duplicated event can never be applied twice (**no double-charge**).
  - **Deterministic status mapping** from the authoritative event type — a successful payment is never shown as failed and vice-versa; **refunds/disputes** move to the correct state.
  - Apply failures return **500 so Stripe safely retries** (idempotency makes retry safe).
- Contract test `scripts/payment-webhook-contract-test.ts` verifies signature, replay rejection, idempotency, and mapping.

## Gap 5 — Real observability + security scanning (§41, §26, §25)

- **Error-tracking pipeline** (`lib/observability.ts`): `captureException`/`captureMessage` persist structured `ErrorEvent` rows **and** forward to Sentry's HTTP ingest when `SENTRY_DSN` is set (no SDK dependency). Previously "Sentry" existed only in a comment.
- **Deploy health / rollback** (`recordDeploy`, `evaluateDeployHealth`) with a configurable error-surge threshold; `instrumentation.ts` registers global capture and marks deploys.
- Daily digest now reports **real server-error counts** and alerts on surge.
- **gitleaks** secret scan added to CI; **axe-core** WCAG 2.1 AA scan added (`e2e/axe-accessibility.spec.ts`, critical/serious violations are release-blocking).

## Database

Additive, idempotent migration `20260725000000_build_1100_error_tracking` adds **ErrorEvent** and **PaymentEvent** (with the unique `stripeEventId` idempotency index). Drift-verified by `scripts/build-1100-migration-drift-test.mjs`. No destructive DDL.

## New CI tests (all green offline)

`test:payment-webhook`, `test:observability-contract`, `test:migration-drift-1100`, `test:uat-traceability`, `test:performance-budget` — added to the `test:compliance` bundle and `ci:test`. gitleaks + performance-budget added as CI steps; axe + k6 available for staging execution.

## What still requires human/staging execution (correctly flagged, not fakeable)

Three requirements are `PENDING_EXTERNAL` by design — they cannot be satisfied by code:
- **R-SCALE** — run the k6 profiles on same-tier staging and attach results.
- **R-PERF** — run Lighthouse + the bundle gate on the built app and attach the report.
- **R-NOVICE** — run the 12-participant novice-user program and attach results.

These are the honest remaining inputs to the Appendix E sign-off; the framework, harness, and evidence slots for all three now exist.

## Offline-build constraint (unchanged from 10.0.0)

Prisma engine binaries download from a host that is firewalled in some build sandboxes, so `next build`/`prisma generate`/Playwright/k6 cannot execute there. They run normally on Render. All logic/contract/drift tests pass offline; pure-logic modules type-check.

Local ZIP files remain source packages. Only the artifact produced by `.github/workflows/release.yml` is an audited production release.

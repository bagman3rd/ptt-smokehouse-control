# PTT Smokehouse Control — Build 11.0.4

## Build 11.0.4 — enforced CI build gate

Adds a dedicated, standalone `build-gate` CI job (`prisma generate → import/anti-pattern guards → tsc --noEmit → next build`) that catches compile errors — the class that failed the 10.0.0/11.0.0/11.0.1 deploys — in ~2-3 minutes, before merge. The full test job now `needs: build-gate`. Also fixed a pnpm/node setup-order bug in CI. Contract-locked via `ci-release-contract-test`. Activation steps (branch protection) in `docs/CI_ACTIVATION_CHECKLIST.md`. See `BUILD_11_0_4.md`.

## Build 11.0.3 — R-PERF performance evidence tooling

Made the R-PERF release gate executable against the live site: Lighthouse runner (`scripts/lighthouse-perf-check.mjs`), Web Vitals RUM (`components/WebVitalsReporter.tsx` → `/api/vitals` → `WebVitalSample`), admin p75 summary (`/api/vitals/summary`), runbook (`docs/RUNBOOK_R_PERF.md`). See `BUILD_11_0_3.md`.

## Build 11.0.2 — deploy hotfix (TypeScript `as const` type error)

Fixed the `next build` type-check failure in `lib/notifications/dispatch.ts` — `as const` applied to a ternary (TS1355). Corrected `mapCategory` to an explicit return type. Added `scripts/typescript-antipattern-check.mjs` (`pnpm run test:ts-antipatterns`). See `BUILD_11_0_2.md`.

## Build 11.0.1 — deploy hotfix (broken relative import)

Fixed the `next build` failure "Module not found: Can't resolve './actions'" in `app/account/privacy/confirm-delete/page.tsx` (corrected `./actions` → `../actions`). Added `scripts/import-resolution-check.mjs` (`pnpm run test:imports`) which statically catches unresolved imports, missing page/route exports, and client/server boundary violations before deploy. See `BUILD_11_0_1.md`.

## Build 11.0.0 — Tier 1 UAT, scale, performance, payments & observability

Build 11.0.0 closes the five release-blocking gaps found when Build 10.0.0 was assessed against Master Testing Plan **v3.0** (which added the Part V Tier 1 SaaS User Acceptance Testing program). It adds: (1) a **Tier 1 UAT program** — a generated requirements-traceability matrix and route/control/journey inventory with dispositions (`docs/UAT_TRACEABILITY.md`), a novice-user protocol (`docs/UAT_NOVICE_PROTOCOL.md`), and the Appendix E sign-off (`docs/UAT_SIGNOFF_APPENDIX_E.md`); (2) a **100,000-user capacity model** (`docs/CAPACITY_MODEL.md`) with a **k6 load harness** implementing the §64 normal/peak/spike/endurance/volume profiles (`load/k6-capacity-model.js`); (3) **performance gating** — `performance-budget.json` of §27.1 thresholds plus a CI bundle-size gate; (4) **Stripe payment webhooks** with signature verification and **idempotency** that clears the §50.2 double-charge / success-shown-as-failed / refund-status stop-conditions; and (5) **real observability** — an error-tracking pipeline with a Sentry transport and deploy-health/rollback logic (`lib/observability.ts`, `instrumentation.ts`), plus **gitleaks** in CI and an **axe-core** accessibility scan. See `BUILD_11_0_0.md` and `docs/RELEASE_GATE_11_0_0.md`.

## Build 10.0.0 commercial hardening

Build 10.0.0 made Smokehouse Control commercially sellable ($99/restaurant/month). It added TCPA/CAN-SPAM compliance (consent model, quiet hours, STOP/START, unsubscribe, immutable consent audit), a consent- and idempotency-gated notification system, GDPR privacy tooling (export, signed-confirmation deletion with anonymizing erasure, retention purge, cookie consent), AI cost caps and prompt-injection/PII safeguards, a cost ledger with admin dashboard and daily digest, full security headers, and expanded accessibility/mobile Playwright coverage. See `BUILD_10_0_0.md` and `docs/RELEASE_GATE_10_0_0.md`.

## Build 9.8.0 release safety update

Build 9.8.0 hardens deployment and demo behavior. The POS foundation migration is required to keep every additive column repair idempotent, including `PosConnection.lastError`. CI now performs both a fresh migration replay and a prior-schema upgrade replay against a database containing a legacy partial `PosConnection` table. Archer retains the approved uncensored identity response by default, while `ARCHER_DEMO_MODE=true` replaces the final profanity for customer demonstrations.


Build 7.8.0 is a reliability and testing-hardening release based on the complete Build 7.5.2 application.

Runtime compatibility: CI and repository tooling prefer Node 22.16.0, while the package also supports Node 20.19.0+ through Node 20.x so existing Render services pinned to Node 20.20.2 do not fail before installation.

## Corrections

- Native compact dropdown navigation works without React hydration.
- Today remains the landing page.
- Tenant-guard policy is explicit: automatic in development/test, opt-in elsewhere, with database constraints and tenant-scoped queries protecting production.
- Contradictory CI tests were removed or rewritten.
- Permission tests no longer depend on one exact helper function name.
- The arbitrary script-count release gate was removed and obsolete version-specific scripts were deleted.
- Invalid cook-plan payloads now return HTTP 400 rather than HTTP 500.
- Render now requires `TOTP_ENCRYPTION_KEY`.
- Added keyboard navigation and structural accessibility checks.
- Added simultaneous Quick EOD submission testing.
- Added an authenticated cross-tenant mutation attempt.
- Added separate-session mixed read/write load testing with p50/p95/p99 reporting.
- Added dependency vulnerability auditing in CI.
- Production monitoring verifies Build 7.8.0, login, Today, database health, and a non-mutating authenticated cook-plan validation canary.

## Deployment

Replace the repository contents with the complete extracted ZIP, including hidden `.github` files. Commit additions, changes, and deletions. Render requires `DATABASE_URL`, `ADMIN_PASSWORD`, `APP_SESSION_TOKEN`, and `TOTP_ENCRYPTION_KEY`.

## Build 7.8.0 interaction reliability

Build 7.8.0 fixes the top navigation dropdown controls and adds `docs/DETAILED_TESTING_PLAN.md`. The release standard now requires every visible interactive control—buttons, links, forms, dropdowns, fields, tabs, modals, and other clickable or keyboard-operable elements—to have explicit automated or manual coverage.

## Build 7.8.0 release note

Build 7.8.0 closes the guarded EOD revision defect. Existing EOD logs are updated through the tenant-scoped restaurant/date key, while child protein rows continue to use the tenant-scoped three-field unique key. CI now proves the complete draft, revision, completion, lock, and post-lock rejection lifecycle against PostgreSQL with the tenant guard active. The multi-restaurant report rollup is also protected by a permanent contract test.


## Build 9.0.0 PostgreSQL Quick EOD write repair

Build 9.0.0 preserves the Build 7.8.2 compile repair and Admin navigation fix, and replaces the compound-key Prisma upsert that produced PostgreSQL error 22P03 during Quick EOD saves.

## Build 9.0.0 production EOD column repair

Build 9.0.0 adds migration `20260712001400_build_784_eod_numeric_type_repair`, which explicitly converts all `EndOfDayProteinLog` quantity columns to PostgreSQL `DOUBLE PRECISION`. This resolves PostgreSQL error `22P03` caused by historical production column-type drift. Existing values are retained through explicit casts. The tenant-scoped two-step Quick EOD write remains unchanged.

## Build 9.0.0

Admin and Owner users can delete a smoker from **Admin → Smokers**. The action requires confirmation, is restricted to the active restaurant, records a DELETE audit event, and refreshes smoker-capacity and schedule pages. No database migration is required.

## Build 9.0.0 live POS integrations
Build 9.0.0 replaces the old live-POS placeholder with a shared integration platform and an enabled Square connector. See `BUILD_8_0_0.md`. Toast, Clover, Lightspeed, TouchBistro, SpotOn, Revel, Oracle Simphony, NCR Aloha and PAR Brink are registered but intentionally disabled pending provider access; the UI does not falsely claim they are connected.

## Build 9.8.0 Archer update

Build 9.8.0 preserves the approved Archer likeness, large-smoker background, full-head layout, voice recording, transcription, and spoken responses. Archer identity questions now receive the expanded approved teenager-style response with no-cap, vibe-check, rizz, NPC, goated, locked-in, drip, lore, mid, W, built-different, and On-God terminology through a deterministic local rule, so the behavior does not depend on OpenAI availability. See `BUILD_9_4_0.md`.

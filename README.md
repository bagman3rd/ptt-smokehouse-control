# PTT Smokehouse Control — Build 7.8.0

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


## Build 8.0.2 PostgreSQL Quick EOD write repair

Build 8.0.2 preserves the Build 7.8.2 compile repair and Admin navigation fix, and replaces the compound-key Prisma upsert that produced PostgreSQL error 22P03 during Quick EOD saves.

## Build 8.0.2 production EOD column repair

Build 8.0.2 adds migration `20260712001400_build_784_eod_numeric_type_repair`, which explicitly converts all `EndOfDayProteinLog` quantity columns to PostgreSQL `DOUBLE PRECISION`. This resolves PostgreSQL error `22P03` caused by historical production column-type drift. Existing values are retained through explicit casts. The tenant-scoped two-step Quick EOD write remains unchanged.

## Build 8.0.2

Admin and Owner users can delete a smoker from **Admin → Smokers**. The action requires confirmation, is restricted to the active restaurant, records a DELETE audit event, and refreshes smoker-capacity and schedule pages. No database migration is required.

## Build 8.0.2 live POS integrations
Build 8.0.2 replaces the old live-POS placeholder with a shared integration platform and an enabled Square connector. See `BUILD_8_0_0.md`. Toast, Clover, Lightspeed, TouchBistro, SpotOn, Revel, Oracle Simphony, NCR Aloha and PAR Brink are registered but intentionally disabled pending provider access; the UI does not falsely claim they are connected.

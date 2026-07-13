# PTT Smokehouse Control — Build 7.7.0

Build 7.7.0 is a reliability and testing-hardening release based on the complete Build 7.5.2 application.

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
- Production monitoring verifies Build 7.7.0, login, Today, database health, and a non-mutating authenticated cook-plan validation canary.

## Deployment

Replace the repository contents with the complete extracted ZIP, including hidden `.github` files. Commit additions, changes, and deletions. Render requires `DATABASE_URL`, `ADMIN_PASSWORD`, `APP_SESSION_TOKEN`, and `TOTP_ENCRYPTION_KEY`.

## Build 7.7.0 interaction reliability

Build 7.7.0 fixes the top navigation dropdown controls and adds `docs/DETAILED_TESTING_PLAN.md`. The release standard now requires every visible interactive control—buttons, links, forms, dropdowns, fields, tabs, modals, and other clickable or keyboard-operable elements—to have explicit automated or manual coverage.

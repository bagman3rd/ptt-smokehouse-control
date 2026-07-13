# PTT Smokehouse Control — Build 7.6.0

Build 7.6.0 is a reliability and testing-hardening release based on the complete Build 7.5.2 application.

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
- Production monitoring verifies Build 7.6.0, login, Today, database health, and a non-mutating authenticated cook-plan validation canary.

## Deployment

Replace the repository contents with the complete extracted ZIP, including hidden `.github` files. Commit additions, changes, and deletions. Render requires `DATABASE_URL`, `ADMIN_PASSWORD`, `APP_SESSION_TOKEN`, and `TOTP_ENCRYPTION_KEY`.

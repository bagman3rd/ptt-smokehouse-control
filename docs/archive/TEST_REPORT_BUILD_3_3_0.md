# Test Report — Build 3.3.0

## Scope requested

Build 3.3.0 implements the next commercial-readiness layer:

- Self-service signup.
- Guided setup improvements with sales-history/POS CSV import.
- Demo data mode for prospects.
- Rate limiting on login/signup/API routes.
- Zod validation on key public/write APIs.
- Migration deploy groundwork.
- Per-tenant data export and soft deletion.
- Forecast engine automated tests.
- Generic non-Pigeon-Forge defaults for new restaurants.

## Static evaluation

`node scripts/build-3-3-evaluation.mjs` passed.

## Forecast test coverage added

`pnpm run test:forecast` covers:

- Daily sales forecast arithmetic.
- History confidence levels.
- Brisket unit recommendations.
- Rib rack-based sales-price calculation.
- Chicken breast leftover reduction.

## Tenant test coverage preserved

`pnpm run test:tenant` is still included for staging Postgres tenant-isolation checks.

## Manual QA use cases to run after deploy

1. Open `/signup`, create a new restaurant owner, verify redirect to setup wizard.
2. Open `/demo`, start demo, verify dashboard/reports/learning have sample data.
3. Login repeatedly with bad credentials and verify rate limiting.
4. Import sales CSV in `/admin/restaurants/pos` and verify day/month curves update.
5. Export active tenant from `/admin/restaurants` and verify only current restaurant data appears.
6. Attempt tenant deletion with wrong confirmation string and verify it fails.
7. Attempt tenant deletion with correct restaurant name and verify access is deactivated.
8. Run tenant integration test against staging DB.
9. Run restore drill from latest backup before first external customer.

## Remaining gaps

- Toast API is not implemented yet; Build 3.3.0 adds CSV import as the interim POS bridge.
- Tenant deletion is a soft delete, not physical data purge; a retention policy is still needed.
- Email verification/password reset are still not implemented.
- Migration baseline must be rehearsed on staging before production.

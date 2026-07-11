# PTT Smokehouse Control — Build 3.2.0

Private BBQ production-control app for Pigeon Toed Tavern. Build 3.2.0 hardens the commercial SaaS foundation by requiring restaurant membership roles at runtime, adding real form-by-form restaurant onboarding, adding a true Postgres tenant-isolation test script, and preparing a safe migration-baseline path.

## Build 3.2.0 changes

- `RestaurantMembership.role` is now required for active sessions; `User.role` is retained only as a legacy compatibility column.
- `/admin/restaurants/setup` is now a form-by-form onboarding flow instead of a checklist.
- Setup forms save restaurant profile, forecast model, protein specs, and weekly/monthly curves.
- Setup saves audit entries for each step.
- Added `scripts/tenant-integration-test.mjs` for real PostgreSQL tenant-isolation testing.
- Added `pnpm run test:tenant` script.
- Removed database-level global uniqueness from `User.email`.
- Login now prefers username and only accepts email login when exactly one active user has that email.
- Added migration baseline plan and migrate-ready render script without switching production Render prematurely.

## Deploy

Use the existing Render build command for now:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## Initial login

Username: `admin`
Password: your Render `ADMIN_PASSWORD` value.

## Tenant isolation test

Run this against staging PostgreSQL before adding a second real restaurant:

```bash
pnpm run test:tenant
```

## Migration status

Production Render still uses `prisma db push`. Do not switch to `prisma migrate deploy` until the existing database has been baselined in staging. See `MIGRATION_BASELINE_PLAN_BUILD_3_2_0.md`.

## Remaining commercial gaps

- Separate Account login identity from restaurant-local StaffProfile.
- Add smoker inventory and cook-cycle setup forms.
- Add POS/menu-item mapping.
- Add wizard completion status and onboarding progress.
- Baseline migrations in staging, then switch Render to `migrate deploy`.

# Build 6.1.0 — Reliability Release

Build 6.1.0 implements the critical recommendations from the Build 6.0.1 review.

## Changes
- Standardized local, CI, and Render commands on pnpm 9.15.0.
- Removed automatic production seeding from every Render deployment.
- Added a guarded manual production seed command requiring `ALLOW_PRODUCTION_SEED=true`.
- Renamed duplicate-prefix migration folders and added a safe migration-history reconciliation step for databases that already recorded the former names.
- Added stable cook-window, smoker-location, and protein codes while retaining friendly UI labels.
- Added database check constraints for operational codes.
- Added explicit protein identity codes so scheduling no longer depends primarily on protein-name substring matching.
- Added Playwright browser tests for desktop and mobile configurations.
- Added CI browser testing, failure traces, screenshots, and report artifacts.

## Deployment
Normal Render deploys now run:

`prisma generate -> migration-history reconciliation -> prisma migrate deploy -> next build`

They do not run seed data.

For a deliberate one-time production seed:

`ALLOW_PRODUCTION_SEED=true pnpm run seed:production`

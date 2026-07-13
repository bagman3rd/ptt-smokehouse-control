# Build 7.8.0 Test Report

## Locally executed structural checks

- EOD parent update uses the tenant-scoped `restaurantId_serviceDate` key.
- EOD child upsert uses the tenant-scoped `restaurantId_endOfDayLogId_proteinId` key.
- Tenant guard defaults to enabled in production and can only be disabled explicitly for controlled maintenance.
- Multi-restaurant reporting rollup remains present and membership-scoped.
- CI includes the EOD draft → revise → complete → lock → post-lock rejection browser/database sequence.
- Version, workflow, Render, schema, and package references are aligned to Build 7.8.0.

## CI-required runtime checks

The audited release artifact is produced only after PostgreSQL migration replay, typecheck, lint, production build, Playwright desktop/mobile tests, Quick EOD carryover, EOD lifecycle, tenant mutation, concurrency, load, restore, staging smoke, and vulnerability audit all pass.

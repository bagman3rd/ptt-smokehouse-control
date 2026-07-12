# Test Report — Build 6.7.0

## Completed static checks
- All ten requested POS providers are registered.
- Five new tenant-scoped Prisma models are present.
- Migration includes connection, location, catalog, sync-run, and normalized sales-line tables.
- Credential values are encrypted before persistence and never rendered back to the browser.
- Sync is duplicate-safe through a unique external order-line identity.
- Cross-tenant reads and writes use `restaurantId` and the new models are included in the tenant guard.
- Demo sync exercises menu, location, modifiers, channels, discounts, item mix, protein mapping, and sync reconciliation.
- Existing CSV import remains available.

## Validation limitation in this workspace
The uploaded ZIP does not contain `node_modules`, and this execution environment could not reach the npm registry. Therefore Prisma generation, TypeScript typechecking, Next.js compilation, and Playwright browser tests could not be executed here. The package retains the normal Render build command, which runs Prisma generation, migration deployment, migration smoke checks, and the Next.js production build.

## Corrective-base regression

- Confirmed Build 6.6.1 Quick EOD fallback mapping is present.
- Confirmed all eight Quick EOD inputs remain enabled for unlocked reports.
- Confirmed Build 6.7.0 preflight, migration-integrity, provider-registry, persistence, UI, and duplicate-safe synchronization checks pass.
- Database-backed orphan checks were not executable in the packaging environment because installed dependencies and a database connection were unavailable.

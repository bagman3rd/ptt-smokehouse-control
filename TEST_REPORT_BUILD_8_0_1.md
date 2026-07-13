# Test Report — Build 8.0.1

## Passed locally

- POS partial-migration recovery contract
- Migration SQL idempotency checks
- Package-script reference checks
- Flat ZIP structure

## Runtime requirement

Render must execute `pnpm run render-build`. The first deployment after the failed Build 8.0.0 attempt will resolve only the failed POS migration record and retry the now-idempotent migration.

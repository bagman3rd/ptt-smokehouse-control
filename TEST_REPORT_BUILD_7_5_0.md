# Test Report — Build 7.5.0

## Defects addressed

1. Quick EOD failed under the active tenant guard because `EndOfDayProteinLog.upsert.update` omitted `restaurantId`.
2. The tenant guard was disabled in production, allowing CI production-mode E2E to miss guard-contract violations.
3. Cook-plan APIs repeatedly resolved authentication and restaurant membership, creating an avoidable source of inconsistent authorization under rapid requests.

## Added tests

- Dev-mode Quick EOD API integration test with tenant guard enabled.
- Twelve sequential authenticated cook-plan generations; every response must be HTTP 200.
- Static assertion that tenant guard remains active in production.
- Static assertion that Quick EOD upsert update and create branches both carry tenant scope.

## Expected CI coverage

- Frozen dependency install
- Prisma generation
- Fresh migration replay
- Restore drill
- TypeScript and lint
- Production build
- Production-mode desktop/mobile Playwright
- Development-mode tenant-guard Playwright
- Load smoke test

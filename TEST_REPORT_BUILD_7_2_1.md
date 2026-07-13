# Test Report — Build 7.2.1

## Defect reproduced
Build 7.2.0 displayed saved EOD values but generated cook plans from `usableLeftoverUnits` and `usableLeftoverLb`. Quick EOD records could retain the visible values only in `sealedUnopenedUnits` and `openedMeatLb`, especially for legacy proteins whose codes were missing or nonstandard.

## Corrections verified
- All four core proteins map by code or legacy name.
- Quick EOD writes sealed units into usable unit credit.
- Quick EOD writes opened pounds into usable pound credit.
- Cook-plan generation falls back to existing sealed/opened values without double-counting.
- Sealed counts are stored as integers.
- Existing July 13 records can be used by regenerating the July 14 plan.

## Checks passed
- `node scripts/eod-credit-regression-test.mjs`
- `node scripts/build-7-2-1-evaluation.mjs`
- `node scripts/preflight-build-check.mjs`
- `node scripts/migration-integrity-test.mjs`

Full dependency-backed Next.js compilation was not run because the uploaded source package did not include installed dependencies.

# Test Report — Build 5.9.3

Static and regression tests added/updated for the smoker capacity workflow.

## Tests

- `node scripts/build-5-9-3-evaluation.mjs`
- `node scripts/smoker-catalog-test.mjs`
- `node scripts/preflight-build-check.mjs`
- `node scripts/migration-integrity-test.mjs`
- `node scripts/generate-plan-regression-test.mjs`

## Verified

- SPK-500 chicken capacity loads as 70.
- MLR-150 chicken capacity loads as 32.
- EL-ED/X chicken capacity loads as 72.
- Cook window dropdown contains the five requested choices.
- Location dropdown contains the four requested choices.
- Smoker form uses visible labels for all fields.

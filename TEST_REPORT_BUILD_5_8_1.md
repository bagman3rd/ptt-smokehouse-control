# Test Report — Build 5.8.1

Build 5.8.1 merges the Build 5.7.0 official-only smoker catalog corrections with the Build 5.8.0 regression/UX cleanup and fixes the Render TypeScript failure in `components/smokers/SmokerCatalogForms.tsx`.

## Fixed deploy blocker

Render failed because nullable smoker capacity fields could flow into React input `defaultValue` as `null`. Build 5.8.1 adds `preferredNumberInput()` so number inputs receive only `number` or empty string.

## Checks run in sandbox

- `node scripts/build-5-8-1-evaluation.mjs`
- `node scripts/smoker-catalog-test.mjs`
- `node scripts/generate-plan-regression-test.mjs`
- `node scripts/preflight-build-check.mjs`
- `node scripts/account-security-test.mjs`
- `node scripts/dead-code-check.mjs`
- `node scripts/permission-boundary-test.mjs`
- `node scripts/tenant-guard-coverage-test.mjs`
- `node scripts/pos-import-mapping-test.mjs`
- `node scripts/demo-docs-test.mjs`
- `node scripts/staging-verification-check.mjs`

Full `pnpm run typecheck` and `next build` still run in GitHub Actions/Render after dependency installation.

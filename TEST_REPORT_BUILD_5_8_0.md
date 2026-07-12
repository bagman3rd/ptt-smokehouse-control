# Test Report — Build 5.8.0

## Tests run in sandbox

Passed:

```text
node scripts/build-5-8-0-evaluation.mjs
node scripts/smoker-catalog-test.mjs
node scripts/generate-plan-regression-test.mjs
node scripts/preflight-build-check.mjs
node scripts/account-security-test.mjs
node scripts/dead-code-check.mjs
node scripts/permission-boundary-test.mjs
node scripts/tenant-guard-coverage-test.mjs
node scripts/pos-import-mapping-test.mjs
node scripts/demo-docs-test.mjs
node scripts/staging-verification-check.mjs
```

Not run in sandbox:

```text
pnpm run typecheck
pnpm run build
node scripts/orphan-record-check.mjs
```

Reason: node_modules and @prisma/client are not installed in the sandbox. These run in GitHub Actions/Render after install/generate.

## Regression fixtures checked

- Southern Pride MLR-150: 12 racks, 24 pork butts, 24 St. Louis ribs, 32 whole chickens, 8 beef briskets.
- Ole Hickory EL-ED/X: 12 racks, 18 x 48, 72 sq ft, 40 briskets, 80 Boston butts, 105 ribs, 72 whole chickens reference text.
- Cookshack SM160: 120 lb pork, 100 lb brisket, 50 lb ribs, 20 whole chickens kept as reference text, not count fields.
- J&R Little Red 250 FSE: 250 lb total, 10-15 brisket range, 50 spare-rib slabs, 150 chicken halves; only direct rib count loads into rib count.

## Generate-plan check

The generate-plan regression confirms the 40/30/15/15 protein mix is applied to cooked-weight demand, not sales-dollar split.

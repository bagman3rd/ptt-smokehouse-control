# Build 11.6.0 Cumulative Overlay Manifest

## New Build 11.6.0 files

- `.github/workflows/inventory-control-11.6.0.yml`
- `config/inventory-control-contract-11.6.0.json`
- `config/inventory-control-fixtures-11.6.0.json`
- `lib/inventory-control/build-11.6.0/inventory-control-engine.mjs`
- `lib/inventory-control/build-11.6.0/inventory-control-engine.d.mts`
- `scripts/test-inventory-control-11.6.0.mjs`
- `scripts/generate-inventory-workbench-11.6.0.mjs`
- `scripts/inventory-control-plane-11.6.0.mjs`
- `scripts/verify-inventory-control-11.6.0.mjs`
- `scripts/apply-build-11.6.0.mjs`
- `BUILD_11_6_0.md`
- `DEPLOY_BUILD_11_6_0.txt`
- `PATCH_MANIFEST_11_6_0.md`
- `docs/INVENTORY_MODEL_11_6_0.md`
- `docs/WASTE_CONTROL_11_6_0.md`
- `docs/QUALITY_HOLD_MODEL_11_6_0.md`
- `docs/INVENTORY_EXCEPTION_MODEL_11_6_0.md`
- `docs/INVENTORY_ROLE_MATRIX_11_6_0.md`
- `docs/INVENTORY_ACCEPTANCE_11_6_0.md`
- `docs/INVENTORY_UAT_11_6_0.md`
- `docs/RELEASE_EVIDENCE_11_6_0.md`
- `docs/DEFECT_REGISTER_11_6_0.csv`
- updated `render.yaml`

## Cumulative retained files

All overlay files from Builds 11.1.0 through 11.5.0 remain included.

## Generated during installation

- Inventory Control Validation Lab.
- All prior cumulative evidence.
- Build 11.6.0 capability, source, scenario, ledger, balance, hold,
  exception, UAT, readiness, contingency, and hash evidence.
- package.json version and script entries.
- README build heading where the standard heading exists.

## Deliberately unchanged

- Prisma schema and migrations
- dependencies and lockfile
- production records
- durable inventory endpoint implementation
- supplier purchasing
- raw-food perpetual inventory
- recipe-level ingredient depletion

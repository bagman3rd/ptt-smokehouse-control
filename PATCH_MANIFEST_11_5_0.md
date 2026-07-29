# Build 11.5.0 Cumulative Overlay Manifest

## New Build 11.5.0 files

- `.github/workflows/today-operations-11.5.0.yml`
- `config/today-operations-contract-11.5.0.json`
- `config/today-operations-fixtures-11.5.0.json`
- `lib/today-operations/build-11.5.0/today-operations-engine.mjs`
- `lib/today-operations/build-11.5.0/today-operations-engine.d.mts`
- `scripts/test-today-operations-11.5.0.mjs`
- `scripts/generate-today-workbench-11.5.0.mjs`
- `scripts/today-operations-control-plane-11.5.0.mjs`
- `scripts/verify-today-operations-11.5.0.mjs`
- `scripts/apply-build-11.5.0.mjs`
- `BUILD_11_5_0.md`
- `DEPLOY_BUILD_11_5_0.txt`
- `PATCH_MANIFEST_11_5_0.md`
- `docs/TODAY_OPERATIONS_MODEL_11_5_0.md`
- `docs/QUICK_EOD_MODEL_11_5_0.md`
- `docs/TODAY_ROLE_MATRIX_11_5_0.md`
- `docs/TODAY_ACCEPTANCE_11_5_0.md`
- `docs/TODAY_UAT_11_5_0.md`
- `docs/RELEASE_EVIDENCE_11_5_0.md`
- `docs/DEFECT_REGISTER_11_5_0.csv`
- updated `render.yaml`

## Cumulative retained files

All overlay files from Builds 11.1.0, 11.2.0, 11.3.0 and 11.4.0 remain included.

## Generated during installation

- Today Operations Validation Lab.
- Build 11.1.0 application inventory.
- Build 11.2.0 setup/master-data evidence.
- Build 11.3.0 forecast evidence.
- Build 11.4.0 production-planning evidence.
- Build 11.5.0 full operating-day evidence.
- package.json version and build scripts.
- README build heading where the standard heading exists.

## Deliberately unchanged

- Prisma schema and migrations
- dependencies and lockfile
- production records
- durable event persistence implementation
- detailed waste and quality-hold implementation
- notification delivery implementation

# Build 11.4.0 Cumulative Overlay Manifest

## New Build 11.4.0 files

- `.github/workflows/production-planning-11.4.0.yml`
- `config/production-planning-contract-11.4.0.json`
- `config/production-planning-fixtures-11.4.0.json`
- `lib/production-planning/build-11.4.0/production-planning-engine.mjs`
- `lib/production-planning/build-11.4.0/production-planning-engine.d.mts`
- `scripts/test-production-planning-11.4.0.mjs`
- `scripts/generate-production-workbench-11.4.0.mjs`
- `scripts/production-control-plane-11.4.0.mjs`
- `scripts/verify-production-planning-11.4.0.mjs`
- `scripts/apply-build-11.4.0.mjs`
- `BUILD_11_4_0.md`
- `DEPLOY_BUILD_11_4_0.txt`
- `PATCH_MANIFEST_11_4_0.md`
- `docs/PRODUCTION_MODEL_11_4_0.md`
- `docs/PRODUCTION_ACCEPTANCE_11_4_0.md`
- `docs/PRODUCTION_UAT_11_4_0.md`
- `docs/CAPACITY_VALIDATION_11_4_0.md`
- `docs/RELEASE_EVIDENCE_11_4_0.md`
- `docs/DEFECT_REGISTER_11_4_0.csv`
- updated `render.yaml`

## Cumulative retained files

All overlay files from Builds 11.1.0, 11.2.0 and 11.3.0 are retained.

## Generated during installation

- Admin Production Planning Validation Lab.
- Build 11.1.0 application inventory.
- Build 11.2.0 setup/master-data evidence.
- Build 11.3.0 forecast evidence.
- Build 11.4.0 production evidence and seven-day plan.
- package.json version and build scripts.
- README build heading where the standard heading exists.

## Deliberately unchanged

- Prisma schema and migrations
- dependencies and lockfile
- production records
- durable forecast/production approval implementation
- Today and EOD workflow implementation

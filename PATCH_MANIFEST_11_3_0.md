# Build 11.3.0 Cumulative Overlay Manifest

## New Build 11.3.0 files

- `.github/workflows/forecast-demand-11.3.0.yml`
- `config/forecast-contract-11.3.0.json`
- `config/forecast-fixtures-11.3.0.json`
- `lib/forecasting/build-11.3.0/forecast-engine.mjs`
- `lib/forecasting/build-11.3.0/forecast-engine.d.mts`
- `scripts/test-forecast-engine-11.3.0.mjs`
- `scripts/generate-forecast-workbench-11.3.0.mjs`
- `scripts/forecast-control-plane-11.3.0.mjs`
- `scripts/verify-forecast-11.3.0.mjs`
- `scripts/apply-build-11.3.0.mjs`
- `BUILD_11_3_0.md`
- `DEPLOY_BUILD_11_3_0.txt`
- `PATCH_MANIFEST_11_3_0.md`
- `docs/FORECAST_MODEL_11_3_0.md`
- `docs/FORECAST_ACCEPTANCE_11_3_0.md`
- `docs/FORECAST_UAT_11_3_0.md`
- `docs/RELEASE_EVIDENCE_11_3_0.md`
- `docs/DEFECT_REGISTER_11_3_0.csv`
- updated `render.yaml`

## Cumulative retained files

All Build 11.1.0 and Build 11.2.0 overlay files are retained.

## Generated during installation

- Admin Forecast Validation Lab page and client component.
- Build 11.1.0 application inventory.
- Build 11.2.0 setup/master-data evidence.
- Build 11.3.0 forecast evidence.
- package.json version and build scripts.
- README build heading where the standard heading exists.

## Deliberately unchanged

- Prisma schema and migrations
- dependencies and lockfile
- production records
- raw/cooked production conversion
- carryover application
- smoker scheduling
- Today and EOD workflows

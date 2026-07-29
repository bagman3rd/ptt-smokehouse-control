# Build 11.2.0 Cumulative Overlay Manifest

## Build 11.2.0 files

- `.github/workflows/setup-master-data-11.2.0.yml`
- `config/ptt-master-data-contract-11.2.0.json`
- `config/fresh-tenant-scenario-11.2.0.json`
- `scripts/generate-setup-center-11.2.0.mjs`
- `scripts/master-data-control-plane-11.2.0.mjs`
- `scripts/verify-master-data-11.2.0.mjs`
- `scripts/database-readiness-11.2.0.mjs`
- `scripts/apply-build-11.2.0.mjs`
- `BUILD_11_2_0.md`
- `DEPLOY_BUILD_11_2_0.txt`
- `PATCH_MANIFEST_11_2_0.md`
- `docs/MASTER_DATA_ACCEPTANCE_11_2_0.md`
- `docs/FRESH_TENANT_UAT_11_2_0.md`
- `docs/MASTER_DATA_CHANGE_CONTROL_11_2_0.md`
- `docs/RELEASE_EVIDENCE_11_2_0.md`
- `docs/DEFECT_REGISTER_11_2_0.csv`
- updated `render.yaml`

## Retained cumulative files

All Build 11.1.0 inventory scripts, policy, workflow and documents are retained.

## Generated during installation

- Admin Setup Center page.
- Build 11.1.0 repository inventory under `artifacts/build-11.1.0/`.
- Build 11.2.0 master-data evidence under `artifacts/build-11.2.0/`.
- `package.json` version and inventory/setup scripts.
- README build heading, where the standard heading is present.

## Deliberately unchanged

- Prisma schema and migrations
- dependency versions and lockfile
- production records
- forecast, production, smoker scheduling and EOD calculations
- authentication and authorization implementation

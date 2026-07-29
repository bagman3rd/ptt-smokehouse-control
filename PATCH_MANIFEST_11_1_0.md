# Build 11.1.0 Overlay Manifest

## Files in this package

- `.github/workflows/application-inventory-11.1.0.yml`
- `config/application-inventory-policy-11.1.0.json`
- `scripts/application-inventory-11.1.0.mjs`
- `scripts/verify-application-inventory-11.1.0.mjs`
- `scripts/apply-build-11.1.0.mjs`
- `render.yaml`
- `BUILD_11_1_0.md`
- `DEPLOY_BUILD_11_1_0.txt`
- `PATCH_MANIFEST_11_1_0.md`
- `docs/LIVE_APPLICATION_AUDIT_11_1_0.md`
- `docs/RELEASE_EVIDENCE_11_1_0.md`
- `docs/SCREEN_DISPOSITION_POLICY_11_1_0.md`
- `docs/STAGING_PLAN_11_1_0.md`
- `docs/DEFECT_REGISTER_11_1_0.csv`
- `docs/PRODUCTION_BASELINE_RECORD_11_1_0.md`

## Files modified at installation time

`scripts/apply-build-11.1.0.mjs` updates:

- `package.json` version to `11.1.0`
- package scripts for inventory generation and verification
- the README build heading, where the standard PTT heading is present

It then generates the evidence package under `artifacts/build-11.1.0/`.

## Deliberately unchanged

- Prisma schema and migrations
- application dependencies and lockfile
- restaurant business rules
- authentication and authorization behavior
- forecast, cook-plan, smoker, EOD and carryover calculations
- production records

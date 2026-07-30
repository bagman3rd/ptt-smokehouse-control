# Build 11.8.0 Cumulative Overlay Manifest

## New Build 11.8.0 files

- `.github/workflows/notification-admin-11.8.0.yml`
- `config/notification-admin-contract-11.8.0.json`
- `config/notification-admin-fixtures-11.8.0.json`
- `lib/notification-admin/build-11.8.0/notification-admin-engine.mjs`
- `lib/notification-admin/build-11.8.0/notification-admin-engine.d.mts`
- `scripts/test-notification-admin-11.8.0.mjs`
- `scripts/generate-notification-admin-workbench-11.8.0.mjs`
- `scripts/notification-admin-control-plane-11.8.0.mjs`
- `scripts/verify-notification-admin-11.8.0.mjs`
- `scripts/apply-build-11.8.0.mjs`
- `BUILD_11_8_0.md`
- `DEPLOY_BUILD_11_8_0.txt`
- `PATCH_MANIFEST_11_8_0.md`
- `docs/NOTIFICATION_MODEL_11_8_0.md`
- `docs/ESCALATION_RETRY_MODEL_11_8_0.md`
- `docs/ADMINISTRATION_MODEL_11_8_0.md`
- `docs/SUPPORT_BUNDLE_MODEL_11_8_0.md`
- `docs/NOTIFICATION_ROLE_MATRIX_11_8_0.md`
- `docs/NOTIFICATION_ACCEPTANCE_11_8_0.md`
- `docs/NOTIFICATION_UAT_11_8_0.md`
- `docs/RELEASE_EVIDENCE_11_8_0.md`
- `docs/DEFECT_REGISTER_11_8_0.csv`
- updated `render.yaml`

## Generated during installation

- Notification and Administration Validation Lab.
- All prior cumulative evidence.
- Delivery and incident traces.
- Provider-health and dead-letter evidence.
- Administration audit evidence.
- Sanitized support bundle.
- Thirty-row deployed UAT workbook.
- Readiness and hash manifests.
- package.json version and script entries.
- README build heading where the standard heading exists.

## Deliberately unchanged

- Prisma schema and migrations
- dependencies and lockfile
- live provider credentials
- live email/SMS transmission
- durable notification storage
- production support-case integration

## Render Blueprint correction

- Removed all three `type: cron` service definitions from `render.yaml`.
- Retained the `ptt-smokehouse-control` web service and `ptt-smokehouse-control-db` PostgreSQL database.
- Updated cumulative verification assumptions and diagnostic fixtures to expect one Render service.

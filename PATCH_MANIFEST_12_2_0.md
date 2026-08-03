# Build 12.2.0 Cumulative Overlay Manifest

## New Build 12.2.0 files

- `.github/workflows/pos-data-integrations-12.2.0.yml`
- `config/pos-data-integrations-contract-12.2.0.json`
- `config/pos-data-integrations-fixtures-12.2.0.json`
- `lib/pos-data-integrations/build-12.2.0/pos-data-integrations-engine.mjs`
- `lib/pos-data-integrations/build-12.2.0/pos-data-integrations-engine.d.mts`
- `scripts/test-pos-data-integrations-12.2.0.mjs`
- `scripts/generate-pos-data-integrations-workbench-12.2.0.mjs`
- `scripts/pos-data-integrations-control-plane-12.2.0.mjs`
- `scripts/verify-pos-data-integrations-12.2.0.mjs`
- `scripts/apply-build-12.2.0.mjs`
- `BUILD_12_2_0.md`
- `DEPLOY_BUILD_12_2_0.txt`
- `PATCH_MANIFEST_12_2_0.md`
- integration, mapping, reconciliation, retry, manual fallback, supplier,
  migration, acceptance, UAT, evidence, and defect documentation
- updated `render.yaml`

## Generated during installation

- POS and Data Integrations Validation Lab
- provider connection-health evidence
- reconciled import batches and mapped-line evidence
- daily location summaries
- actual-versus-forecast evidence
- controlled forecast-learning inputs
- retry/recovery evidence
- manual-fallback evidence
- supplier-cost snapshots and alerts
- forty-four-row deployed UAT workbook
- readiness and SHA-256 manifests
- package.json and README build identity updates

## Deliberately unchanged

- Prisma schema and migrations
- dependencies and lockfile
- provider credentials
- provider webhook registration
- live provider API adapters
- durable import persistence
- durable retry queue
- supplier download automation
- Render cron services remain absent

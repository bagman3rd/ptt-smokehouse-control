# Build 11.9.0 Cumulative Overlay Manifest

## New Build 11.9.0 files

- `.github/workflows/security-performance-recovery-11.9.0.yml`
- `config/security-performance-recovery-contract-11.9.0.json`
- `config/security-performance-recovery-fixtures-11.9.0.json`
- `lib/security-performance-recovery/build-11.9.0/security-performance-recovery-engine.mjs`
- `lib/security-performance-recovery/build-11.9.0/security-performance-recovery-engine.d.mts`
- `scripts/test-security-performance-recovery-11.9.0.mjs`
- `scripts/generate-hardening-workbench-11.9.0.mjs`
- `scripts/security-performance-recovery-control-plane-11.9.0.mjs`
- `scripts/verify-security-performance-recovery-11.9.0.mjs`
- `scripts/apply-build-11.9.0.mjs`
- `BUILD_11_9_0.md`
- `DEPLOY_BUILD_11_9_0.txt`
- `PATCH_MANIFEST_11_9_0.md`
- `docs/SECURITY_MODEL_11_9_0.md`
- `docs/PERFORMANCE_MODEL_11_9_0.md`
- `docs/RECOVERY_MODEL_11_9_0.md`
- `docs/ROLLBACK_RUNBOOK_11_9_0.md`
- `docs/HARDENING_ROLE_MATRIX_11_9_0.md`
- `docs/HARDENING_ACCEPTANCE_11_9_0.md`
- `docs/HARDENING_UAT_11_9_0.md`
- `docs/RELEASE_EVIDENCE_11_9_0.md`
- `docs/DEFECT_REGISTER_11_9_0.csv`
- updated `render.yaml`

## Generated during installation

- Hardening Validation Lab.
- All prior cumulative evidence.
- Security-control results.
- Authorization and tenant-isolation results.
- Rate-limit trace.
- Tamper-evident audit chain.
- Performance-budget results.
- Database-health results.
- Recovery-readiness results.
- GO/HOLD release-gate evidence.
- Sanitized hardening support bundle.
- Thirty-four-row deployed UAT workbook.
- Readiness and SHA-256 manifests.
- package.json version and script entries.
- README build heading where the standard heading exists.

## Deliberately unchanged

- Prisma schema and migrations
- dependencies and lockfile
- production authentication implementation
- production security-header implementation
- production rate-limit storage
- production load profile
- backup data
- restore data
- Render cron services remain absent

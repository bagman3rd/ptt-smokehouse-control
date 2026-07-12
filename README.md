# PTT Smokehouse Control — Build 6.5.0

Restaurant smokehouse forecasting, cook planning, smoker allocation, EOD reconciliation, reporting, tenant controls, and operational auditability.

## Build 6.5.0 reliability focus

- Preserves original and renumbered migration history without rewriting `_prisma_migrations`
- Replays the complete migration chain on fresh PostgreSQL
- Executes a database dump-and-restore drill in CI and retains evidence
- Runs desktop, mobile, cross-tenant, kitchen-workflow, and 50-session load smoke tests
- Uses a committed pnpm lockfile with frozen installs in CI and Render
- Defaults founding-customer billing to documented manual invoicing
- Tracks external pilot gates for live PTT data and physical-device testing

## Local setup

```bash
pnpm install --frozen-lockfile
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run db:seed
pnpm run dev
```

## Production build

```bash
pnpm run render-build
```

## Current policy documents

- `docs/MIGRATION_HISTORY.md`
- `docs/BILLING_POLICY.md`
- `docs/PILOT_EVIDENCE_CHECKLIST.md`
- `docs/SUPPORT_OPERATIONS.md`

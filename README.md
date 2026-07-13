# PTT Smokehouse Control — Build 7.0.0

## Build 7.0.0 — Render POS deployment fix

- Forces `prisma generate` during install and immediately before every production build.
- Verifies the generated Prisma Client contains `PosConnection` before Next.js compilation.
- Prevents Render from compiling POS routes against a stale cached Prisma Client.
- Use `pnpm run render-build` and clear the Render build cache for the first deployment.

Restaurant smokehouse forecasting, cook planning, smoker allocation, EOD reconciliation, reporting, tenant controls, and operational auditability.

## Build 7.0.0 — Whole-number sealed inventory

The Quick EOD sealed/unopened brisket, pork, chicken, and rib fields now accept and store whole units only. Opened-meat quantities remain decimal pounds.

## Build 6.7.0 kitchen closeout

The End-of-Day page now begins with an eight-number quick report for sealed unopened units and opened-meat pounds across brisket, pork, chicken, and ribs. Only sealed pork, chicken, and ribs become next-load credits. Sealed brisket and all opened-meat pounds are recorded for repurposed menu use but are not carried into the next smoker load. The original detailed EOD form remains available below it.

## Build 6.7.0 reliability focus

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


## Build 6.7.0 — Top-10 POS integration
See `BUILD_6_7_0.md` for provider coverage, credential requirements, demo validation, and deployment steps.
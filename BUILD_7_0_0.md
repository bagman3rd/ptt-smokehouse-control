# Smokehouse Control — Build 7.0.0

## Render deployment correction

Build 7.0.0 fixes the POS compilation failure in which TypeScript reported that `prisma.posConnection` did not exist.

The failure occurs when Next.js compiles against a Prisma Client generated before the POS models were added. Build 7.0.0 makes stale-client compilation impossible through three independent controls:

1. `postinstall` runs `prisma generate` whenever dependencies are installed.
2. `build` runs `prisma generate` immediately before `next build`.
3. `render-build` generates Prisma and verifies that the generated client contains `PosConnection` before migrations and compilation.

The verifier produces a direct diagnostic if the generated client is missing the POS model instead of allowing an opaque TypeScript error later in the build.

## Render build command

```bash
pnpm run render-build
```

For the first deployment of this package, use **Clear build cache & deploy** so Render discards the stale generated client from the failed deployment.

## Preserved functionality

- Top-10 POS integration architecture
- Tenant-scoped POS connections and imports
- Whole-number sealed/unopened meat counts
- Decimal opened-meat weights
- Existing cook planning, forecasting, EOD, backups and migration history

# Test Report — Build 7.0.0

## Passed static release checks

- Package version is 7.0.0.
- Prisma schema contains `PosConnection` and all POS persistence models.
- Production `build` runs `prisma generate` before Next.js compilation.
- Dependency installation runs `prisma generate` through `postinstall`.
- Render build runs Prisma generation, generated-client verification, migrations, migration smoke checks and Next.js compilation in that order.
- Generated-client verifier is present and checks for the POS model.
- Render YAML uses `pnpm run render-build`.
- Health and navigation build identifiers report 7.0.0.
- Top-10 POS static regression checks pass.
- Migration-integrity checks pass.

## Deployment validation still required

The final production proof is a Render deployment using **Clear build cache & deploy**. The deployment log must show Prisma generation and the generated-client verification before `next build`.

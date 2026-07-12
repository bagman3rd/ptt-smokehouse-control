# TEST REPORT — Build 4.3.3

## Purpose

Build 4.3.3 is a deploy-fix release for the Build 4.3.x tenant/security hardening line.

## Render failure fixed

Render failed TypeScript compilation in `lib/dataQuality.ts` because callback parameters inferred from Prisma result data were implicitly `any` under strict type checking.

## Fix

Added explicit lightweight local types for EOD logs and EOD protein logs inside `lib/dataQuality.ts`, then cast the Prisma query result before filter/every/some callbacks.

## Preserved from Build 4.3.x

- Prisma tenant guard extension.
- Cross-tenant regression test.
- Postgres-backed rate limiting.
- Account lockout.
- Session revocation through `sessionVersion`.
- CI security and tenant test scripts.
- `prisma migrate deploy` render build path.

## Static checks run

```bash
node scripts/build-4-3-3-evaluation.mjs
```

Result:

```text
Build 4.3.3 evaluation checks completed.
```

## Remaining required verification

After deploy, run or record:

```bash
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run test:forecast
pnpm run test:account-security
```

against staging or production as appropriate.

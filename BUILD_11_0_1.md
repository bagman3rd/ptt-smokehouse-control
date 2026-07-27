# Build 11.0.1 — Deploy Hotfix (broken import + build-failure guard)

11.0.1 is a hotfix over 11.0.0. It fixes the `next build` failure that blocked deployment of both 10.0.0 and 11.0.0 on Render, and adds a permanent guard so this class of error cannot reach production again.

## The failure

Render build logs for 10.0.0 and 11.0.0 both ended with:

```
./app/account/privacy/confirm-delete/page.tsx
Module not found: Can't resolve './actions'
> Build failed because of webpack errors
```

**Root cause.** `app/account/privacy/confirm-delete/page.tsx` imported `confirmAccountDeletion` from `./actions` — i.e. `app/account/privacy/confirm-delete/actions.ts`, which does not exist. The action is defined one directory up, in `app/account/privacy/actions.ts`. The correct specifier is `../actions`.

**Why it escaped twice.** The Prisma query engine can't be downloaded in the build sandbox used to assemble these releases, so `next build` could not be executed locally. Every logic/contract/drift test passed, but only a real Next.js/webpack compile resolves module paths — so a wrong-directory relative import compiled clean in every offline check and only failed on Render.

## The fix

- **One-line correction:** `confirm-delete/page.tsx` now imports from `../actions`. Verified: `confirmAccountDeletion` is exported there, the file carries `'use server'`, and the sibling `privacy/page.tsx` correctly uses `./actions`.

- **Permanent guard — `scripts/import-resolution-check.mjs`** (`pnpm run test:imports`), wired **early** into `ci:test` (right after preflight) and into the `test:compliance` bundle. It statically verifies, across all 222 app/lib/component/script/e2e files:
  - every relative (`./`, `../`) and alias (`@/`) import resolves to a real file (with the same extension/index resolution Next uses);
  - every `page.tsx` has a default export;
  - every `app/api/**/route.ts` exports at least one HTTP handler;
  - no `'use client'` component imports server-only `@/lib/prisma`.

  Any of these would fail `next build`; the guard now catches them in seconds, offline, before a deploy is ever attempted.

## Verified

- `test:imports` PASS (222 files, 0 unresolved imports, 0 structural issues).
- Full `test:compliance` bundle PASS (now 9 suites, import check first).
- Regression sweep PASS.
- All `page.tsx` default exports, all API route handlers, and client/server boundaries confirmed clean by direct scan.

## Note on the pnpm store warning

The 10.0.0 log also showed `ERR_PNPM_UNEXPECTED_PKG_CONTENT_IN_STORE — The lockfile is broken! Resolution step will be performed to fix it.` This is a **transient Render pnpm store-cache** condition; pnpm self-healed ("Done in 5.1s") and proceeded to the build. It was not the cause of the failure and did not recur. The lockfile itself is clean (no overrides, no bad references) and consistent with `package.json`; `--frozen-lockfile` is retained for reproducibility.

## Standing recommendation

Because the assembly sandbox cannot run `next build`, treat `pnpm run test:imports` + a real `next build` (locally or in CI on a runner that can fetch Prisma engines) as the definitive pre-deploy gate. The import guard closes the specific gap that caused this incident; a CI `next build` remains the backstop for any webpack-level error the static guard doesn't model.

No schema, migration, or dependency changes in 11.0.1. Additive code only.

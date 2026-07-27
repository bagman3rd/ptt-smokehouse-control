# Build 11.0.2 — Deploy Hotfix (invalid `as const` type error + TS guard)

11.0.2 is a hotfix over 11.0.1. It fixes the `next build` failure that blocked deployment of 11.0.1 on Render, and adds a permanent guard for the class of TypeScript error involved.

## The failure

11.0.1 compiled successfully (the import fix worked — the build got past webpack), then failed at the type-check phase:

```
./lib/notifications/dispatch.ts:46:38
Type error: A 'const' assertions can only be applied to references to enum
members, or string, number, boolean, array, or object literals.

> 46 | const mapCategory = (c: Category) => (c === 'MARKETING' ? 'MARKETING' : 'TRANSACTIONAL') as const;
```

**Root cause.** `as const` was applied to a ternary *expression*. TypeScript (TS1355) only permits `as const` on literals, arrays, or objects — not on the result of a conditional expression. The intent was to narrow the return to the literal union `'MARKETING' | 'TRANSACTIONAL'`; `as const` was the wrong tool.

**Why it escaped.** This is a *type-check* error, not a module-resolution or plain-syntax error. It only surfaces when `tsc` runs as part of `next build`. In the assembly sandbox the Prisma query engine can't be downloaded, so the generated Prisma client doesn't exist, so a full `tsc`/`next build` cannot run — and a type error in a file that imports Prisma types compiles clean in every offline logic/contract test. The 11.0.1 import guard catches unresolved modules but not type errors.

## The fix

- **`lib/notifications/dispatch.ts`** — `mapCategory` now uses an explicit return-type annotation instead of `as const`:

  ```ts
  const mapCategory = (c: Category): 'MARKETING' | 'TRANSACTIONAL' =>
    c === 'MARKETING' ? 'MARKETING' : 'TRANSACTIONAL';
  ```

  Verified to compile cleanly with `tsc --strict` in isolation. A codebase-wide scan confirmed this was the only ternary-`as const` misuse; all other `as const` uses are on array/object literals (valid).

- **Permanent guard — `scripts/typescript-antipattern-check.mjs`** (`pnpm run test:ts-antipatterns`), wired into `ci:test` (right after the import guard) and into the `test:compliance` bundle. It strips comments and string/template contents, then flags `as const` applied to a parenthesized ternary/expression — the exact TS1355 pattern — across all app/lib/component/script `.ts`/`.tsx` files. Proven: it exits 1 when the bug is present and 0 when fixed.

## Why a targeted guard (and not full offline type-checking)

A full `tsc` needs the generated Prisma client, which needs the query engine, which can't be fetched in the sandbox. A stubbed Prisma client was attempted but produced large numbers of false positives (the real generated types provide inference the stub cannot), making it useless as a gate. The targeted anti-pattern guard is conservative and false-positive-free for the patterns it checks. It complements — does not replace — a real `next build` in a Prisma-enabled CI runner.

## Verified

- `test:ts-antipatterns` PASS (147 files); proven to catch the exact bug.
- `test:imports` PASS (223 files).
- Full `test:compliance` bundle PASS (10 sub-tests, both static guards leading).
- Regression sweep PASS.

## Standing recommendation (unchanged, reinforced)

Two deploy failures in a row were `next build`-only errors (module resolution, then a type error). Both now have offline static guards, but the definitive fix is the same: **run `next build` in a CI runner that can fetch Prisma engines** as the authoritative pre-deploy gate. The static guards (`test:imports`, `test:ts-antipatterns`) catch the specific failure classes seen so far in seconds, offline; a real compile remains the backstop for any error class they don't model.

No schema, migration, or dependency changes in 11.0.2. Additive code only.

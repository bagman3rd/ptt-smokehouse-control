# TEST REPORT — Build 3.8.1

## Purpose

Build 3.8.1 is a deploy-fix patch for Build 3.8.0.

The Render failure was caused by a TypeScript inference error in:

`app/admin/restaurants/pos/PosImportPreviewForm.tsx`

The valid CSV row branch returned an object without the `reason` property while invalid branches returned `reason`. TypeScript inferred an overly narrow union for `flatMap`, then rejected the valid row branch.

## Fix

- Annotated the `flatMap` callback return type as `ParsedRow[]`.
- Returned `reason: undefined` for valid rows to keep the row shape stable.
- Updated app version to `3.8.1`.
- Updated nav badge to `Build 3.8.1`.
- Updated static evaluation script to `scripts/build-3-8-1-evaluation.mjs`.

## Static Evaluation

Command run:

```bash
node scripts/build-3-8-1-evaluation.mjs
```

Result:

```text
Build 3.8.1 evaluation checks completed.
```

## Deployment Notes

Build 3.8.1 keeps Render in db-push recovery mode:

```bash
prisma generate && prisma db push && tsx prisma/seed.ts && next build
```

It does not use `--accept-data-loss`.

## Scope

No product functionality changes from Build 3.8.0.

This patch only fixes the TypeScript deploy failure and version references.

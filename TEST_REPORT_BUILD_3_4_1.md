# TEST REPORT — Build 3.4.1

## Purpose

Deploy-recovery build after Render failed on Prisma P3009 because an earlier failed migration existed in the target database.

## Fix

- Preserves Build 3.4.0 UI cleanup and liquor/food/smoked-meat visibility.
- Changes Render build path back to `prisma db push` without `--accept-data-loss`.
- Avoids `prisma migrate deploy` until the failed migration is resolved and the production database is baselined.

## Why

`prisma migrate deploy` refuses to apply new migrations when the target database contains a failed migration record. This is correct Prisma behavior. Since this database was evolved through previous MVP `db push` builds, Build 3.4.1 uses the safer recovery path for this existing Render database.

## Validation

Static evaluation script passes and verifies:

- Version is 3.4.1.
- Navigation identity pills remain removed.
- 20% liquor / 80% food / 50% smoked-meat-of-food explanation remains visible.
- Render build does not use `prisma migrate deploy`.
- Render build does not use `--accept-data-loss`.

## Next migration work

After the app is stable again, run migration repair/baselining on a staging clone before switching production back to `prisma migrate deploy`.

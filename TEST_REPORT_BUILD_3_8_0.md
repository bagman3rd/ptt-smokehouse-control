# TEST REPORT — Build 3.8.0

## Static evaluation

Command:

```bash
node scripts/build-3-8-0-evaluation.mjs
```

Result: passed.

## Verified by static inspection

- Version updated to 3.8.0.
- System Health page now tracks staging tests, backup export tests, forecast tests, restore drills, migration baseline reviews, and security reviews.
- SystemCheck model added for persistent test/drill status records.
- Setup Wizard now displays setup-completion percentage and setup-blocking warnings.
- POS/Sales CSV import now has client-side preview and explicit confirmation before submission.
- Learning page includes forecast-change impact language before recommendation approval.
- Printable Cook Plan page added at `/cook-plan/print`.
- Cook Plan page links to print view.
- Login success/failure audit entries added.
- Backup export and report export audit entries added.
- Render build remains in db-push recovery mode and does not use `--accept-data-loss`.

## Not run here

- `pnpm run test:tenant` against live staging PostgreSQL.
- `pnpm run test:backup` against live staging PostgreSQL.
- Full restore drill into staging.
- Full Render production build.

Those require a live staging `DATABASE_URL` and should be run before outside customers are added.

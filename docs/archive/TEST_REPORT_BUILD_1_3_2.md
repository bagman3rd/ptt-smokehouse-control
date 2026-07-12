# PTT Smokehouse Control — Test Report Build 1.3.2

## Change request

- Remove Conservative $6M from the active model.
- Rename Event Day to ROD RUN.
- Set ROD RUN total sales basis to $12,000,000.

## Files reviewed / changed

- `lib/bootstrap.ts`
- `prisma/seed.ts`
- `app/dashboard/page.tsx`
- `app/cook-plan/page.tsx`
- `app/settings/page.tsx`
- `app/api/cook-plan/route.ts`
- `app/actions.ts`
- `components/Nav.tsx`
- `package.json`
- `README.md`

## Logic validation

### Existing deployed database

Build 1.3.2 handles an existing database by normalizing records on app boot and during seed:

- `Conservative $6M` becomes `Legacy Conservative $6M`.
- `Legacy Conservative $6M` is excluded from Dashboard, Cook Plan, and Settings scenario lists.
- `Event Day` becomes `ROD RUN` if ROD RUN does not already exist.
- If both exist, `Event Day` becomes `Legacy Event Day` and is excluded.
- `ROD RUN` is upserted with annual sales of 12000000.

### New database

Seed creates only active scenarios:

- Base $6M
- Aggressive $8M
- ROD RUN

## Manual test checklist

1. Login.
2. Open Dashboard.
3. Confirm Forecast Scenarios show Base $6M, Aggressive $8M, ROD RUN.
4. Open Cook Plan.
5. Confirm Scenario dropdown excludes Conservative $6M and Event Day.
6. Generate Base $6M.
7. Generate Aggressive $8M.
8. Generate ROD RUN.
9. Confirm ROD RUN produces larger forecast and meat load than Aggressive $8M.
10. Open Settings and confirm only the three active scenarios are editable.

## Result

Ready for deployment as Build 1.3.2.

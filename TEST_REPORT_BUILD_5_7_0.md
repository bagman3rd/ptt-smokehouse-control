# Test Report — Build 5.7.0

## Checks completed

- Build 5.7.0 smoker catalog test passed.
- Build 5.7.0 evaluation test passed.
- Build 5.7.0 preflight test passed.

## Verified

- Package version is 5.7.0.
- Nav badge says Build 5.7.0.
- README says Build 5.7.0.
- SmokerCatalog capacity fields are nullable.
- Migration `20260712000600_build_570_official_smoker_catalog` exists.
- Southern Pride MLR-150 uses manufacturer values: 12 racks, 24 pork butts, 24 ribs, 32 whole chickens, 8 briskets.
- Catalog seed retires old unverified/estimated rows.
- Active smoker catalog data contains no `ESTIMATED` rows.
- Smoker form clearly shows “official data not published” for blank manufacturer capacity fields.
- Render build still uses `prisma migrate deploy`.
- Render build does not use `prisma db push`.
- No `--accept-data-loss`.

## Not run in sandbox

A full Next.js build was not run because dependencies are not installed in this sandbox. GitHub Actions/Render should run the full install/build path after deployment.

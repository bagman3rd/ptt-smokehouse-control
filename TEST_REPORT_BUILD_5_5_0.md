# Test Report — Build 5.5.0

## Static verification completed

- Package version updated to 5.5.0.
- Navigation badge updated to Build 5.5.0.
- Prisma schema includes `SmokerCatalog` and `Smoker.catalogId` / `Smoker.brand`.
- Migration added: `20260712000500_build_550_smoker_catalog`.
- Catalog seed contains at least 50 smoker/equipment rows across five brands.
- `/admin/smokers` loads the catalog dropdown.
- `/admin/smokers/catalog` displays the full catalog grouped by brand.
- Create/update smoker actions accept `catalogId` and copy catalog capacity defaults.
- Render build still uses `prisma migrate deploy` and does not use `prisma db push` or `--accept-data-loss`.

## Remaining live verification

- Deploy to staging first.
- Confirm migration creates `SmokerCatalog`.
- Confirm `tsx prisma/seed.ts` inserts catalog rows.
- Open `/admin/smokers` and select Ole Hickory EL-ED/X.
- Confirm it auto-loads 40 briskets, 80 butts, 105 rib racks, and 144 chicken breasts.
- Save the smoker.
- Confirm `/admin/smokers/schedule` uses the saved capacities.

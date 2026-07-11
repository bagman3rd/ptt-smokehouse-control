# PTT Smokehouse Control — Build 1.5.0 Test Report

## Scope
Build 1.5.0 updates rib planning from cooked-pound-driven math to rack-driven math.

## Changes reviewed
- Added `cookedWeightEachLb`, `purchaseCostEach`, and `salesPriceEach` to `Protein`.
- Updated rib defaults:
  - Purchase cost each: $10/rack
  - Raw weight each: 3.3 lb/rack
  - Cooked weight each: 3.0 lb/rack
  - Yield: 90.9%
  - Sales price each: $33/rack
- Updated Settings page to expose the new protein fields.
- Updated forecast logic so ribs calculate rack demand using sales dollars divided by sales price per rack.
- Preserved prior-day leftover rack credits.

## Expected rib behavior
If rib sales allocation is $660 and sales price is $33/rack:
- Gross rack need before safety = 20 racks
- With 8% safety = 21.6 racks
- Gross forecast need = 22 racks
- If prior EOD leftover credit is 3 racks, load today = 19 racks

## Deployment compatibility
Uses existing Render build command with Prisma db push:
`corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build`

# Test Report — Build 6.3.3

## Confirmed

- No invalid `restaurantId: null` Prisma filters remain for `Protein`, `CookPlan`, or `EndOfDayLog` in seed or bootstrap code.
- Orphan checking uses SQL and covers all core tenant-owned tables.
- Package, navigation, health endpoints, and CI identify Build 6.3.3.
- No database migration was added.

## Environment limitation

The delivery sandbox does not include installed dependencies and cannot complete a full Next.js production build. GitHub Actions and Render will perform the complete dependency install and compile.

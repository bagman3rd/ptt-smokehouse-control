# Smokehouse Control — Build 6.7.2

Build 6.7.2 makes all four sealed/unopened meat quantities whole-unit counts.

## Changes

- Brisket, pork, chicken, and rib sealed/unopened fields use `step="1"` and numeric keyboard input.
- Browser submission rejects any decimal sealed/unopened count.
- Zod/API validation requires nonnegative integers.
- Server-side validation independently rejects fractional counts.
- Prisma stores `sealedUnopenedUnits` as an integer.
- Migration rounds any legacy fractional values before converting the column to INTEGER.
- Opened-meat quantities remain decimal pounds with 0.1-pound precision.

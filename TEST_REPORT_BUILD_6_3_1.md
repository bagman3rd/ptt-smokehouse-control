# Test Report — Build 6.3.1

## Defect reproduced
The Render build failed with Prisma TypeScript error: `configurationReviewedAt does not exist in type ProteinWhereInput`.

## Correction verified
- `Protein` query now filters only by `restaurantId` and `active`.
- `Smoker` query still requires `configurationReviewedAt: { not: null }`.
- No other non-Smoker query references `configurationReviewedAt`.
- Package and visible build labels updated to 6.3.1.

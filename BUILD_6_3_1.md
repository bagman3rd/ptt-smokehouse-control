# Build 6.3.1 — Capacity Preview Compile Fix

Build 6.3.1 fixes a TypeScript/Prisma query defect in the cook-plan capacity preview API. The previous release incorrectly applied `configurationReviewedAt` to `ProteinWhereInput`; that field belongs only to `Smoker`.

Changes:
- Removed the invalid `configurationReviewedAt` filter from `prisma.protein.findMany`.
- Preserved the reviewed-smoker filter on `prisma.smoker.findMany`.
- Updated visible build, health endpoints, CI label, and package version to 6.3.1.
- No database migration or production-data changes.

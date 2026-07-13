# Test Report — Build 7.0.1

## Static release checks

- Package version and visible build identifiers are 7.0.1.
- Fresh-client generator explicitly targets `prisma/schema.prisma`.
- Generator removes `node_modules/.prisma/client` before regeneration.
- Verifier uses Prisma runtime metadata instead of declaration-file text matching.
- Verifier checks all POS models and the `prisma.posConnection` delegate.
- Render build retains migration deployment and migration smoke checks.
- Build 6.7.1 integer sealed-inventory behavior remains present.
- Top-10 POS provider implementation remains present.

A full dependency-backed Next.js compile must run in Render because this packaging environment does not contain installed npm dependencies.

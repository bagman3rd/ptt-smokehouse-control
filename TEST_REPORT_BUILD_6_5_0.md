# Test Report — Build 6.5.0

Static validation covers:

- Real committed pnpm lockfile and frozen-install configuration
- Preservation of both original and renumbered migration aliases
- Byte-identical compatibility SQL
- Absence of automatic `_prisma_migrations` rewriting
- Fresh migration replay configuration
- Post-migration schema smoke checks
- PostgreSQL dump-and-restore drill configuration and evidence artifact
- 50-session authenticated load smoke test
- Manual-invoice billing mode and policy documentation
- Active script count below 30
- Current build labels and health endpoints

CI is the authoritative environment for the full PostgreSQL replay, restore drill, production build, Playwright suite, and load smoke.

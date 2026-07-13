# Build 9.8.0 Test Report

## Locally verified
- package version and active build metadata
- repaired tenant-guard coverage contract
- current staging/release documentation contract
- behavioral Archer identity contract
- generated interaction manifest freshness
- CI workflow contract
- exact-green-commit release workflow contract
- YAML parse and flat ZIP structure

## Mandatory GitHub checks
The exact commit must complete dependency installation, Prisma generation, fresh migration replay, seed all four roles, TypeScript, lint, production build, the complete Playwright directory on desktop/mobile, PostgreSQL restore drill, schema drift, tenant/concurrency tests, and dependency audit. The audited ZIP cannot be produced unless that workflow concludes successfully.

# Test Report — Build 6.1.0

## Static evaluation
- Version and workflow naming: PASS
- Production auto-seed removal: PASS
- Migration timestamp uniqueness: PASS
- Migration-history reconciliation script present: PASS
- Stable operational codes and labels: PASS
- Database constraints migration present: PASS
- Protein identity code migration and seed values: PASS
- Playwright configuration and core workflow tests: PASS
- Flat ZIP packaging: PASS

## Environment limitation
The sandbox cannot reach the npm registry, so dependency installation, Prisma generation, the Next.js production build, and actual Playwright execution could not be completed here. GitHub Actions is configured to execute those checks against PostgreSQL 16 after upload.

## Lockfile status
A trustworthy pnpm lockfile cannot be fabricated without resolving the dependency graph against the registry. The release standardizes all commands on pnpm and exact direct dependency versions, but CI currently uses `--no-frozen-lockfile` until a real `pnpm-lock.yaml` is generated and committed by a registry-connected environment.

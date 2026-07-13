# Test Report — Build 7.4.0

## Recovery tests

- Verified all 31 clean-baseline page routes exist.
- Verified all operational, insight, administration, and help navigation links remain present.
- Verified legacy/case-variant Admin, Owner, Manager, and Crew role mappings.
- Verified unknown roles fail closed to Kitchen Crew.
- Verified Quick EOD carryover source rules and exact E2E test coverage.
- Verified unsupported Prisma delegates are rejected by the regression scan.
- Verified migration history and Build 7.2 remediation migration remain present.

## Local limitations

Full dependency installation, Prisma generation, TypeScript compilation, PostgreSQL migration replay, production build, browser execution, restore drill, and load smoke are executed by GitHub Actions when the source is pushed.

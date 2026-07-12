# Test Report — Build 6.0.0

## Passed static and regression checks

- Package version and visible version references updated to 6.0.0.
- Overnight-only smokers are eligible for brisket and pork but not ribs or chicken.
- Same-day-only smokers are eligible for ribs and chicken but not brisket or pork.
- All day / flexible smokers can support either cook cycle.
- Backup / overflow smokers remain eligible but rank after primary equipment.
- Not currently active smokers are excluded from scheduling and eligible-capacity totals.
- Oversized protein loads split across multiple eligible smokers.
- Warning text reports total eligible capacity and exact unassigned shortfall.
- Schedule, Today, and print views display per-smoker allocation summaries.
- Build 6.0.0 evaluation script passes.

## Environment limitation

The source ZIP does not include installed dependencies. A full Next.js production build requires dependency installation during deployment. The included Render build command performs Prisma generation, migrations, seeding, and the Next.js build.

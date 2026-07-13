# Test Report — Build 7.3.0

## Result

Local static and source-level regression tests pass. Full database/browser execution is configured for GitHub Actions.

## Defects corrected

1. Invalid Playwright `getByDisplayValue` API usage.
2. Carryover test that previously inspected source only instead of executing the workflow.
3. Weak visible-value assertions for prior EOD credits.

## New exact workflow

The Playwright test now:

1. Logs in.
2. Opens the Quick EOD page for 2031-07-13.
3. Enters eight values: sealed/opened brisket 4/1.5, pork 3/2.5, chicken 5/3.5, ribs 2/4.5.
4. Submits the report through the UI.
5. Verifies PostgreSQL saved all eight values.
6. Verifies usable carryover is brisket 0, pork 3, chicken 5, ribs 2.
7. Generates the 2031-07-14 cook plan through the UI.
8. Verifies the exact four credits in the rendered cook plan.
9. Verifies the exact four credits in `CookPlanItem` rows.

## Local limitation

The container could not reach the npm registry, so Prisma generation, TypeScript compilation, Next.js build, PostgreSQL replay, and Playwright execution must run in GitHub Actions.

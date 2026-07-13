# PTT Smokehouse Control — Build 7.5.0

Build 7.5.0 is a full recovery release rebuilt from the last clean application baseline, Build 7.0.1.

## Build 7.5.0 navigation reliability fix

The top navigation no longer depends on React hydration. Operations, Insights, Admin, and Help use native browser dropdown controls, so they remain usable even when a client-side bundle fails or is stale. Today, Logout, and restaurant switching remain ordinary links/forms.


## Recovery objective

This release restores the complete application while retaining only verified later fixes. It does not use Build 7.2.3 or Build 7.3.0 as the source baseline.

## Preserved application areas

All 31 clean-baseline page routes are present, including Today, Dashboard, Cook Plan, End of Day, Sales, Reports, Learning, Forecast Proof, Settings, Billing, Support, Help, Account Security, restaurant setup, POS import, smokers, smoker catalog, smoker schedule, users, audit, data, system health, demo, tour, signup, login, privacy, and terms.

## Key corrections retained

- Quick EOD sealed pork, chicken, and ribs reduce the next day's cook load.
- Sealed brisket and all opened-meat pounds remain recorded but do not reduce the next load.
- Legacy protein names are recognized by the EOD API.
- Invalid and negative EOD values are rejected.
- Concurrent EOD protein rows use transactional upserts and database uniqueness protection.
- Unknown roles fail closed, while valid legacy and case-variant roles such as `admin`, `Administrator`, `manager`, and `crew` are normalized correctly.
- Password and 2FA changes rotate sessions correctly.
- Unsupported legacy Prisma delegates are blocked by regression testing.
- The July 13 to July 14 carryover path has exact database-backed browser assertions in CI.

## Deployment

Replace the repository contents with the complete extracted Build 7.5.0 tree. Do not merge only selected files into an older working directory. Commit deletions as well as additions so stale files cannot remain in GitHub.

Normal deployment uses frozen pnpm dependencies, Prisma migrations, migration smoke checks, a production Next.js build, desktop/mobile Playwright tests, restore testing, and load smoke testing.

## Build 7.5.0 reliability notes

The Prisma tenant guard is enforced in production, development, and CI. Only controlled maintenance scripts may bypass it with `DISABLE_TENANT_GUARD=1`. CI runs the kitchen tenant-contract tests against both the compiled production server and `next dev`, preventing production-mode tests from masking missing tenant scope in Prisma writes.

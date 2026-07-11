# PTT Smokehouse Control — Build 2.5.0

Private BBQ production-control app for Pigeon Toed Tavern. Build 2.5.0 adds report-building and CSV export functionality so saved operating data can be queried, exported, and used for management review.

## Current purpose

The app helps answer:

- What should we load/cook today?
- Which proteins are for same-day service versus next-day service?
- What usable leftovers from the exact prior EOD log should reduce today’s load?
- Did we overcook, undercook, waste too much, or 86 items?
- What forecast settings should we consider adjusting based on accumulated operating data?
- What happened last week, last month, or during a custom date range by protein/day/date?

## Build 2.5.0 changes

- Rebuilt the Reports page as a flexible **Report Builder**.
- Added reporting by source:
  - End-of-Day Logs
  - Cook Plans
- Added report metrics:
  - Waste lb
  - Sold cooked lb
  - Usable leftover units
  - Usable leftover lb
  - 86 events
  - Smoked meat sales
  - Total sales
  - Loaded / approved units
  - Recommended cook units
  - Forecast cook units
- Added grouping by:
  - Date
  - Day of week
  - Protein
  - Date + protein
  - Day of week + protein
- Added date ranges:
  - Last 30 days
  - This week
  - Last week
  - This month
  - Last month
  - Custom start/end dates
- Added protein filter.
- Added aggregate CSV export for the current report.
- Added raw EOD protein-log CSV export.
- Added raw cook-plan-item CSV export.
- Added protected `/api/reports/export` endpoint.
- Updated package/app badge to Build 2.5.0.

## Example reports now supported

- Waste last month by day of week
- Briskets loaded last week
- Ribs 86 events by protein
- Pulled pork leftover units by date
- Smoked meat sales last month
- Cook-plan recommended units versus loaded units by date

## Render build command

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## Render start command

```bash
npm run start
```

## Required environment variables

```text
DATABASE_URL
ADMIN_PASSWORD
APP_SESSION_TOKEN
NEXT_PUBLIC_APP_NAME
NODE_VERSION=20.18.1
```

## Commercial-readiness notes

Build 2.5.0 improves data retrieval and management reporting, but the app still needs multi-restaurant architecture, real user accounts/roles, audit logs, saved named reports, and POS imports before it should be sold externally.

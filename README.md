# PTT Smokehouse Control — Build 2.0.0

Private consultant dashboard for Pigeon Toed Tavern smoked-meat production planning.

## Current operating model

- Total restaurant sales include bar sales.
- Default bar sales assumption: 20% of total sales.
- Food sales assumption: 80% of total sales.
- Smoked meats: 50% of food sales.
- Therefore active scenarios default to smoked meats = 40% of total restaurant sales.

## Active forecast scenarios

- Base $6M
- Aggressive $8M

Rod Run and other event spikes are modeled with the Event Multiplier field, not a separate forecast scenario.

## Protein load units

- Brisket: briskets
- Pulled Pork: butts
- Ribs: racks
- Pulled Chicken: boneless skinless chicken breasts

## Timing logic

The Cook Plan date is the load/production date.

- Brisket uses the next day's service forecast and is cooked 9 AM–9 PM, then held overnight.
- Pulled Pork uses the next day's service forecast and is loaded at 5 PM for next-day service.
- Ribs use the same-day service forecast.
- Pulled Chicken uses the same-day service forecast.

## Leftover-credit logic

Cook Plan leftover credits come from the exact prior calendar day's End-of-Day log only.

Examples:

- Load plan 2026-07-12 uses EOD 2026-07-11 only.
- Load plan 2026-08-15 uses EOD 2026-08-14 only.

If the exact prior EOD log is missing, the cook-plan credit cell shows:

`no data, check hot box`

## Build 2.0.0 changes

- Fixed Settings page JSX compile failure by fully rewriting `app/settings/page.tsx`.
- Updated app version and navigation badge to Build 2.0.0.
- Added `scripts/build-2-evaluation.mjs` for dependency-free evaluation checks.
- Added `TEST_REPORT_BUILD_2_0_0.md` with use cases, test results, and recommended next improvements.
- Aligned legacy server-action cook-plan generation with exact prior-day EOD lookup.

## Render build command

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## Render start command

```bash
npm run start
```

## Required Render environment variables

- DATABASE_URL
- ADMIN_PASSWORD
- APP_SESSION_TOKEN
- NEXT_PUBLIC_APP_NAME
- NODE_VERSION

Set `NODE_VERSION` to `20.18.1`.

Remove these if present:

- NEXTAUTH_SECRET
- NEXTAUTH_URL
- PORT

## Local evaluation command

```bash
node scripts/build-2-evaluation.mjs
```

This script does not require database access or external packages. It checks critical source-level behavior and forecast math assumptions.

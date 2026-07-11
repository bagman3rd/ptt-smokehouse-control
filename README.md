# PTT Smokehouse Control — Build 2.7.1

Private BBQ production-control app for Pigeon Toed Tavern. Build 2.7.1 is a role-access and deployment-stability patch on top of the reporting, learning, CSV export, and backup features added in Builds 2.3.0–2.5.0.

## Current purpose

The app helps answer:

- What should we load/cook today?
- Which proteins are for same-day service versus next-day service?
- What usable leftovers from the exact prior EOD log should reduce today’s load?
- Did we overcook, undercook, waste too much, or 86 items?
- What forecast settings should we consider adjusting based on accumulated operating data?
- What happened last week, last month, or during a custom date range by protein/day/date?

## Build 2.7.1 changes

### Authentication and resource-abuse hardening

- Moved `requireAuth()` to the first executable line of these protected page functions:
  - Dashboard
  - Cook Plan
  - End of Day
  - Reports
  - Learning
  - Settings
- This prevents unauthenticated users from triggering full page-level database queries by directly requesting URLs.
- Protected server actions with `requireAuth()`:
  - Approve cook plan
  - Update scenarios
  - Update proteins
  - Update day multipliers
  - Update month multipliers
  - Delete future test plans

### Password handling

- Removed the silent `ADMIN_PASSWORD || "admin"` fallback.
- Removed the `APP_SESSION_TOKEN || "dev-token"` fallback.
- `ADMIN_PASSWORD` and `APP_SESSION_TOKEN` are now required and must each be at least 12 characters.
- Added constant-time comparison for password and session-token validation using SHA-256 digest comparison with `timingSafeEqual`.
- Login page now shows a configuration error if required auth environment variables are missing or too short.

### Migration readiness

- Added `prisma:migrate` and `migration:status` scripts.
- Render still uses the existing safe MVP deploy path for the current already-pushed database. Before live customer data, baseline the current database and move Render from `prisma db push` to `prisma migrate deploy` only.
- Do **not** use `--accept-data-loss`; it remains removed.

## Existing major functionality preserved

- Daily load-plan generation.
- Pork/brisket prior-day logic.
- Ribs/chicken same-day logic.
- Exact prior-day EOD leftover lookup.
- EOD statuses: Draft, Complete, Manager Reviewed, Locked.
- Learning page that compares forecast/load plans against completed EOD logs.
- Report Builder with saved reports, chart view, CSV exports, raw exports, report-run history, and full JSON backup export.
- Settings bootstrap does not overwrite user-edited assumptions.

## Example reports supported

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
ADMIN_PASSWORD          # required, minimum 12 characters; no default
APP_SESSION_TOKEN       # required, minimum 12 characters; no default
NEXT_PUBLIC_APP_NAME
NODE_VERSION=20.18.1
```

## Commercial-readiness notes

Build 2.7.1 closes the worst private-MVP auth gaps, but the app still needs these before selling externally:

1. Individual user accounts with password hashes, reset flow, invitations, and role-based access.
2. Multi-restaurant architecture with `restaurantId` on all operational tables.
3. Full audit log for settings edits, EOD locks, cook-plan approvals, report exports, and learning recommendation decisions.
4. Migration baseline and tracked Prisma migrations before real customer data.
5. Forecast recommendation approval workflow: Learning → Review → Accept / Reject → Update Settings → Audit Log.
6. POS import so the app learns from actual item sales instead of only EOD summaries.

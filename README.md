# PTT Smokehouse Control — Build 2.3.0

Private BBQ production-control app for Pigeon Toed Tavern. Build 2.3.0 adds the first learning/recommendation layer so the app can compare cook-plan forecasts against completed End-of-Day logs and recommend future forecast adjustments.

## Current purpose

The app helps answer:

- What should we load/cook today?
- Which proteins are for same-day service versus next-day service?
- What usable leftovers from the exact prior EOD log should reduce today’s load?
- Did we overcook, undercook, waste too much, or 86 items?
- What forecast settings should we consider adjusting based on accumulated operating data?

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

## Build 2.3.0 changes

- Added **Learning** navigation/page.
- Added protein-level forecast-vs-actual recommendations.
- Added day-of-week forecast learning recommendations.
- Learning logic matches EOD logs back to the correct cook plan by protein timing:
  - brisket and pork compare against the prior-day load plan
  - ribs and chicken compare against the same-day load plan
- Added API-level authentication checks for cook-plan, EOD save, and prior-EOD status endpoints.
- Added data-quality indicators so the app only recommends adjustments after enough matched data exists.
- Updated package/app badge to Build 2.3.0.

## What the learning page does not do yet

Build 2.3.0 recommends adjustments but does not automatically change Settings. That is intentional. The next commercial-grade step is an approval workflow where Archer/admin reviews a recommendation, accepts it, and the app writes the change to Settings with an audit log.

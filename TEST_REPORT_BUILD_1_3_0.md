# PTT Smokehouse Control — Build 1.3.0 Test Report

## Primary fix
Replaced the Generate Plan server-action form with a client-side button that calls `/api/cook-plan`. This provides visible success/failure feedback, avoids silent server-action failures, prevents double-submit conflicts, and refreshes the latest plan after a successful response.

## Tested use cases by static route/form review
- Scenario dropdown renders from `ForecastScenario` records.
- Generate Plan posts JSON to `/api/cook-plan`.
- Missing/stale scenario falls back to the first valid scenario.
- Seed data is ensured before generation.
- Same-date regeneration deletes and recreates the existing plan in a transaction.
- API returns visible JSON error instead of silent failure.
- Button disables while pending.
- Page refreshes after successful generation.

## Render command remains
`corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build`

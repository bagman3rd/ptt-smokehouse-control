# Test Report — Build 1.3.4

## Scope

Build 1.3.4 updates protein yield assumptions and adds selectable day-of-week sales pattern profiles to the cook-plan forecast flow.

## Changes verified by code review

- Pulled Chicken default cooked yield updated from 58% to 75%.
- Pulled Pork default cooked yield updated from 50% to 55%.
- Ribs default cooked yield updated from 72% to 90%.
- Default Tourist day distribution updated to 9/8/10/12/17/25/19.
- Day Pattern profiles added:
  - Default Tourist
  - Summer
  - Shoulder Season
  - Rod Run / Event
- Cook Plan form sends `dayPatternKey` to `/api/cook-plan`.
- API uses the selected day pattern multiplier instead of the legacy single day multiplier table.
- ROD RUN scenario infers Rod Run / Event if no day pattern key is passed.
- Settings displays all day-pattern profiles and keeps legacy day multipliers under a collapsed details panel.

## Forecast multiplier checks

Because the forecast starts from annual sales / 365, weekly share percentages are converted to daily multipliers by:

`multiplier = weekly_share_percent / 100 * 7`

Examples:

- Default Tourist Saturday: 25% × 7 = 1.75
- Default Tourist Tuesday: 8% × 7 = 0.56
- Rod Run / Event Saturday: 32% × 7 = 2.24
- Rod Run / Event Monday: 5% × 7 = 0.35

## Render notes

No migration folder was reintroduced. Render remains on `prisma db push --accept-data-loss` through `pnpm run render-build`.

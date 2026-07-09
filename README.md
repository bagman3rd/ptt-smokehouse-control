# PTT Smokehouse Control — Build 1.3.7

Build 1.3.7 adds day-of-week display to date labels and makes next-day load planning clearly subtract usable leftover cook units from the next cook plan.

## Major changes

### Date display

Where dates are displayed in the app, the 3-letter day of week is now shown beside the date.

Examples:

```text
2026-07-09 Thu
2026-07-10 Fri
```

Updated areas include:

- Daily Cook Plan latest plan
- Dashboard latest forecast card
- End-of-Day latest saved log
- Reports recent daily logs
- Cook Plan create form helper text

### Leftover cook-unit credit

The End-of-Day page now has a separate field:

```text
Usable Leftover Units
```

This is the field that subtracts directly from the next day's recommended load.

Example:

```text
7/9 End of Day: Pulled Chicken usable leftover units = 6
7/10 Cook Plan forecast need = 28 chicken
7/10 Load today = 22 chicken
```

The Cook Plan page now displays three separate numbers for every protein:

| Field | Meaning |
|---|---|
| Forecast need | Total units needed before leftover credit |
| Leftover credit | Usable leftover units from the prior EOD log |
| Load today | New units to cook/load today after leftover credit |

### Database changes

Added fields:

- `CookPlanItem.forecastCookUnits`
- `CookPlanItem.usableLeftoverUnits`
- `EndOfDayProteinLog.usableLeftoverUnits`

Render deploy still uses `prisma db push --accept-data-loss` through the existing `render-build` script, so the deployed database should update automatically.

## Render deploy settings

Use this exact Render Build Command:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

Start Command:

```bash
npm run start
```

Required environment variables:

```text
DATABASE_URL
ADMIN_PASSWORD
APP_SESSION_TOKEN
NEXT_PUBLIC_APP_NAME
NODE_VERSION
```

Recommended:

```text
NODE_VERSION=20.18.1
NEXT_PUBLIC_APP_NAME=PTT Smokehouse Control
```

## Test case for this build

1. Open End of Day.
2. Enter service date `2026-07-09`.
3. For Pulled Chicken, enter `6` in **Usable Leftover Units**.
4. Save End-of-Day Log.
5. Open Cook Plan.
6. Generate a plan for `2026-07-10`.
7. Pulled Chicken should show:
   - Forecast need: original needed units
   - Leftover credit: 6 chicken
   - Load today: forecast need minus 6

Same logic applies to pork butts and ribs when entered as usable leftover units.

## Build 1.4.1

Production timing update:

- Brisket is now shown as prior-day production: cook 9:00 AM–9:00 PM, hold overnight, serve next day.
- Pulled pork is now shown as prior-day production: load butts at 5:00 PM for next-day service.
- Ribs and pulled chicken are now shown as same-day production.
- Cook Plan page now includes a Production Timing Summary with service date, prior production date, and same-day production date.
- Leftover credit is applied to brisket and pork only for next-day production planning; ribs and chicken leftovers remain tracked in EOD but do not drive the next-day load calculation.
- Build badge updated to Build 1.4.1.


## Build 1.4.1

- Fixed End-of-Day save persistence by replacing nested upsert with explicit transaction: create/update parent log, delete old protein rows, create fresh protein rows.
- End-of-Day now reloads the saved service date and pre-populates saved amounts back into the form.
- Cook plan now applies prior EOD usable leftover credits to brisket, pulled pork, ribs, and pulled chicken.
- Cook plan keeps timing clarity: brisket and pork are prior-day production; ribs and chicken are same-day production, but all four proteins can receive leftover credits.
- Added clearer saved log display showing cooked units, sold pounds, leftover units/pounds, waste, and 86 status.


## Build 1.4.2

Build 1.4.2 fixes the production-date delay logic for brisket and pulled pork.

- The selected Cook Plan date is now treated as the load/production date.
- Brisket and pulled pork forecast loads use the next day's service estimate.
- Ribs and pulled chicken forecast loads use the same day's service estimate.
- The Cook Plan page now explicitly explains: load today for tomorrow vs load today for today.
- Example: a Sunday load plan uses Monday estimates for brisket and pork, while using Sunday estimates for ribs and chicken.

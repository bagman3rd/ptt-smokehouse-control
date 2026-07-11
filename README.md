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


## Build 1.4.4

Build 1.4.4 fixes EOD-to-Cook-Plan leftover credit visibility and fallback behavior. If a user enters cooked units with sold/waste left at zero and leaves usable leftover units blank, the app treats those cooked units as usable leftovers so the next cook plan receives the expected credit. Cook Plan notes now show the exact EOD log date used for leftover credit.


## Build 1.4.4

Build 1.4.4 removes ROD RUN as an active forecast scenario. Active forecast scenarios are now only Base $6M and Aggressive $8M. Rod Run and other surge days should be modeled with the Event Multiplier input. Existing deployed databases are self-cleaned: ROD RUN, Event Day, and Conservative $6M are renamed to legacy scenarios and excluded from active dropdowns and settings.


## Build 1.4.8

Build 1.4.8 fixes dashboard date selection. The dashboard no longer sorts plans by farthest future service date, which could make an accidental 2027 test plan look current. It now shows only operational plans in the rolling current window from yesterday through the next 14 days, ordered by creation time. If an out-of-window future plan exists, the dashboard displays a warning instead of treating it as the current cook recommendation.

## Build 1.4.8

Build 1.4.8 updates the forecast model to prevent smoked-meat loads from being overstated. Total restaurant sales now include bar sales. The default model assumes 20% bar sales, leaving 80% food sales, and smoked meats represent 50% of food sales. Therefore, active forecast scenarios now use 40% of total restaurant sales as smoked-meat sales.

- Base $6M smoked-meat share changed from 55% to 40%.
- Aggressive $8M smoked-meat share changed from 58% to 40%.
- Forecast labels were clarified from BBQ Forecast/BBQ Sales to Smoked Meat Forecast/Smoked Meat Sales where appropriate.
- Settings now labels the scenario field as Smoked Meat % of Total Sales.
- Existing deployed databases self-update through seed/bootstrap on deployment.


## Build 1.4.8

Build 1.4.8 fixes prior EOD leftover-credit date matching. A generated load plan now pulls leftover credits only from the exact prior calendar day's EOD log. For example, a 2026-07-12 load plan uses only the 2026-07-11 EOD log; a 2026-08-15 load plan uses only the 2026-08-14 EOD log. If that exact prior EOD log or protein row is missing, the Cook Plan and Dashboard display `no data, check hot box` instead of silently using zero or an older log.

## Build 1.4.8

Build 1.4.8 adds a Last 10 End-of-Day Logs section beneath Saved Log Displayed on the End-of-Day page. This makes it easier to confirm which recent EOD logs exist and whether the exact prior-day leftover credit source is available before generating a cook plan.


## Build 1.4.9

Build 1.4.9 moves Avg $/Cooked lb from the forecast-scenario level to the protein level. Defaults: Brisket $40/lb, Pulled Pork $22/lb, Pulled Chicken $22/lb, Ribs $12/lb. These values are editable on Settings under Protein Assumptions and are used directly in the cook-plan forecast math.

## Build 1.5.1

Build 1.5.0 converts ribs to rack-based forecasting instead of cooked-pound forecasting. Rib defaults are now: $10 purchase cost per rack, 3.3 lb raw per rack, 3.0 lb cooked per rack, 90.9% cooked yield, and $33 sales price per rack. The cook/load plan calculates rib rack demand as rib sales dollars divided by sales price per rack, then subtracts prior-day usable leftover racks. Settings now expose cooked weight each, purchase cost each, and sales price each so rib assumptions can be edited without code changes.


## Build 1.5.1

- Changed Pulled Chicken defaults to a breast-based load model.
- Default chicken breast assumption: 2.5 lb raw, 75% yield, 1.875 lb cooked.
- Cook Plan now displays Pulled Chicken load units as breasts.
- Settings labels now clarify per-breast values for chicken.


## Build 1.5.1

Build 1.5.1 changes Pulled Chicken to a breast-based load model. Default assumptions: 1 boneless skinless chicken breast = 2.5 raw lb, 75% cooked yield, and 1.875 cooked lb per breast. Cook Plan, Dashboard, and End-of-Day now display Pulled Chicken units as breasts, and Settings exposes raw/cooked weight per breast so the assumption can be changed without code changes.

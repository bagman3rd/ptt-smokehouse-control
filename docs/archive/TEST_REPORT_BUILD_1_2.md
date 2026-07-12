# PTT Smokehouse Control — Build 1.2 Test Report

## Test context

Build 1.2 was reviewed against the deployed Render workflow and the current source package. Local full Next.js build could not be completed in this isolated environment because Prisma attempts to download engine binaries from `binaries.prisma.sh`, and external network access is unavailable here. Static code review, route review, forecast calculation checks, form/action review, and deployment-specific redirect checks were completed.

## Build 1.2 fixes made

1. Fixed Render logout redirect so it no longer redirects to Render's internal `localhost:10000` host.
2. Added input clamping/validation on numeric server actions to prevent negative sales, negative waste, invalid yields, or unrealistic multipliers from corrupting the model.
3. Added editable day-of-week multipliers in Settings.
4. Added editable month/seasonality multipliers in Settings.
5. Added Build 1.2 badge in the navigation bar.
6. Confirmed deployment environment should use `DATABASE_URL`, `ADMIN_PASSWORD`, `APP_SESSION_TOKEN`, and `NEXT_PUBLIC_APP_NAME` only.

## Use case tests

### Use case 1 — Login and bad-password handling

**Steps**
1. Open `/login`.
2. Submit an incorrect password.
3. Submit the correct `ADMIN_PASSWORD`.

**Expected result**
- Incorrect password redirects back to `/login?error=1` and shows invalid-password message.
- Correct password sets `ptt_session` cookie and redirects to `/dashboard`.

**Status**: PASS by route review. Prior Render `localhost:10000` login redirect was already fixed in the login route.

### Use case 2 — Logout

**Steps**
1. Log in.
2. Click `Logout` in the navigation bar.

**Expected result**
- Session cookie clears.
- Browser returns to `https://ptt-smokehouse-control.onrender.com/login`.
- Browser should not redirect to `localhost:10000`.

**Status**: FIXED in Build 1.2 and PASS by route review.

### Use case 3 — Create daily cook plan

**Steps**
1. Go to `Cook Plan`.
2. Pick service date.
3. Select scenario from dropdown: Conservative $6M, Base $6M, Aggressive $8M, or Event Day.
4. Enter event multiplier.
5. Click `Generate Plan`.

**Expected result**
- A draft cook plan is created or updated for that service date.
- Forecast uses annual sales, day multiplier, month multiplier, event multiplier, smoked meat sales %, protein mix, leftover credit, safety factor, yield, and min/max cook units.
- Latest plan displays recommended cook units for brisket, pulled pork, ribs, and pulled chicken.

**Status**: PASS by action/form review and forecast math check.

### Use case 4 — Approve or override cook plan

**Steps**
1. Generate a cook plan.
2. Change one approved cook unit value.
3. Add override reason.
4. Click `Approve Cook Plan`.

**Expected result**
- Approved cook units save by protein.
- Override reason saves by protein.
- Cook plan status changes to `APPROVED`.
- Dashboard uses approved cook units when available.

**Status**: PASS by action/form review.

### Use case 5 — End-of-day log

**Steps**
1. Go to `End of Day`.
2. Enter total sales and smoked meat sales.
3. Enter cooked units, sold cooked pounds, usable leftover pounds, waste pounds for each protein.
4. Choose a waste reason from dropdown.
5. Check 86 box for one protein.
6. Click `Save End-of-Day Log`.

**Expected result**
- End-of-day log upserts by service date.
- Protein results replace prior values for the same service date.
- Latest saved log displays sold, leftover, waste, and 86 status.
- Reports and dashboard revalidate.

**Status**: PASS by action/form/dropdown review.

### Use case 6 — Leftover credit affects next cook plan

**Steps**
1. Save an end-of-day log with usable leftover brisket/pork/ribs/chicken.
2. Create a future-date cook plan.

**Expected result**
- Most recent prior end-of-day usable leftovers are subtracted from the forecast cooked-pound need before safety factor.
- Cook units decrease when leftover credit exists.

**Status**: PASS by forecast action review.

### Use case 7 — Settings: forecast scenario editing

**Steps**
1. Go to `Settings`.
2. Edit annual sales, smoked meat sales %, safety %, protein mix %, or average $/cooked lb.
3. Click `Save Scenario`.
4. Generate a new cook plan.

**Expected result**
- Scenario values save.
- New cook plan uses revised assumptions.

**Status**: PASS by action/form review.

### Use case 8 — Settings: protein assumption editing

**Steps**
1. Go to `Settings`.
2. Edit raw weight, cooked yield, sandwich oz, plate oz, min/max cook units, max reuse hours, reusable leftover flag.
3. Click `Save Protein`.
4. Generate a new cook plan.

**Expected result**
- Protein values save.
- Forecast calculations use revised yield, raw weight, and min/max cook unit limits.

**Status**: PASS by action/form review.

### Use case 9 — Settings: day/month multiplier editing

**Steps**
1. Go to `Settings`.
2. Edit a day multiplier.
3. Edit a month multiplier.
4. Generate a new plan for that day/month.

**Expected result**
- New Build 1.2 day/month forms save multiplier values.
- Forecast uses updated values.

**Status**: NEW in Build 1.2, PASS by action/form review.

### Use case 10 — Reports

**Steps**
1. Save one or more end-of-day logs.
2. Go to `Reports`.

**Expected result**
- 30-day smoked meat sales, BBQ mix, waste vs sold pounds, 86 count, and recent daily logs display.

**Status**: PASS by query/render review.

## Button and dropdown review

| Page | Control | Status |
|---|---|---|
| Login | Login button | PASS |
| Nav | Dashboard link | PASS |
| Nav | Cook Plan link | PASS |
| Nav | End of Day link | PASS |
| Nav | Reports link | PASS |
| Nav | Settings link | PASS |
| Nav | Logout button | FIXED/PASS |
| Cook Plan | Scenario dropdown | PASS |
| Cook Plan | Generate Plan button | PASS |
| Cook Plan | Approve Cook Plan button | PASS |
| End of Day | Waste Reason dropdown | PASS |
| End of Day | 86 checkbox | PASS |
| End of Day | Save End-of-Day Log button | PASS |
| Settings | Save Scenario buttons | PASS |
| Settings | Save Protein buttons | PASS |
| Settings | Reusable leftover checkbox | PASS |
| Settings | Day multiplier Save buttons | NEW/PASS |
| Settings | Month multiplier Save buttons | NEW/PASS |

## Forecast sanity check

Example: Base $6M, Saturday multiplier 1.35, July multiplier 1.28, no event multiplier.

- Forecast sales: approximately $28,405
- smoked meat sales at 55%: approximately $15,623
- Brisket at 30% mix and $31 per cooked lb: approximately 151 cooked lb before safety
- With 8% safety: approximately 163 cooked lb
- At 50% yield and 13 lb raw briskets: approximately 26 briskets

Status: PASS. This matches expected BBQ load logic.

## Remaining recommendations

1. Add true role-based users when Randy/KM/pitmaster access opens.
2. Add smoker-specific capacity objects for Ole Hickory EL-EDX and Southern Pride SPK-700 instead of using only protein max cook units.
3. Add lunch/dinner split after the first real operating data comes in.
4. Add a daily operating checklist: load, wrap, pull, rest, hold, slice, log.
5. Add export to CSV for weekly Randy/KM review.
6. Add a simple actual-vs-recommended accuracy score after at least two weeks of logs.
7. Add Pigeon Forge event presets for Rod Run, Jeep Invasion, spring break, fall break, holiday weekends, and severe rain days.

## Deployment note

Environment variables should be exactly:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `APP_SESSION_TOKEN`
- `NEXT_PUBLIC_APP_NAME`

Remove old/unused values such as `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and `PORT`.

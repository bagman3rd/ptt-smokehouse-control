# PTT Smokehouse Control — Build 2.0.0 Evaluation and Test Report

## Scope

Build 2.0.0 is a stabilization and evaluation release. The goal was to review the app end-to-end, create operating use cases, test the critical logic paths, identify bugs, and package fixes.

A full live browser test against the Render app was not possible from this sandbox because the deployed app, database, and Render account are outside this runtime. I performed source-level route review, static UI review, database-flow review, and dependency-free forecast-math tests using `scripts/build-2-evaluation.mjs`.

## Fixes made in Build 2.0.0

1. Rewrote `app/settings/page.tsx` to fix the repeated Render compile failure: `Unexpected token Shell. Expected jsx identifier`.
2. Updated package version and app badge to `Build 2.0.0`.
3. Added dependency-free evaluation script: `scripts/build-2-evaluation.mjs`.
4. Added this test report.
5. Aligned the legacy server-action cook-plan code with the API behavior: leftover lookup is exact prior calendar day only.

## Test use cases

### Use Case 1 — Render build should compile the Settings page

**Steps reviewed**

- Inspect `app/settings/page.tsx`.
- Replace fragile JSX with a clean, explicit Shell wrapper.
- Confirm the page contains the forecast, protein, day pattern, and month multiplier sections.

**Expected**

- Render no longer fails at `/app/settings/page.tsx`.
- Settings page renders with editable assumptions.

**Result**

PASS by source review. Full Render build must be confirmed after deploy.

---

### Use Case 2 — Scenario dropdown excludes legacy scenarios

**Steps reviewed**

- Inspect `activeScenarioWhere()`.
- Inspect seed/bootstrap normalization.

**Expected**

Only these forecast scenarios are active:

- Base $6M
- Aggressive $8M

ROD RUN is not active; event surges use the Event Multiplier field.

**Result**

PASS by source review.

---

### Use Case 3 — Generate cook plan uses correct production timing

**Example**

If the load plan date is Sunday:

- Brisket uses Monday forecast.
- Pulled Pork uses Monday forecast.
- Ribs use Sunday forecast.
- Pulled Chicken uses Sunday forecast.

**Expected**

The Cook Plan page clearly distinguishes:

- Load today for tomorrow: brisket and pork.
- Load today for today: ribs and chicken.

**Result**

PASS by route/page review.

---

### Use Case 4 — Exact prior EOD leftover lookup only

**Example**

- Generate plan for 2026-07-12.
- Prior EOD leftover credit source must be 2026-07-11 only.
- If 2026-07-11 is missing, do not use 2026-07-10 or any older log.

**Expected**

The app displays `no data, check hot box` when the exact prior EOD log is missing.

**Result**

PASS by route review. `app/api/cook-plan/route.ts` uses `priorEodDate = addUtcDays(loadDate, -1)` and `exactEodFor(priorEodDate)`.

---

### Use Case 5 — Ribs are rack-based

**Inputs**

- 1 rack cost: $10.
- 1 rack raw weight: 3.3 lb.
- 1 rack cooked weight: 3.0 lb.
- 1 rack sales price: $33.

**Expected**

The app calculates rib demand as racks, not pounds:

`rib sales dollars / $33 per rack = gross rack need`

Then subtracts leftover racks.

**Result**

PASS by evaluation script.

---

### Use Case 6 — Pulled Chicken is breast-based

**Inputs**

- 1 boneless skinless breast: 2.5 raw lb.
- Cooked yield: 75%.
- Cooked weight per breast: 1.875 lb.
- Sales value: $22 per cooked lb.

**Expected**

The app displays and calculates chicken as breasts to load, not pounds.

**Result**

PASS by evaluation script and UI source review.

---

### Use Case 7 — Leftover credits subtract from gross load

**Example**

If gross chicken forecast is 69 breasts and prior EOD leftover is 6 breasts, load recommendation should be 63 breasts.

**Expected**

Forecast need > recommended load by the exact usable leftover units.

**Result**

PASS by evaluation script.

---

### Use Case 8 — Last 10 EOD logs visible

**Expected**

The End-of-Day page includes a Last 10 End-of-Day Logs section under the saved log display.

**Result**

PASS by source review.

---

### Use Case 9 — Dashboard ignores far-future test plans

**Expected**

Dashboard should not show accidental 2027 plans as the current forecast. It should only treat plans from yesterday through the next 14 days as operational.

**Result**

PASS by source review.

---

### Use Case 10 — Settings allow changing protein-level assumptions

**Expected**

Settings exposes editable protein values:

- Raw weight per unit.
- Cooked weight per unit.
- Yield %.
- Avg sales $ / cooked lb.
- Purchase cost each.
- Sales price each.
- Min/max cook units.
- Max reuse hours.

**Result**

PASS by source review.

## Evaluation script results

The dependency-free script `scripts/build-2-evaluation.mjs` was run successfully and passed these checks:

- package version is Build 2.0.0.
- nav badge says Build 2.0.0.
- Settings page contains Shell wrapper and protein-level pricing fields.
- Cook Plan API uses exact prior EOD lookup.
- Missing prior EOD warning exists.
- Ribs use rack model.
- Chicken displays as breasts.
- Last 10 EOD logs section exists.
- Sample July Saturday $6M forecast math is consistent.
- Smoked meat forecast is 40% of total sales.
- Ribs subtract leftover racks.
- Chicken subtracts leftover breasts.

## Open recommendations for Build 2.1+

1. Add an Admin Test Console page with one-click seeded examples: prior EOD, next-day cook plan, Rod Run multiplier, and missing prior EOD.
2. Add an audit table for every generated plan showing the input assumptions used at generation time.
3. Add warning if protein mix percentages do not total 100%.
4. Add warning if min/max cook units clamp the forecast.
5. Add editable bar-sales %, food-sales %, and smoked-meat-of-food-sales assumptions instead of only using the derived 40% smoked-meat percent.
6. Add CSV export for last 30 EOD logs and cook plans.
7. Add per-protein gross-margin reporting using purchase cost each and sales price each.
8. Add role-specific views before opening KM/pitmaster access.
9. Add a real automated Playwright test suite once the app is stable on Render.
10. Replace `prisma db push --accept-data-loss` with migrations before the app holds real production data.

## Deployment note

Use the same Render build command:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

Commit message:

```text
Build 2.0.0 evaluation and stabilization
```

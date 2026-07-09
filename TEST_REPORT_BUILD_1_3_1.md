# PTT Smokehouse Control — Test Report Build 1.3.1

## Purpose
Fix case where Generate Plan returns success but meat numbers appear unchanged.

## Root cause addressed
The page relied on `router.refresh()` and a latest-plan query that could continue showing stale server-rendered output or the wrong plan after repeated regeneration. Build 1.3.1 forces the browser to navigate to the newly-created plan ID and forces the cook-plan page to run dynamically with no cache.

## Changes
- API now returns `redirectUrl` with exact `cookPlanId`.
- Cook Plan page accepts `planId` query parameter and loads that exact plan.
- Cook Plan page uses `dynamic = 'force-dynamic'`, `revalidate = 0`, and `noStore()`.
- Latest Plan now orders by `createdAt`, not service date.
- Generate Plan uses `window.location.assign()` to force a clean navigation to the new plan.
- API response includes returned meat numbers for debug visibility.
- Page now displays generation notes and created timestamp.

## Use cases to retest
1. Generate Base $6M at event multiplier 1.0.
2. Generate Aggressive $8M for the same date; meat numbers should increase.
3. Generate Event Day for the same date; meat numbers should change.
4. Generate Base $6M with multiplier 2.0; meat numbers should increase.
5. Generate same scenario with multiplier 0.5; meat numbers should decrease but not below min units.
6. Generate tomorrow's date; URL should include new planId and page should show new plan.

## Expected result
Meat numbers visibly change after scenario/date/event multiplier changes, subject to min/max cook-unit clamps.

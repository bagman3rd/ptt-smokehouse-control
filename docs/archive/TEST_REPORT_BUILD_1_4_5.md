# PTT Smokehouse Control — Build 1.4.6 Test Report

## Fix

Build 1.4.6 fixes the dashboard date bug where an accidental far-future cook plan, such as a 2027 test date, could appear as the Latest Forecast because the dashboard previously sorted plans by serviceDate descending.

## Expected behavior

- Dashboard only displays operational cook plans from yesterday through the next 14 days.
- Dashboard orders current plans by createdAt descending.
- Far-future test plans are ignored on the dashboard.
- If only a far-future plan exists, the dashboard shows a warning and prompts the user to generate a current cook plan.
- Cook Plan page still allows direct review of a selected planId.

## Manual test cases

1. Create a plan for today. Dashboard shows today.
2. Create a plan for tomorrow. Dashboard shows the newest current plan.
3. Create a plan for 2027. Dashboard does not switch to 2027.
4. Remove all current-window plans, leaving only a 2027 plan. Dashboard shows no current operational plan plus a future-test-plan warning.
5. Confirm active forecast scenarios remain Base $6M and Aggressive $8M only.

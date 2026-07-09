# PTT Smokehouse Control — Build 1.2.9 Test Report

## Primary fix
The Generate Plan action was made idempotent and more defensive:

- It now self-seeds default data before generation.
- It validates that a scenario exists and falls back to the first scenario if the posted scenario ID is stale.
- It validates that active proteins exist before calculating loads.
- It replaces the prior nested upsert/deleteMany flow with an explicit transaction: delete any existing cook plan for the selected service date, then create a fresh plan and items.
- It adds a pending/disabled state to the Generate Plan button so repeated clicks do not fire overlapping server actions.

## Tested use cases by code review

1. Generate a plan for today with Base $6M.
2. Generate again for the same date repeatedly.
3. Generate for a future date.
4. Generate after changing scenario selection.
5. Generate with event multiplier 1.5.
6. Generate after a stale scenario ID or empty database seed issue.
7. Prevent double-submit overlap while the server action is pending.

## Expected outcome
The Generate Plan button should consistently create or replace the cook plan for the selected date and show the latest generated plan without silently stopping.

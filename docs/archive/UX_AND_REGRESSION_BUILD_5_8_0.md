# Build 5.8.0 — UX and Regression Cleanup

## Smoker catalog corrections

Build 5.8.0 changes the catalog from "capacity value only" to "official capacity with unit discipline."

Rules:

1. No estimated smoker capacities.
2. Count fields load only when the manufacturer publishes the same count unit used by the planner.
3. Pound capacities are reference text, not unit counts.
4. Brisket ranges are reference text, not exact counts.
5. Whole-chicken and half-chicken capacities are reference text, not chicken-breast capacity.
6. Blank means the manufacturer did not publish a directly usable planning count.

## UX cleanup

- Top navigation is grouped into dropdowns.
- Old build-number explanatory copy was removed from user-facing pages.
- Smoker catalog page now has a capacity-rules box.
- Verbose source notes are hidden from catalog tables.
- Cook plan notes were shortened.
- Table/card readability improved.

## User point-of-view recommendations included

- Keep Today as the primary button.
- Put management/admin items behind dropdowns.
- Do not show manufacturer research notes to kitchen users.
- Use official capacity text as reference and planning counts as separate fields.
- Keep blank capacity fields visible so managers know what still needs manual verification.

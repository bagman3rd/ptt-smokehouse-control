# PTT Smokehouse Control — Build 11.5.0

## Today Operations and Quick EOD

Build 11.5.0 converts an approved production plan into a role-aware daily execution workflow and closes the operating date through guided Quick EOD.

## Exit gate

An inexperienced user completes a full operating day in deployed UAT.

## Implemented

1. One Today board model with operating date, day of week, weather/event notes, forecast summary and urgent actions.
2. Load cards with product, quantity, unit, smoker, planned times, actual times, status, owner and next action.
3. Canonical status flow:
   - Planned
   - Ready
   - Loaded
   - Cooking
   - Resting
   - Holding
   - Ready for service
   - Completed
   - Cancelled
   - Exception
4. Named task ownership.
5. Actual load quantity and time-stamped execution.
6. Material quantity-variance reason control.
7. Exception opening and manager resolution.
8. Audited load-status correction.
9. Operational notes, including recovered transient-failure notes.
10. Urgent actions for missed load start, service-readiness risk, active exception, incomplete EOD and overdue close.
11. Guided EOD for sealed whole units and opened cooked pounds.
12. Plausibility validation against completed production.
13. Append-only manager EOD correction.
14. Close gates for terminal loads, complete EOD and resolved exceptions.
15. Duplicate-command protection.
16. Consecutive operating-day rollover.
17. Product-specific carryover output, including sealed brisket exclusion.
18. Contingency snapshot with plan, status, notes, exceptions and EOD state.
19. Ten deterministic acceptance scenarios.
20. Twenty-six deployed UAT scenarios.
21. Full-day event, load, EOD, board and rollover evidence.
22. Interactive Today Operations Validation Lab.
23. Dedicated GitHub Actions evidence workflow.
24. Cumulative retention of Builds 11.1.0 through 11.4.0.
25. Render build identity updated to 11.5.0.

## Generated route

`/today-lab-1150`

The route is isolated and does not replace an existing production Today page.

## Scope boundary

This overlay contains no Prisma migration, dependency change or durable database-write claim. It proves deterministic operating-day rules and supplies deployed UAT evidence controls. Build 11.6.0 remains responsible for expanded inventory, waste, quality holds and exception ownership.

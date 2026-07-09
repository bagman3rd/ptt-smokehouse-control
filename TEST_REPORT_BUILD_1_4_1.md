# PTT Smokehouse Control — Build 1.4.1 Test Report

## Purpose

Build 1.4.1 fixes End-of-Day leftover saving and restores leftover-credit planning for ribs and pulled chicken.

## Tests reviewed

- End-of-Day API now saves via an explicit Prisma transaction instead of nested upsert.
- Saving the same service date replaces old protein rows and recreates rows with submitted values.
- End-of-Day redirect includes `serviceDate`, so the saved log is reloaded instead of showing an unrelated latest log.
- End-of-Day form pre-populates saved values for cooked units, sold cooked lb, usable leftover units, usable leftover lb, waste lb, waste reason, and 86.
- Cook Plan generation now passes prior EOD usable leftover units/lb into forecast math for brisket, pork, ribs, and pulled chicken.
- Cook Plan display now labels all credits as Prior EOD leftover credit while keeping production timing distinct.

## Expected operational behavior

If 2026-07-09 EOD has 6 pulled chicken usable leftover units, the 2026-07-10 cook plan will display gross forecast need, leftover credit of 6 chicken, and a reduced same-day chicken load. The same applies to ribs, pork butts, and briskets.

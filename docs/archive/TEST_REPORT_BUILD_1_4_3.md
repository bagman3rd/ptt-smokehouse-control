# PTT Smokehouse Control — Build 1.4.3 Test Report

## Focus
Fix perceived missing leftover credits from End-of-Day to Cook Plan.

## Changes tested by code review
- End-of-Day API saves explicit usable leftover units.
- If cooked units are entered while sold and waste are zero and usable leftover units are blank/zero, cooked units are treated as usable leftover units as a safety fallback.
- Cook Plan item notes show the exact EOD log date used as the leftover source.
- Cook Plan continues to apply leftover credits to brisket, pork, ribs, and chicken.
- UI labels now clarify that Usable Leftover Units are what credit the next plan.

## Test case
1. Save EOD 2026-07-10 with Pulled Pork cooked units = 3, sold = 0, waste = 0, usable leftover units blank/0.
2. Saved log should display Pulled Pork leftover 3 butts.
3. Generate the next applicable Cook Plan.
4. Cook Plan should show Prior EOD Leftover Credit = 3 butts and reduce the load by 3.

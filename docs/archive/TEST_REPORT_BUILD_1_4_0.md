# PTT Smokehouse Control — Build 1.4.0 Test Report

## Scope
Build 1.4.0 updates the cook-plan logic to reflect actual BBQ production timing.

## Tested / reviewed use cases

| Use Case | Expected Result | Status |
|---|---|---|
| Generate plan for Friday service | Brisket and pork show Thursday prior-day production | Pass |
| Brisket timing | Shows 9:00 AM–9:00 PM cook and overnight hold | Pass |
| Pork timing | Shows 5:00 PM butt load for next-day service | Pass |
| Ribs timing | Shows same-day cook/load for service date | Pass |
| Chicken timing | Shows same-day cook/load for service date | Pass |
| Prior-day leftovers | Brisket and pork leftovers reduce next service-day load | Pass |
| Chicken leftovers | Tracked in EOD but not used for next-day load credit | Pass |
| Rib leftovers | Tracked in EOD but not used for next-day load credit | Pass |
| Date display | Service and production dates include 3-letter day of week | Pass |

## Notes
This is an operational-logic change. No schema migration was required because timing details are stored in CookPlanItem notes and existing leftover fields are reused.

# PTT Smokehouse Control — Test Report Build 1.3.6

## Scope

Build 1.3.6 tests date day-of-week display and next-day load reduction from usable leftover cook units.

## Use cases tested by static code review

| Use Case | Expected Result | Status |
|---|---|---|
| Display cook-plan date | Shows YYYY-MM-DD plus 3-letter day | Pass |
| Display dashboard latest forecast date | Shows YYYY-MM-DD plus 3-letter day | Pass |
| Display latest EOD log date | Shows YYYY-MM-DD plus 3-letter day | Pass |
| Display reports date | Shows YYYY-MM-DD plus 3-letter day | Pass |
| Cook Plan service-date selector helper | Shows selected date plus 3-letter day | Pass |
| Enter leftover chicken units on EOD | Saves to `usableLeftoverUnits` | Pass |
| Generate following-day cook plan | Pulls latest prior EOD log | Pass |
| Subtract leftover units | Forecast units minus leftover units becomes load units | Pass |
| Display forecast/load split | Cook Plan shows Forecast need / Leftover credit / Load today | Pass |
| Prisma schema update | Adds unit-credit fields via db push | Pass |

## Notes

The existing `usableLeftoverLb` field remains available for weight tracking. The new `usableLeftoverUnits` field is the direct cook-load credit field for operational planning.

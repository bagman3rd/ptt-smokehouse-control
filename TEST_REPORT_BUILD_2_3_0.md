# PTT Smokehouse Control — Build 2.3.0 Test Report

## Scope

Build 2.3.0 adds the first learning/recommendation layer and protects operational API routes.

## Use cases reviewed

| Use Case | Expected Result | Result |
|---|---|---:|
| Learning page loads | `/learning` renders inside authenticated Shell | Pass by static review |
| Protein forecast learning | Compares completed EOD logs to matching cook plans by protein timing | Pass by static review |
| Brisket/pork learning | Uses prior-day load plan for next-day service proteins | Pass |
| Ribs/chicken learning | Uses same-day cook plan for same-day proteins | Pass |
| Missing data | Displays need-more-history recommendation when sample count < 3 | Pass |
| Waste trend | Recommends safety/mix review when waste exceeds 10% | Pass |
| Sellout trend | Recommends raising forecast/safety when 86 events recur | Pass |
| Day-of-week learning | Compares actual sales to forecast sales for matching service dates | Pass |
| API auth | `/api/cook-plan`, `/api/end-of-day`, and `/api/eod-status` reject unauthenticated calls | Pass by static review |
| Settings persistence | Build 2.2.0 non-overwrite seed behavior preserved | Pass |

## Notes

The sandbox environment cannot perform a full Render-equivalent Next.js production build because npm/pnpm dependencies are not installed here. The build package is structured for Render using the existing Build 2.x build command.

## Recommendation

Build 2.4.0 should add an approval workflow for learning recommendations:

1. Recommendation generated.
2. Admin reviews and accepts/rejects.
3. Accepted recommendation writes to Settings.
4. Change is recorded in an audit log.

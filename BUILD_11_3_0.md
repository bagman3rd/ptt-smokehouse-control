# PTT Smokehouse Control — Build 11.3.0

## Forecast and Demand

Build 11.3.0 implements the Master Plan’s Forecast and Demand stage.

## Exit gate

Known test scenarios reproduce expected demand calculations.

## Implemented

1. Deterministic, browser-safe forecast engine with controlled calculation version.
2. Approved day-of-week distribution: 9/8/10/12/17/25/19.
3. Configurable monthly seasonality factor.
4. Event uplift/reduction with certainty evidence.
5. Reason-coded manual adjustment.
6. Automatic-factor guardrail review.
7. Confidence score, badge, warnings and explanation.
8. Four core product demand lines in canonical forecast units.
9. Optional sales display with 20% bar and 80% food allocation.
10. Immutable approval-record payload preserving inputs, outputs, confidence, reason, actor and timestamp.
11. Eight known calculation fixtures plus invalid-input and approval tests.
12. Interactive Admin Forecast Validation Lab.
13. Forecast capability map, source evidence, scenario results, UAT workbook and hash manifest.
14. Dedicated GitHub Actions evidence workflow.
15. Cumulative retention of Builds 11.1.0 and 11.2.0 controls.
16. Render build identity updated to 11.3.0.

## Scope boundary

Build 11.3.0 forecasts demand. Raw-to-cooked conversion, carryover application, operational rounding, smoker capacity and load scheduling remain Build 11.4.0 responsibilities.

## Data safety

No Prisma migration, dependency change or production-record mutation is included. The validation lab does not claim durable approval persistence. Existing production forecast workflows must pass the included deployed UAT before release approval.

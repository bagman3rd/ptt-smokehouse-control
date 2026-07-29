# PTT Smokehouse Control — Build 11.4.0

## Production Planning and Smoker Scheduling

Build 11.4.0 converts approved demand into carryover-adjusted production requirements, raw quantities, whole operational units and non-overlapping smoker batches.

## Exit gate

A seven-day plan can be generated without impossible loads or unexplained negative quantities.

## Implemented

1. Prior-day-only carryover application.
2. Sealed/open inventory conversion by product.
3. Brisket sealed-carryover exclusion.
4. Cooked-to-raw conversion using configured effective-dated yields.
5. Whole-unit rounding with visible overage.
6. Nonnegative production guardrails.
7. Product-specific overnight and same-day windows.
8. Exclusive smoker booking and multiple-cycle scheduling.
9. Primary-before-backup allocation.
10. Explicit missing-capacity and insufficient-window shortfalls.
11. Monday service demand scheduled on the preceding Sunday where required.
12. Controlled calculation and approval-record versions.
13. Eight deterministic fixtures and invalid-input tests.
14. Seven-day evidence generation.
15. Interactive Production Planning Validation Lab.
16. Production capability, scenario, UAT and hash evidence.
17. Dedicated GitHub Actions workflow.
18. Cumulative retention of Builds 11.1.0 through 11.3.0.
19. Render build identity updated to 11.4.0.

## Approved versus validation-only data

Approved PTT smoker capacities currently cover pork and brisket for the Ole Hickory EL-ED/X and Southern Pride SPK-700. Rib, chicken and mixed-load capacities remain unvalidated. Fixture and validation-lab values for those capacities are explicitly marked validation-only and must not be treated as production truth.

Brisket and pork average raw unit weights, pork duration, rib duration and chicken duration also require measured, approved configuration before production acceptance.

## Scope boundary

No Prisma migration, dependency change or production-record persistence is included. The validation lab copies approval JSON but does not create a durable approved plan. The deployed application workflow must pass the included UAT before release approval.

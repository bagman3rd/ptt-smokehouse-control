# PTT Smokehouse Control — Build 11.7.0

## Reporting and Forecast Learning

Build 11.7.0 implements the Master Plan reporting stage. It reconciles daily and weekly operational reports to source transactions, explains every calculation, and produces bounded forecast recommendations that require human approval.

## Exit gate

Daily and weekly reports reconcile to source transactions, expose every calculation, and produce only bounded human-approved recommendations.

## Implemented

1. Daily operations report.
2. Weekly management report.
3. Deterministic source lineage and source hashes.
4. Forecast cooked-pound variance.
5. Daily forecast accuracy.
6. Weekly WAPE-based forecast accuracy.
7. Planned-versus-actual production variance.
8. Actual yield from raw input and cooked output.
9. Waste rate.
10. Ending inventory rate.
11. Inventory-equation reconciliation.
12. Explicit unexplained-difference blocking.
13. Missing-source blocking.
14. Load-window plan adherence.
15. Smoker capacity-minute utilization.
16. Over-capacity source blocking.
17. Formula glossary embedded in reports and exports.
18. CSV and JSON exports.
19. Deterministic export content.
20. Four-observation minimum for learning.
21. Seven-observation high-confidence threshold.
22. Recency-weighted learning evidence.
23. Recommendation factor bounded from 0.85 through 1.15.
24. Incomplete or unreconciled observations excluded from learning.
25. Human approval required.
26. Automatic application prohibited.
27. Approval record preserving recommendation snapshot and source evidence.
28. Role control for recommendation approval.
29. Tenant/location isolation controls.
30. Fourteen deterministic scenarios.
31. Thirty deployed UAT scenarios.
32. Interactive Reporting and Learning Validation Lab.
33. Daily, weekly, lineage, recommendation, approval, export, readiness, and hash evidence.
34. Dedicated GitHub Actions workflow.
35. Cumulative retention of Builds 11.1.0 through 11.6.0.
36. Render build identity updated to 11.7.0.

## Generated route

`/reports-lab-1170`

The route is isolated and does not replace an existing production report page.

## Scope boundary

No Prisma migration, dependency change, durable report persistence, autonomous forecast change, or external notification delivery is included. Build 11.8.0 remains responsible for notifications and administration.

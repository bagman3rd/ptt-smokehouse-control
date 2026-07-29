# PTT Smokehouse Control — Build 11.6.0

## Inventory, Waste, Quality Holds, and Exception Ownership

Build 11.6.0 adds the cooked-inventory reconciliation layer that follows Today Operations and Quick EOD.

## Exit gate

A complete operating-day inventory reconciliation closes with no negative quantity, unexplained blocking variance, unowned critical exception, or unresolved blocking quality hold.

## Implemented

1. Append-only cooked-inventory ledger.
2. Four core product balances: brisket, pork, ribs, and pulled chicken.
3. Production receipts linked to load references.
4. Measured service-usage transactions.
5. Reason-coded waste.
6. Negative-inventory prevention.
7. Quality-hold lifecycle:
   - Open
   - Release
   - Discard
8. Separate available, held, and total on-hand quantities.
9. Waste generated from discarded held product.
10. P0–P3 inventory exceptions.
11. Named exception owner, acknowledgement, due time, and resolution.
12. Urgent actions for open holds, unowned exceptions, critical exceptions, negative balance, and count variance.
13. Final physical counts for available and held cooked pounds.
14. Variance classification:
   - Acceptable: up to 3%
   - Warning: over 3% through 10%
   - Blocking: over 10%
15. Append-only count correction.
16. Manager inventory adjustment with reason.
17. Transfer-out and transfer-in records using a transfer ID.
18. Duplicate-command protection.
19. Server-control contract for role and tenant isolation.
20. Close gates requiring:
   - Four final product counts
   - No negative balance
   - No unresolved blocking variance
   - No open blocking quality hold
   - No open P0/P1 exception
   - An owner for every open exception
21. Inventory contingency snapshot.
22. Twelve deterministic scenarios.
23. Thirty deployed UAT scenarios.
24. Interactive Inventory Control Validation Lab.
25. Full ledger, balance, hold, exception, count, readiness, and hash evidence.
26. Dedicated GitHub Actions workflow.
27. Cumulative retention of Builds 11.1.0 through 11.5.0.
28. Render build identity updated to 11.6.0.

## Generated route

`/inventory-lab-1160`

The route is isolated and does not replace an existing production inventory page.

## Scope boundary

No Prisma migration, dependency change, supplier purchasing, raw-food perpetual inventory, or durable database-write claim is included. The overlay supplies deterministic rules, operational UI validation, and release evidence. Production persistence and endpoint integration must be proven in deployed UAT.

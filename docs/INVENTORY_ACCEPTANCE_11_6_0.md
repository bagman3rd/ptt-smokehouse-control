# Build 11.6.0 Acceptance

## Release gate

A full cooked-inventory reconciliation closes without negative inventory, unexplained blocking variance, unowned critical exception, or open blocking quality hold.

## Deterministic acceptance

- IC-001 through IC-012 pass.
- Four products reconcile.
- Ledger and event sequences are ordered.
- Command IDs are unique.
- Closed evidence has zero negative balance.
- Closed evidence has zero open blocking hold.
- Closed evidence has zero open P0/P1 exception.
- Inventory engine version is PTT_INVENTORY_CONTROL_11_6_0.

## Deployed acceptance

- IN-001 through IN-030 pass or have approved not-applicable rationale.
- Durable mutations are idempotent.
- Negative inventory is impossible.
- Waste requires reason.
- Hold lifecycle preserves original evidence.
- Critical exceptions require ownership and resolution.
- Count variance thresholds are correct.
- Adjustment and correction preserve prior evidence.
- Tenant isolation and role controls pass server-side.
- Tablet workflow has no hidden critical action.
- Core workflow survives external-provider outage.
- No P0/P1 defect remains.

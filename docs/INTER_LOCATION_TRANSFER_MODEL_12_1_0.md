# Inter-Location Transfer Model — Build 12.1.0

## Lifecycle

`DRAFT → APPROVED → IN_TRANSIT → RECEIVED`

A short receipt becomes `RECEIVED_WITH_VARIANCE`.

## Inventory timing

- Source available inventory decrements at dispatch.
- Destination available inventory increments at receipt.
- Over receipt is forbidden.
- Every dispatch and receipt requires a command ID.
- Repeating the same command ID creates no second event or inventory effect.

The transfer retains source, destination, reason, actor, approval, products, quantities, lot IDs, dispatch, receipt, variances, and command history.

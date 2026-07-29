# Cooked Inventory Model — Build 11.6.0

## Controlled quantity

The Build 11.6.0 ledger controls cooked pounds for brisket, pork, ribs, and pulled chicken.

Every product exposes:

- Opening cooked pounds
- Available cooked pounds
- Held cooked pounds
- Total on-hand cooked pounds
- Waste cooked pounds

`on hand = available + held`

## Ledger

The ledger is append-only. Each entry contains:

- Sequence
- Command ID
- Actor and role
- Timestamp
- Product
- Transaction type
- Available delta
- Held delta
- On-hand delta
- Reason
- Reference type and ID
- Note

Supported transaction types include production receipt, service usage, waste, transfer, adjustment, hold, release, and discard.

## Count reconciliation

A physical count separately records available and held cooked pounds.

`variance = observed total - expected on hand`

Classification:

- Acceptable: 0% through 3%
- Warning: over 3% through 10%
- Blocking: over 10%

A blocking variance requires a manager adjustment or corrected count before close.

## Close

The cooked-inventory day closes only after all four products are counted and all blocking conditions are cleared.

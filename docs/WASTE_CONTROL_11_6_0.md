# Waste Control — Build 11.6.0

## Required fields

- Product
- Cooked pounds
- Approved reason
- Actor
- Timestamp
- Command ID
- Optional reference and note

## Approved reasons

- Overproduction
- Trim or prep
- Quality failure
- Temperature control
- Contamination
- Drop or spill
- Expired hold
- Service error
- Other

`OTHER` requires an explanatory note.

## Controls

- Waste cannot exceed available cooked inventory.
- Waste immediately decreases available and on-hand inventory.
- Discarded quality-hold quantity decreases held and on-hand inventory.
- Original waste transactions are never edited or deleted.
- Correction uses a separate manager adjustment or additional compensating transaction.

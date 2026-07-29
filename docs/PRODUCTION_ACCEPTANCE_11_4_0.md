# Build 11.4.0 Production Acceptance

## Release gate

A seven-day production plan is generated without negative production, overlapping exclusive bookings, hidden shortfalls or unapproved capacity assumptions.

## Required acceptance

- PP-001 through PP-008 pass.
- PD-001 through PD-020 pass or have approved not-applicable rationale.
- Carryover is prior-day only.
- Sealed quantities are whole nonnegative units.
- Open quantities are nonnegative cooked pounds.
- Sealed brisket is never credited.
- Raw conversion uses effective-dated configured yields.
- Whole-unit rounding and overage are visible.
- Missing raw unit weight, duration or capacity blocks approval.
- Monday demand remains Monday demand even when the load begins Sunday.
- Seven consecutive operating dates generate explainable results.
- KM/OWNER authorization, KC/VIEWER restriction and tenant isolation pass server-side.
- Duplicate approval is idempotent.
- Historical approved plans remain unchanged after later configuration edits.
- No open P0/P1 defect remains.

# Sales Reconciliation — Build 12.2.0

A batch reconciles only when:

- Imported net sales match the official source total within one cent.
- Mapped, unmapped, and ignored amounts sum exactly to imported net sales.
- Actor is authorized to approve reconciliation.
- Approval retains actor, timestamp, reason, source hash, and differences.

A fully mapped reconciled batch can feed reporting. Forecast learning additionally requires zero unmapped and zero ignored demand amount.

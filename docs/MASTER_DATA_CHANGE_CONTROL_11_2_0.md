# Master Data Change Control — Build 11.2.0

## Controlled fields

Products, yields, units, portions, carryover eligibility, smoker capacities, smoker availability, cook windows, operating hours and role assignments affect production decisions and must be auditable.

## Required behavior

- Record actor, tenant, location, timestamp, reason and before/after values.
- Use effective dates for rules that affect calculations.
- Preserve the rule version used by every approved forecast and production plan.
- Prohibit silent edits to historical operational records.
- Require server-side authorization.
- Reject cross-tenant identifiers.
- Prevent duplicate submissions.
- Distinguish inactive records from deleted historical records.
- Mark unvalidated capacity as pending rather than guessing.

## Emergency correction

Production corrections must use approved application tooling, include a reason and retain audit history. Direct database work is reserved for an incident runbook with backup, approval, reconciliation and evidence; it is not a normal setup workflow.

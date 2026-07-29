# Build 11.5.0 Acceptance

## Release gate

An inexperienced user completes one full operating day in deployed staging without coaching, hidden controls or direct database work.

## Required deterministic acceptance

- TO-001 through TO-010 pass.
- Full-day evidence closes four loads and four EOD products.
- Append-only event sequence has no duplicate command ID.
- Rollover creates the next consecutive date.
- Sealed brisket eligible carryover is zero.

## Required deployed acceptance

- TD-001 through TD-026 pass or have written approved not-applicable rationale.
- All critical tablet actions remain visible and labeled.
- Actual quantities and timestamps persist.
- Invalid transitions are rejected.
- Duplicate clicks and retries are idempotent.
- Exceptions block close until resolved.
- Decimal sealed counts are rejected.
- Impossible EOD counts are rejected.
- Corrections preserve original values.
- Viewer and unauthorized roles cannot mutate.
- Tenant isolation passes.
- Core Today/EOD workflow survives disabled external providers.
- No open P0/P1 defect remains.

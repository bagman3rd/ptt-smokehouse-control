# Production Release Model — Build 12.0.0

Build 12.0.0 separates three concepts:

1. **Package status** — whether the release package and certification controls are complete.
2. **Evidence decision** — whether supplied evidence passes every controlled gate.
3. **Production authorization** — whether the release owner has reviewed real deployed evidence and explicitly authorized cutover.

A package may be complete and the controlled evidence may be GO while production authorization remains `PENDING_DEPLOYED_SIGN_OFF`.

## Authorization boundary

Deterministic fixtures, CI success, generated documents, and synthetic sign-offs cannot authorize production. The RELEASE_OWNER must review the deployed Git commit, Render revision, persistent data, UAT, security, performance, recovery, rollback, launch ownership, and defect register.

## Required workflows

Setup, Forecast, Production, Today, Quick EOD, Inventory, Reports, and Administration must each prove route integration, durable persistence, server authorization, tenant isolation, idempotency, auditability, UAT, and zero P0/P1 defects.

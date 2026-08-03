# Build 12.0.0 Acceptance

## Package acceptance

- PR-001 through PR-026 pass.
- Package status is COMPLETE.
- Controlled evidence decision is GO.
- Production authorization remains PENDING_DEPLOYED_SIGN_OFF.
- Pending manifest has no authorization ID.
- Authorization simulation is explicitly non-authoritative.
- Handoff secret leak count is zero.
- Render topology is one web, zero cron, one database.

## Production acceptance

- PD-001 through PD-048 pass.
- Synthetic evidence is replaced with deployed evidence.
- All eight workflows prove durable persistence and UAT.
- Role authorization and tenant isolation pass server-side.
- Security, performance, database, backup, restore, and rollback pass.
- Validation routes are disabled or ADMIN-only.
- All five sign-offs are complete.
- Open P0/P1 counts are zero.
- Evidence decision is GO.
- RELEASE_OWNER creates the production authorization record.
- Final manifest says AUTHORIZED.

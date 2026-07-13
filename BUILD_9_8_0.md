# Build 9.8.0 — Enforced Release Gate and Complete Interaction Inventory

Build 9.8.0 converts the Build 9.5.0 test recommendations into mandatory release controls.

## Included
- corrected tenant-guard, staging-readiness, and Archer identity CI contracts
- complete Playwright directory execution instead of a selected spec list
- mandatory PostgreSQL dump/restore drill
- generated source interaction manifest covering buttons, links, forms, selects, inputs, and textareas
- Admin, Owner, Kitchen Manager, and Kitchen Crew CI accounts
- route-by-route interaction inventory on desktop Chrome and Pixel 7
- release packaging triggered only by a successful CI workflow for the exact commit SHA
- `RELEASE_EVIDENCE.json` in the audited GitHub artifact

Local ZIP files remain source packages. Only the artifact produced by `.github/workflows/release.yml` is an audited production release.

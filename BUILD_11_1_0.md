# PTT Smokehouse Control — Build 11.1.0

## Production Baseline and Application Inventory

Build 11.1.0 converts the existing application into a measurable product baseline. It does not assume that a screen works merely because the source file exists. It inventories the repository, creates the role-by-route and live-screen audit workbooks, records static risk signals, and retains CI evidence tied to the exact Git revision.

## Baseline

- Application baseline: complete Build 11.0.4 repository plus the Build 11.0.5 infrastructure correction.
- Build identity: `11.1.0`.
- Database schema: unchanged.
- Dependencies: unchanged.
- Restaurant calculations: unchanged.
- Production workflows: preserved pending live verification.

## Implemented

1. Repository-wide route and screen inventory for the Next.js App Router and Pages Router.
2. API route and HTTP-method inventory.
3. Source-level interactive-control inventory.
4. Form and server-action inventory.
5. Static navigation-target inventory with route-resolution checks.
6. Role evidence extraction and a complete canonical role-by-route matrix.
7. Environment-variable, feature-flag, integration and cron inventory.
8. Prisma model and enum inventory.
9. Test-file inventory.
10. Screen-disposition register using controlled baseline preservation.
11. Live screen-audit workbook for every screen and canonical role.
12. Static findings register for duplicate routes, unresolved static links, controls without static accessible names, and missing detected loading/error boundaries.
13. SHA-256 evidence manifest.
14. Dedicated GitHub Actions workflow that uploads the evidence package.
15. Optional package.json/README update through `scripts/apply-build-11.1.0.mjs`.
16. Render build identity updated to `11.1.0`.

## Canonical roles

- ADMIN
- OWNER
- KM
- KC
- PITMASTER
- VIEWER

## Disposition policy

Every discovered screen begins as `KEEP` with status `PENDING_LIVE_ROLE_AUDIT`. This means the capability is preserved during the controlled re-baseline; it does not mean it passed UAT. Live audit evidence can change the final disposition to `REFACTOR`, `REPLACE`, or `REMOVE`.

## Generated evidence

Running the build installer produces `artifacts/build-11.1.0/` containing:

- application-inventory.json
- route-inventory.csv
- control-inventory.csv
- form-inventory.csv
- navigation-inventory.csv
- server-action-inventory.csv
- environment-inventory.csv
- feature-flag-inventory.csv
- integration-inventory.csv
- cron-inventory.csv
- prisma-inventory.csv
- test-inventory.csv
- screen-disposition-register.csv
- role-route-matrix.csv
- live-screen-audit-workbook.csv
- inventory-findings.csv
- inventory-summary.md
- inventory-hash-manifest.json

## Release limitation

Static inventory is not deployed-behavior proof. Build 11.1.0 is accepted only after the live screen audit, role matrix, production baseline record, screenshots, defects, and release evidence are complete for the exact deployed revision.

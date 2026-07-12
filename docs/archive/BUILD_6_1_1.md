# Build 6.1.1 — Production Migration Recovery

Build 6.1.1 corrects the production deployment failure in migration
`20260712000700_build_610_reliability_domain_codes`.

## Root cause

The original migration mapped known Cook Window labels but preserved unknown
legacy values. A production `SmokerCatalog` row contained a value outside the
new allowed code set, so PostgreSQL rejected the new check constraint with
error `23514`.

## Corrections

- Normalizes recognized labels and already-normalized codes.
- Maps every unknown smoker and catalog Cook Window to `FLEXIBLE` before the
  constraint is added.
- Maps unknown legacy smoker locations to `NULL`, which remains valid and can
  be corrected from the controlled dropdown.
- Preserves and normalizes valid protein codes.
- Recognizes pork-butt and chicken-breast naming variants.
- Automatically marks only the unfinished failed Build 6.1 migration attempt
  as rolled back before `prisma migrate deploy` retries it.
- Updates application and CI version labels to 6.1.1.

No manual database intervention should be required for the failed Render
migration shown in the deployment log.

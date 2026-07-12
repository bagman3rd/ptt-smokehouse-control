# Test Report — Build 6.1.1

## Static migration validation

Passed:

- All allowed Cook Window codes are preserved.
- All requested legacy labels are normalized.
- Unknown Cook Window values resolve to `FLEXIBLE` before constraints.
- Unknown location values resolve to `NULL` before constraints.
- Protein values resolve to an allowed code.
- Constraint definitions match the normalized code sets.
- Recovery script targets only an unfinished, non-rolled-back Build 6.1
  migration record.
- ZIP retains a flat project-root structure and includes `.github`.

## Environment limitation

A live PostgreSQL deployment and full Next.js build were not executed in this
sandbox because installed dependencies and external package access were not
available. GitHub Actions and Render will execute those checks after upload.

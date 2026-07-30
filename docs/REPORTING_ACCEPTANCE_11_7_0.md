# Build 11.7.0 Acceptance

## Release gate

Daily and weekly reports reconcile to source transactions, expose every calculation, and produce only bounded human-approved recommendations.

## Deterministic acceptance

- RL-001 through RL-014 pass.
- Four daily and four weekly product rows reconcile.
- Daily unexplained difference equals zero.
- Weekly unexplained difference equals zero.
- Weekly accuracy uses WAPE.
- Learning excludes incomplete and unreconciled observations.
- Recommendation factors remain between 0.85 and 1.15.
- No recommendation auto-applies.
- CSV and JSON exports include formulas and lineage.
- Same source produces the same report ID and export.
- Engine version is PTT_REPORTING_LEARNING_11_7_0.

## Deployed acceptance

- RP-001 through RP-030 pass or have approved not-applicable rationale.
- Report totals match the production database.
- Authorization and tenant isolation pass server-side.
- Standard daily and weekly reports complete within the Master Plan performance target.
- Exports reconcile to on-screen and source totals.
- Approval records are durable and immutable.
- No P0/P1 defect remains.

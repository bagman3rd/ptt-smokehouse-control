# Forecast Learning Model — Build 11.7.0

## Evidence eligibility

Only complete, reconciled observations matching the requested tenant, location, product, and day type are eligible.

## Minimum evidence

- Fewer than four observations: insufficient data
- Four through six observations: moderate confidence
- Seven or more observations: high confidence

## Calculation

The engine applies greater weight to more recent observations.

`learning factor = weighted actual service usage / weighted approved forecast`

The recommendation factor is bounded:

- Minimum: 0.85
- Maximum: 1.15

## Human control

A recommendation is advisory. It cannot automatically change master data, an approved forecast, or a future production plan.

ADMIN, OWNER, or KM may approve a recommendation. Approval preserves:

- Recommendation ID and version
- Product and day type
- Factor and adjustment percentage
- Confidence
- Observation count
- Every evidence row and source hash
- Approver, timestamp, reason, and effective date
- Full recommendation snapshot

An adjustment above 10% requires a written approval reason.

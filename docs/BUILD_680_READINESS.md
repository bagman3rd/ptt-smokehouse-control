# Build 6.8.0 Readiness Closure

Build 6.8.0 does not claim that source code can prove restaurant performance. It adds controls and evidence capture for the remaining gaps.

## Security

- Admin and Owner routes require TOTP in production.
- Every login creates a durable device session with last-seen time, IP, user agent, expiry, and revocation state.
- Users can revoke individual sessions or all other sessions.
- An external security review remains an operator-recorded gate; the application cannot self-certify penetration resistance.

## Operations evidence

System Health now records physical kitchen-device tests, live pilot forecast evidence, an operator-led restore rehearsal, and an external security review. A checklist entry is evidence only when notes identify who tested, where, when, and the measured result.

## Load characterization

CI now performs 200 concurrent authenticated requests distributed across Today, EOD, Cook Plan, and Reports. This is a regression threshold, not a full capacity model. Production sizing still requires a staged ramp test with realistic database volume and geographic latency.

## Reporting

Accounts with access to multiple restaurants receive a 30-day sales, EOD-day, and waste rollup on the Reports page.

## Migration history

Legacy duplicate migration aliases remain intentionally preserved for databases that may have recorded either folder name. Do not rename or delete those folders. `docs/MIGRATION_HISTORY.md` is the canonical compatibility explanation.

# Build 11.8.0 Acceptance

## Release gate

Critical operational events route exactly once to authorized recipients, respect quiet-hour and escalation controls, expose provider health without secrets, and generate a sanitized support bundle.

## Deterministic acceptance

- NA-001 through NA-016 pass.
- P0 has no deferred delivery.
- Duplicate event/recipient/channel creates no second delivery.
- Retry stops after four attempts.
- Dead-letter evidence remains available.
- Acknowledgement cancels future escalation.
- Provider states are explicit.
- Admin changes preserve before and after.
- Viewer and cross-tenant mutations fail.
- Support bundle contains no seeded secret value.
- Identical support input produces identical checksum.
- Engine version is PTT_NOTIFICATION_ADMIN_11_8_0.

## Deployed acceptance

- NT-001 through NT-030 pass or have approved not-applicable rationale.
- Provider sandbox delivery is reconciled to durable application records.
- Server authorization and tenant isolation pass.
- Support bundle is reviewed by security and operations.
- No P0/P1 defect remains.

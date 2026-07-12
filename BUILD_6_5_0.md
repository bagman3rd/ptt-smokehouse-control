# Build 6.5.0 — Reliability, Migration Preservation, and Pilot Evidence

Build 6.5.0 does not add restaurant features. It closes release-engineering and commercial-readiness gaps.

## Migration-history preservation

The three originally shipped duplicate-prefix migration names are restored alongside their renumbered aliases. Both names carry byte-identical, idempotent SQL. This supports databases that recorded either history without editing Prisma's private migration table. The automatic reconciliation script and repair command are removed.

## Executed restore evidence

CI now performs a PostgreSQL custom-format dump, restores it into an independent database, and verifies table count, completed migrations, and zero orphan core tenant rows. The evidence report is retained as a GitHub artifact for 30 days.

## Load smoke

CI runs 50 concurrent authenticated `/today` requests and fails on any non-200 response or excessive aggregate latency. This is a smoke threshold, not a substitute for production load testing.

## Billing decision

Founding customers use manual invoices by default. The UI no longer presents incomplete Stripe checkout as if lifecycle automation exists. Stripe mode must be explicitly enabled after webhook, dunning, lifecycle, and access-gating work is complete.

## External pilot gates

The repository now includes explicit checklists for live PTT forecast evidence, real-device kitchen testing, operator restore rehearsal, support escalation, and production ownership. These cannot honestly be marked complete by source-code changes.

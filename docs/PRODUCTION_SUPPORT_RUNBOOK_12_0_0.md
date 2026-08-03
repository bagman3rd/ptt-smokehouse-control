# Production Support Runbook — Build 12.0.0

## First response

1. Record time, user, role, tenant, route, workflow, operating date, request ID, and build identity.
2. Determine whether the incident affects security, data integrity, service availability, or one workflow.
3. Capture logs and the sanitized production handoff/support bundle.
4. Never request passwords, PINs, tokens, cookies, or secret values.
5. Assign an incident owner and severity.
6. Preserve evidence before corrective action.

## Escalation

- P0: immediate release owner and incident owner; evaluate rollback.
- P1: immediate operations and support owners; mitigation or rollback decision.
- P2: assigned owner with target correction build.
- P3: backlog with documented workaround.

## Core checks

Health, authentication, authorization, tenant context, database connectivity, migration status, workflow persistence, idempotency, recent errors, performance, and backup status.

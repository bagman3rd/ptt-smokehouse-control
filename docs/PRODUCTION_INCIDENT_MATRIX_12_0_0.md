# Production Incident Matrix — Build 12.0.0

| Severity | Definition | Initial response | Release action |
|---|---|---|---|
| P0 | Security breach, cross-tenant exposure, destructive data loss, or complete outage | Immediate | Rollback/containment unless explicitly unsafe |
| P1 | Critical workflow unavailable, persistent incorrect writes, authorization failure, or unreconciled production data | Immediate | HOLD and evaluate rollback |
| P2 | Material degradation with a safe workaround | Assigned promptly | Corrective patch |
| P3 | Minor defect or usability issue | Scheduled | Backlog |

Every unresolved incident must have an owner, timestamp, evidence, mitigation, and closure criteria.

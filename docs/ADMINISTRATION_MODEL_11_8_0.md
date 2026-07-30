# Administration Model — Build 11.8.0

## Audited settings

- Notification rules
- Recipient preferences
- Quiet hours
- Escalation policies
- Provider enablement
- Support-bundle retention

ADMIN, OWNER, and KM may change controlled settings. Viewer is read-only.

Every change retains audit version, tenant, location, setting name, before snapshot, after snapshot, actor, role, reason, timestamp, and audit ID. New settings affect subsequent operations; historical routing evidence is not rewritten.

## Provider diagnostics

Provider states are Healthy, Degraded, Unavailable, and Not Configured. Diagnostics may expose configuration presence, enablement, last success, last failure, and consecutive-failure count. They may never expose a secret value.

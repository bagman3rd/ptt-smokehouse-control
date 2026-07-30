# Hardening Role Matrix — Build 11.9.0

| Capability | ADMIN | OWNER | KM | PITMASTER | KC | VIEWER |
|---|---:|---:|---:|---:|---:|---:|
| View personal session status | Yes | Yes | Yes | Yes | Yes | Yes |
| Revoke own session | Yes | Yes | Yes | Yes | Yes | Yes |
| Revoke another user's session | Yes | Yes | Limited | No | No | No |
| View security diagnostics | Yes | Yes | Limited | No | No | No |
| View performance diagnostics | Yes | Yes | Yes | Limited | Limited | No |
| View database diagnostics | Yes | Yes | Limited | No | No | No |
| View recovery evidence | Yes | Yes | Limited | No | No | No |
| Generate sanitized support bundle | Yes | Yes | Limited | No | No | No |
| Execute release gate | Yes | Yes | Yes | No | No | No |
| Approve release | Yes | Owner-defined | No | No | No | No |
| Execute rollback | Authorized admin | Authorized owner | No | No | No | No |

Server-side authorization is mandatory.

# Notification and Administration Role Matrix — Build 11.8.0

| Capability | ADMIN | OWNER | KM | PITMASTER | KC | VIEWER |
|---|---:|---:|---:|---:|---:|---:|
| View own notifications | Yes | Yes | Yes | Yes | Yes | Yes |
| View provider health | Yes | Yes | Yes | Limited | Limited | No |
| View delivery/dead-letter diagnostics | Yes | Yes | Yes | No | No | No |
| Acknowledge assigned/visible incident | Yes | Yes | Yes | Yes | Yes | No |
| Resolve incident | Yes | Yes | Yes | No | No | No |
| Change notification rules | Yes | Yes | Yes | No | No | No |
| Change quiet hours/preferences | Yes | Yes | Yes | Own only | Own only | No |
| Change provider enablement | Yes | Yes | Yes | No | No | No |
| Generate support bundle | Yes | Yes | Yes | No | No | No |
| View administration audit | Yes | Yes | Yes | No | No | No |

The deployed application must enforce this matrix server-side.

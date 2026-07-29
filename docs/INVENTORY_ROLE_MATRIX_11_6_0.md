# Inventory Control Role Matrix — Build 11.6.0

| Capability | ADMIN | OWNER | KM | PITMASTER | KC | VIEWER |
|---|---:|---:|---:|---:|---:|---:|
| View inventory board | Yes | Yes | Yes | Yes | Yes | Yes |
| Receive production | Yes | Yes | Yes | Yes | No | No |
| Record service usage | Yes | Yes | Yes | No | Yes | No |
| Record waste | Yes | Yes | Yes | Yes | Yes | No |
| Open quality hold | Yes | Yes | Yes | Yes | Yes | No |
| Release/discard hold | Yes | Yes | Yes | No | No | No |
| Open exception | Yes | Yes | Yes | Yes | Yes | No |
| Assign exception | Yes | Yes | Yes | No | No | No |
| Acknowledge assigned exception | Yes | Yes | Yes | Yes | Yes | No |
| Resolve exception | Yes | Yes | Yes | No | No | No |
| Count inventory | Yes | Yes | Yes | No | Yes | No |
| Correct count | Yes | Yes | Yes | No | No | No |
| Adjust inventory | Yes | Yes | Yes | No | No | No |
| Transfer inventory | Yes | Yes | Yes | No | No | No |
| Close inventory day | Yes | Yes | Yes | No | No | No |

The deployed application must enforce this matrix server-side. Button visibility is not authorization.

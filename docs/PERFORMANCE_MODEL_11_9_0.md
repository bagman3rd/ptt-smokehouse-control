# Performance Model — Build 11.9.0

## Controlled budgets

| Metric | Budget |
|---|---:|
| API read p95 | 500 ms |
| Critical mutation p95 | 750 ms |
| Dashboard p95 | 2,000 ms |
| Database query p95 | 250 ms |
| Error rate | 1% maximum |
| Throughput | 50 requests/second minimum |
| Memory | 768 MB maximum |
| Event-loop lag p95 | 100 ms maximum |

## Load-test rules

- Execute against isolated staging, never production.
- Use the exact release commit and production-equivalent configuration.
- Exercise Today, Quick EOD, inventory, reports, administration, and health.
- Verify idempotency under retries.
- Capture p50, p95, p99, maximum, throughput, errors, memory, event-loop lag, query timing, and connection-pool utilization.
- Any failed budget blocks release.

## Database health

- Pool utilization at or below 80%
- At least four connections of headroom
- Active plus idle does not exceed pool maximum
- No controlled transaction above 5,000 ms
- Replication lag at or below five seconds
- Migration status CURRENT

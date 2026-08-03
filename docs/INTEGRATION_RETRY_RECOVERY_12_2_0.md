# Integration Retry and Recovery — Build 12.2.0

Retries preserve the original idempotency key. Successfully persisted line identities remain protected and cannot be inserted again.

Each failure records attempt count, error code, error message, last attempt, next retry, and protected line keys. After five attempts, automatic retry stops and manual escalation is required.

Partial recovery must prove that every source line exists exactly once after completion.

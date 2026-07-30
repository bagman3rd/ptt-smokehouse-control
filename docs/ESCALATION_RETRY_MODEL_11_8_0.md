# Escalation and Retry Model — Build 11.8.0

## Escalation schedules

- P0: 0, 5, and 15 minutes
- P1: 0, 15, and 45 minutes
- P2: 0 and 60 minutes
- P3: initial routing only

Acknowledgement cancels all future scheduled escalation. Resolution requires an authorized manager and written disposition.

## Delivery retries

The maximum attempt count is four. Controlled backoff is 1, 5, 15, and 60 minutes. A successful attempt clears retry state. A terminal provider response becomes failed-terminal. The fourth retryable failure becomes dead-lettered.

## Dead letter

A dead-letter record preserves delivery ID, event ID, recipient, channel, attempt count, failure reason, and timestamp. The failed delivery is never deleted.

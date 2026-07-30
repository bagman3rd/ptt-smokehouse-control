# Notification Model — Build 11.8.0

## Channels

- In-app
- Email
- SMS

## Routing inputs

Every event includes tenant, location, event ID, event type, P0–P3 severity, timestamp, local clock, title, and message.

Rules select event types, minimum severity, recipient roles, channels, and P1 quiet-hour behavior. Recipients must be active, belong to the tenant, have a matching role, and enable the channel.

## Idempotency

`tenant:event:recipient:channel` is the delivery idempotency key. The same key creates one delivery only. Repeated routing is explicitly recorded as suppressed rather than silently duplicated.

## Quiet hours

P0 always bypasses quiet hours. P1 bypasses only when the matched rule allows it. P2 and P3 are deferred until the recipient's quiet-hour end.

## Provider outage

In-app remains available independently. Email and SMS provider outages create visible retryable failure records rather than dropping events.

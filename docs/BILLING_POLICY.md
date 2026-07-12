# Billing Policy — Founding Customer Phase

Build 6.5.0 makes the commercial decision explicit: founding customers are billed by manual invoice unless `BILLING_MODE=STRIPE` is deliberately enabled.

## Default mode: MANUAL_INVOICE

- Subscription records and access states remain authoritative.
- Owners see invoice/contact instructions instead of nonfunctional Stripe buttons.
- An administrator records payment status manually.
- No customer is blocked because a Stripe webhook was never configured.
- This mode is appropriate for the PTT pilot and the first small group of customers.

## Stripe mode

`BILLING_MODE=STRIPE` is allowed only when checkout links, portal URL, webhook signing secret, event processing, dunning, and lifecycle reconciliation are implemented and tested. Build 6.5.0 does not claim that complete Stripe lifecycle.

## Commercial gate

Before broad self-service sales, implement and verify:

1. Checkout session creation tied to restaurant and plan.
2. Signed webhook handling with idempotency.
3. Subscription status reconciliation.
4. Payment-failure and dunning workflow.
5. Customer portal and cancellation lifecycle.
6. Access gating tested against active, past-due, canceled, and expired states.

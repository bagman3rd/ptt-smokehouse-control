# Build 5.2.0 — Commercial SaaS Readiness

Build 5.2.0 starts the self-service commercial layer for Smokehouse Control.

## Added

- Subscription records per restaurant.
- Trialing / active / past-due / canceled / expired / read-export-only billing statuses.
- Stripe hosted-checkout handoff for monthly and annual plans.
- Stripe customer-portal handoff for card updates and cancellation.
- Billing warning banner in the app shell.
- Support ticket page and API.
- Customer data export/cancellation request tracking.
- Public health endpoints for uptime monitoring.
- Tenant backup includes subscriptions, support tickets, and data requests.

## Render environment variables

Recommended:

- `STRIPE_MONTHLY_PAYMENT_LINK`
- `STRIPE_ANNUAL_PAYMENT_LINK`
- `STRIPE_CUSTOMER_PORTAL_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `APP_SESSION_TOKEN`
- `ADMIN_PASSWORD`
- `CRON_SECRET`

Fallback accepted:

- `STRIPE_PAYMENT_LINK`
- `STRIPE_CHECKOUT_URL`
- `STRIPE_PORTAL_URL`

## Important limitation

Build 5.2.0 uses Stripe hosted checkout/payment links rather than full Stripe API/webhook synchronization. It creates the application-side subscription record and gives a customer a clean payment handoff, but a production SaaS billing system should later add Stripe webhooks for automatic status updates.

## Legal

Terms and Privacy pages remain starter templates. They should be reviewed by an attorney before selling to unrelated restaurants.

# Smokehouse Control — Build 5.2.0

Build 5.2.0 is the **Commercial SaaS Readiness** build.

## Purpose

This release starts the path from a pilot app to a sellable SaaS product. It adds subscription records, hosted Stripe checkout handoff, customer support tracking, customer data-request tracking, and uptime health endpoints.

## Major changes

### Billing and subscription records

New Prisma model:

```text
Subscription
```

The app now tracks per-restaurant billing state:

```text
TRIALING
ACTIVE
PAST_DUE
CANCELED
EXPIRED
READ_EXPORT_ONLY
```

New signup tenants automatically receive a 14-day trial subscription record.

### Stripe hosted checkout handoff

`/billing` now supports:

- Monthly hosted checkout
- Annual hosted checkout
- Stripe customer-portal handoff
- Trial status visibility
- Billing warning banner in the app shell

Environment variables:

```text
STRIPE_MONTHLY_PAYMENT_LINK
STRIPE_ANNUAL_PAYMENT_LINK
STRIPE_CUSTOMER_PORTAL_URL
```

Fallbacks:

```text
STRIPE_PAYMENT_LINK
STRIPE_CHECKOUT_URL
STRIPE_PORTAL_URL
```

### Support channel

New page:

```text
/support
```

New model:

```text
SupportTicket
```

Set:

```text
NEXT_PUBLIC_SUPPORT_EMAIL
```

### Customer data requests

New admin page:

```text
/admin/data
```

New model:

```text
CustomerDataRequest
```

This tracks export, deactivation, deletion-after-retention, and restore requests.

### Uptime monitoring

New endpoints:

```text
/api/health
/api/health/db
```

Use these with UptimeRobot or Render external monitoring.

### Backup expansion

Tenant backup JSON now includes:

- Subscriptions
- Support tickets
- Customer data requests

## Important limitations

Build 5.2.0 uses Stripe hosted payment links and portal handoff. It does not yet include full Stripe API webhook synchronization. For full SaaS automation, the next billing step is Stripe webhooks that automatically update subscription status.

Terms and Privacy pages are still starter templates and should be reviewed by an attorney before selling to unrelated restaurants.

## Deploy

Use the normal deploy path:

```text
ZIP → File Explorer copy/replace → GitHub Desktop commit/push → GitHub Actions → Render Manual Deploy
```

Commit message:

```text
Build 5.2.0 commercial SaaS readiness
```

Render build command remains:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

`render-build` uses `prisma migrate deploy`, does not use `prisma db push`, and does not use `--accept-data-loss`.

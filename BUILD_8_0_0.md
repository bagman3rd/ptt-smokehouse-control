# Build 8.0.2 — Live POS Integration Foundation

Build 8.0.2 begins the 8.x POS program. It provides the shared multi-provider data model and a real Square OAuth/API connector. Toast and the remaining providers are represented in the provider registry but remain disabled until partner credentials and sandboxes are available.

## Included
- Tenant-scoped encrypted POS connections
- Square OAuth authorization and callback
- Square locations, catalog and order ingestion
- Raw immutable source records
- Normalized orders and line items in integer cents
- Manual **Sync Now**
- Daily synchronization settings and protected cron endpoint
- Sync history and actionable connection errors
- Signed OAuth state and Square webhook signature verification
- Webhook event deduplication
- Item-to-protein mapping and cooked-pound estimates
- CSV fallback retained
- Top-10 provider registry and rollout waves

## Required secrets
- `SQUARE_APPLICATION_ID`
- `SQUARE_APPLICATION_SECRET`
- `SQUARE_REDIRECT_URI`
- `SQUARE_WEBHOOK_SIGNATURE_KEY`
- `SQUARE_WEBHOOK_NOTIFICATION_URL`
- `POS_SQUARE_ENV` (`sandbox` or `production`)
- `POS_CRON_SECRET`
- Existing `TOTP_ENCRYPTION_KEY` encrypts POS tokens as well.

## Honest boundary
Only Square is enabled in 8.0.2. A provider is not called integrated until OAuth/credentials, catalog, order ingestion, reconciliation and sandbox tests are complete.

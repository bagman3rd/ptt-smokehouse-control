# Build 11.1.0 Staging Plan

Do not reuse the production database or production provider credentials.

## Required isolation

- Separate Render web service.
- Separate PostgreSQL database.
- Separate session and administrator secrets.
- Square and Stripe sandbox/test credentials only.
- Email and SMS restricted to approved test recipients.
- Separate Sentry environment.
- No production backup destination.
- Cron jobs disabled initially or configured with staging-only URLs and secrets.
- `APP_BUILD_VERSION=11.1.0`.
- Clear `STAGING` banner visible to testers.

## Data

Create synthetic data for:

- a new restaurant with incomplete setup;
- a typical restaurant with multiple roles and historical records;
- restricted users;
- a second tenant for cross-tenant isolation tests;
- smoker configurations and service dates covering brisket, pork, ribs and chicken.

Do not copy unmasked production credentials, tokens, payment data or personal information.

## Promotion rule

Staging evidence is valid only when the tested commit, environment variables, schema and feature flags are recorded. Production receives only the approved revision. Any configuration difference must be documented in the release evidence.

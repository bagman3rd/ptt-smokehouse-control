# Build 10.0.0 Release Gate

A production ZIP may be generated only by `.github/workflows/release.yml` after the exact commit completes the mandatory **Build 10.0.0 CI** workflow successfully.

## Required evidence
- exact commit SHA
- successful CI workflow run ID
- complete Playwright directory on desktop and mobile
- four-role interaction manifest execution
- fresh migration replay and schema drift check (`ci:schema-drift` must exit clean)
- mandatory database dump/restore drill
- packaged `RELEASE_EVIDENCE.json`

## New in 10.0.0 — additional gate items
Build 10.0.0 introduces compliance, notification, and observability subsystems. The following must pass before release in addition to the standard gate:

- **Compliance logic suite** — `pnpm run test:compliance-logic` (TCPA quiet-hours, E.164 normalization, SMS keyword handling, prompt-injection bank, PII redaction, signed-token security).
- **Notification contract** — `pnpm run test:notification-contract` (consent → quiet-hours → idempotency → logging pipeline; opt-out permanence; provider disabled under test).
- **Hardening contract** — `pnpm run test:hardening-contract` (AI spend cap before model call, GDPR erasure anonymization, cron bearer auth, security headers).
- **Notification provider isolation** — verify `NODE_ENV=test` never dispatches to SendGrid/Twilio (console provider only). No real customer message may be sent from CI or staging.
- **Consent audit** — confirm `ConsentEvent` rows are written for every opt-in/opt-out and retained ≥ 4 years.
- **Data-rights smoke** — export endpoint returns a downloadable JSON dump; deletion request emits a signed 24-hour confirmation link; confirmation performs anonymizing erasure while preserving audit rows.
- **Retention job dry-run** — `GET /api/cron/retention` with the cron secret returns success and records a `RetentionJobRun`.
- **Security headers live check** — deployed response includes `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`, and omits `X-Powered-By`.

## Pre-launch operational items (owner sign-off)
- Live Twilio number provisioned; STOP/START/HELP verified end-to-end against a real handset.
- SendGrid (or Mailgun) sender domain authenticated (SPF/DKIM); welcome + trial-ending + payment-failed emails delivered to a seed inbox.
- `COMPANY_POSTAL_ADDRESS`, `NEXT_PUBLIC_SUPPORT_EMAIL`, and `APP_BASE_URL` set to production values.
- Render Cron entries configured for `retention` (daily) and `daily-digest` (weekday 07:00) with `CRON_SECRET`.
- Privacy Policy and Terms reviewed by counsel for the launch jurisdiction.

Local ZIPs are source-review packages and are not audited production artifacts.

# Build 10.0.0 — Commercial Hardening: Compliance, Notifications, Observability

Build 10.0.0 takes Smokehouse Control from a working multi-tenant app to a commercially sellable SaaS ($99/restaurant/month, designed to scale to 1,000 restaurants). It closes every P0 finding and most P1 findings from the Build 9.8.0 master-testing-plan evaluation.

## Headline additions

### 1. TCPA / CAN-SPAM communication compliance
- Explicit **consent model** (`CommunicationConsent`) with an immutable 4-year **audit trail** (`ConsentEvent`).
- Marketing messages require a recorded **opt-in**; **STOP/START/HELP** SMS keywords honored via the inbound webhook (Twilio-signature validated).
- **Quiet-hours** enforcement (8 AM–9 PM recipient local time) for marketing; transactional messages exempt.
- **Unsubscribe** endpoint for email (scanner-safe: GET confirms, POST records) with CAN-SPAM footers (postal address + working unsubscribe link) on every commercial email.
- Signup captures Terms/Privacy agreement and an optional marketing opt-in checkbox.

### 2. Notification system
- Central **dispatcher** enforcing consent → quiet-hours → **idempotency** → delivery → logging, so a message is never sent twice and never sent without consent.
- Pluggable providers (SendGrid email, Twilio SMS) with a **test-safe console provider** so CI/staging never message real customers.
- Every send recorded in `NotificationLog` with status, provider id, and suppression reason.

### 3. Privacy & GDPR
- Rewritten, disclosure-complete **Privacy Policy** and **Terms of Service**.
- **Cookie consent** banner + server-side audit (`CookieConsent`).
- Self-service **data export** (Article 20) and **account deletion** with a signed 24-hour email confirmation; deletion performs **anonymizing erasure** that preserves audit/financial records.
- Configurable **data retention** (`DataRetentionSetting`) with a daily purge job (`RetentionJobRun`).

### 4. AI cost controls & safety (Archer)
- Per-conversation **token ceiling** and per-restaurant **daily spend cap** enforced *before* the model is called.
- **Prompt-injection** screening (attack bank) and **PII redaction** before any conversation content is logged (`ArcherConversationLog`, retention-gated).

### 5. Cost & observability
- `CostEvent` + `AiUsageDaily` power a per-service cost ledger and an admin **Observability dashboard** (MRR, gross margin, cost breakdown, notification health, AI-safety signals).
- **Daily digest** cron with cost alerting; **retention** cron; both bearer-secret protected.
- `DeployRecord` supports post-deploy error-threshold / rollback tracking.

### 6. Security & accessibility
- Full **security headers** (HSTS, CSP, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy); `X-Powered-By` disabled.
- Accessibility: skip link, visible focus, reduced-motion support, 44px mobile touch targets, screen-reader utilities.
- Playwright projects extended to **iPhone 14** and **iPad** alongside Pixel 7 and desktop; new mobile-responsiveness spec.

## New CI tests
- `test:compliance-logic` — TCPA quiet-hours, E.164 normalization, SMS keywords, prompt-injection bank, PII redaction, signed-token security.
- `test:notification-contract` — dispatcher pipeline, opt-out permanence, provider isolation under test.
- `test:hardening-contract` — spend-cap-before-model-call, GDPR anonymization, cron auth, security headers.
- `test:migration-drift-1000` — verifies the 10.0.0 migration matches the schema (columns, enums, unique indexes; additive-only). Mirrors Render's `ci:schema-drift`.

All four suites are wired into `ci:test` via `pnpm run test:compliance`.

## Database
One additive, idempotent migration (`20260724000000_build_1000_compliance_notifications_observability`) introducing 10 models and 6 enums. No destructive DDL.

## Operator setup (see `docs/RELEASE_GATE_10_0_0.md` and `.env.example`)
- Provision Twilio number + SendGrid sender domain (SPF/DKIM).
- Set `APP_BASE_URL`, `COMPANY_POSTAL_ADDRESS`, `OPS_ALERT_EMAIL`.
- Configure Render Cron for `retention` (daily) and `daily-digest` (weekdays).
- Counsel review of Privacy/Terms for the launch jurisdiction.

## Known constraint in offline build environments
Prisma engine binaries download from `binaries.prisma.sh`. Where that host is unreachable, `prisma generate` / `migrate` / `next build` cannot run locally; they run normally on Render. Pure-logic modules type-check and all behavioral + drift tests pass offline.

Local ZIP files remain source packages. Only the artifact produced by `.github/workflows/release.yml` is an audited production release.

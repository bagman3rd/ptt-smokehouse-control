# Commercial Readiness Roadmap — Build 3.3.0

## Completed in this build

- Self-service signup.
- Demo-mode prospect account with fake operating data.
- Generic BBQ defaults instead of Pigeon Forge/PTT defaults for new restaurants.
- Sales history/POS CSV import.
- API/login/signup rate limiting.
- Zod validation on key write endpoints.
- Per-tenant export.
- Tenant soft deletion.
- Audit logging for onboarding/export/delete/import.
- Forecast engine tests.
- Render build command moved to `prisma migrate deploy`.

## Next major commercial build

Build 3.4.0 should focus on:

1. Email verification and password reset.
2. Restore-drill utility and backup verification screen.
3. Toast CSV template mapper by menu item → protein.
4. Learning recommendation approval workflow.
5. Physical tenant purge job after retention period.
6. Customer-facing billing/subscription gates only after security and backup workflows are proven.

# PTT Smokehouse Control — Build 6.8.0

Smokehouse Control is a multi-restaurant production-planning and kitchen closeout application for smoked-meat operations.

## Build 6.8.0 reliability work

- Admin and Owner administrative access requires TOTP in production.
- Logins create durable device sessions with expiry, last-seen time, IP, user agent, and individual revocation.
- Account Security lists active sessions and allows users to revoke unfamiliar devices.
- Reports includes a 30-day multi-restaurant sales and waste rollup when the account has access to more than one restaurant.
- CI executes a 200-request mixed authenticated kitchen load smoke test.
- System Health records external security review, physical kitchen-device testing, live pilot forecast evidence, and operator-led restore rehearsal.
- Existing migration compatibility aliases remain preserved. Do not rename migration folders already shipped.

## Build 6.6 kitchen closeout retained

The top of the EOD page provides the eight-number fast closeout: sealed units and opened pounds for brisket, pork, chicken, and ribs. Only sealed pork, chicken, and ribs reduce the next load.

## Deployment

```bash
pnpm install --frozen-lockfile
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run migration:smoke
pnpm run build
pnpm run start
```

Required production variables include `DATABASE_URL`, `APP_SESSION_TOKEN` of at least 24 characters, `ADMIN_PASSWORD`, and `ENFORCE_PRIVILEGED_2FA=true`.

See `BUILD_6_8_0.md`, `TEST_REPORT_BUILD_6_8_0.md`, `docs/MIGRATION_HISTORY.md`, and `docs/BUILD_680_READINESS.md`.

# Smokehouse Control — Build 3.3.0

Build 3.3.0 expands the app from a private PTT tool toward a sellable multi-restaurant smokehouse production platform.

## Major additions

- Self-service signup: `/signup`.
- Prospect demo mode with fake operating data: `/demo`.
- Generic BBQ starter defaults for new restaurants instead of Pigeon Forge-specific assumptions.
- POS/sales-history CSV import: `/admin/restaurants/pos`.
- Guided setup wizard with profile, users, sales model, protein specs, curves, and import.
- Rate limiting on login, signup, demo, and key API routes.
- Zod validation on public/write endpoints.
- Per-tenant JSON export and tenant soft delete.
- Forecast engine automated tests.
- Render build command now uses `prisma migrate deploy`.

## Initial admin login

After deployment, the initial admin user is:

```text
username: admin
password: Render ADMIN_PASSWORD value
```

## Required Render environment variables

```text
DATABASE_URL
ADMIN_PASSWORD
APP_SESSION_TOKEN
NEXT_PUBLIC_APP_NAME
NODE_VERSION=20.18.1
```

`ADMIN_PASSWORD` and `APP_SESSION_TOKEN` must both be at least 12 characters.

## Build command

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## Test commands

```bash
pnpm run build:eval
pnpm run test:forecast
pnpm run test:tenant
```

Run tenant integration and restore drills on a staging database before adding a real second customer.

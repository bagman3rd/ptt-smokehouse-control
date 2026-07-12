# PTT Smokehouse Control — Build 1.2.6 Deploy Fix Report

## Issue observed

Render failed during Build 1.2.5 with:

- `npm error Exit handler never called!`
- `sh: 1: prisma: not found`
- Exit status 127

This indicates npm failed during dependency installation, leaving Prisma unavailable for the build script.

## Fix

Build 1.2.6 changes the Render deployment path to use Corepack + pnpm:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false && pnpm run render-build
```

This bypasses the Render/npm failure while preserving the existing Next.js and Prisma application structure.

## Expected deploy sequence

1. Corepack enables pnpm.
2. pnpm installs dependencies and devDependencies.
3. Prisma Client generates with Prisma 5.22.0.
4. Prisma migrations deploy.
5. Next.js builds.
6. Render starts with `npm run start`.

## App behavior preserved

- Login remains password-based using `ADMIN_PASSWORD`.
- Session cookie uses `APP_SESSION_TOKEN`.
- Scenario/protein/default data self-heals if seed data is missing.
- Daily cook planning, end-of-day logs, reports, and settings remain unchanged.

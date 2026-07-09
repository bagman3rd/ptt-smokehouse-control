# PTT Smokehouse Control — Build 1.2.4 Test/Deployment Report

## Purpose

Build 1.2.4 addresses Render deployment instability observed during Build 1.2.1 deploys.

## Failure addressed

Render logs showed Prisma schema validation using Prisma CLI 7.0.0, even though the app was built for Prisma 5.22.0. This occurred because `npx prisma` could resolve to a newer Prisma version during Render build.

## Fixes

- Pinned `prisma` and `@prisma/client` to `5.22.0`.
- Removed package lockfile so Render does not use sandbox/internal resolved package URLs.
- Added `.npmrc` with public npm registry.
- Added Node 20 engine, `.nvmrc`, and `.node-version`.
- Updated Render build command to `npm install --legacy-peer-deps && npm run render-build`.
- Updated `render-build` script to run local npm binaries, not `npx`.

## Expected Render behavior

Render should now:

1. Install from public npm registry.
2. Use Node 20.
3. Install Prisma 5.22.0.
4. Run `prisma generate` using local project dependency.
5. Run `prisma migrate deploy` using local project dependency.
6. Build Next.js.
7. Start with `npm run start`.

## Functional areas retained

- Login/logout Render redirect fix.
- Seed self-healing for scenarios/proteins/day/month settings.
- Cook plan creation.
- Scenario dropdown defaults.
- End-of-day log.
- Reports.
- Settings edits.

## Manual verification after deploy

- Login page opens.
- Login with `ADMIN_PASSWORD` goes to dashboard.
- Cook Plan scenario dropdown shows four scenarios.
- Generate cook plan for today.
- Approve cook plan.
- Enter end-of-day log.
- View reports.
- Logout returns to Render public login URL, not localhost.

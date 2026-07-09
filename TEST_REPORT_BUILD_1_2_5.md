# PTT Smokehouse Control - Build 1.2.5 Test / Deploy Fix Report

## Purpose
Build 1.2.5 corrects the Render deployment issue where `npm run render-build` was still running an older script that invoked `npm install` from inside another npm lifecycle command. That created `npm error Exit handler never called!` on Render.

## Fixes
- Version badge updated to Build 1.2.5.
- `render-build` now runs only app build tasks:
  - `prisma generate`
  - `prisma migrate deploy`
  - `next build`
- `render-build` no longer calls `npm install`.
- Added `.nvmrc` pinning Node to `20.18.1`.
- Keeps previous seed self-healing for empty scenario/protein dropdowns.

## Render command to use
`npm install --no-audit --no-fund --legacy-peer-deps --include=dev && npm run render-build`

## Start command
`npm run start`

## Environment variables
Required:
- DATABASE_URL
- ADMIN_PASSWORD
- APP_SESSION_TOKEN
- NEXT_PUBLIC_APP_NAME
- NODE_VERSION = 20.18.1

Remove:
- NEXTAUTH_SECRET
- NEXTAUTH_URL
- PORT

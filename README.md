# PTT Smokehouse Control — Build 1.2.4

Private consultant dashboard for Pigeon Toed Tavern BBQ production planning.

## Build 1.2.4 deployment fix

This build is packaged flat at ZIP root. It also hardens Render deployment:

- Removes `package-lock.json` to avoid bad/internal registry lockfile URLs.
- Pins Prisma to `5.22.0` in `package.json`.
- Pins Next.js to `14.2.18`.
- Adds `.npmrc` using the public npm registry.
- Adds `.nvmrc` and `.node-version` set to Node 20.
- Adds `engines.node = 20.x`.
- Changes Render build command to avoid `npx` and use local project binaries through npm scripts.
- Keeps Build 1.2.1 seed self-healing so empty Scenario dropdowns repopulate automatically.

## Render Build Command

Use this exact Build Command:

```bash
npm install --legacy-peer-deps && npm run render-build
```

## Render Start Command

```bash
npm run start
```

## Required Render environment variables

Use exactly these:

```text
DATABASE_URL=<Render Postgres Internal Database URL>
ADMIN_PASSWORD=<your login password>
APP_SESSION_TOKEN=ptt-smokehouse-control-session-token-2026-change-later
NEXT_PUBLIC_APP_NAME=PTT Smokehouse Control
NODE_VERSION=20
```

Remove these if present:

```text
NEXTAUTH_SECRET
NEXTAUTH_URL
PORT
```

## Deploy with GitHub Desktop

1. Unzip this Build 1.2.4 ZIP.
2. Copy all files/folders from the unzipped folder.
3. Paste into your existing `ptt-smokehouse-control` repo folder.
4. Choose replace/overwrite.
5. Open GitHub Desktop.
6. Commit to `main` with message: `Build 1.2.4 Render deployment fix`.
7. Push origin.
8. In Render, set the Build Command above.
9. Manual Deploy → Clear build cache & deploy.

## Core app scope

- Login with `ADMIN_PASSWORD`
- Consultant dashboard
- Daily cook plan generator
- Forecast scenarios: Conservative $6M, Base $6M, Aggressive $8M, Event Day
- Proteins: Brisket, Pulled Pork, Ribs, Pulled Chicken
- End-of-day log
- Waste/leftover/86 tracking
- Reports
- Editable protein, scenario, day, and month settings

## Build 1.2.5 Render Deployment Fix

Use this Render Build Command:

```bash
npm install --no-audit --no-fund --legacy-peer-deps --include=dev && npm run render-build
```

Use this Start Command:

```bash
npm run start
```

Set `NODE_VERSION=20.18.1` in Render Environment Variables.

Build 1.2.5 fixes the Render npm failure by ensuring `render-build` does not run `npm install` internally.

# PTT Smokehouse Control — Build 1.2.6

Build 1.2.6 is a Render deployment fix for the npm failure seen on Build 1.2.5.

The Render logs showed `npm error Exit handler never called!` during `npm install`, then `sh: 1: prisma: not found`. That means npm failed before installing Prisma, so the app code was not the failure point.

## Render Build Command

Use this exact Build Command in Render:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false && pnpm run render-build
```

## Render Start Command

```bash
npm run start
```

## Required Render environment variables

Keep/add these:

```text
DATABASE_URL
ADMIN_PASSWORD
APP_SESSION_TOKEN
NEXT_PUBLIC_APP_NAME
NODE_VERSION
```

Set:

```text
NODE_VERSION=20.18.1
```

Remove these if present:

```text
NEXTAUTH_SECRET
NEXTAUTH_URL
PORT
```

## What changed in Build 1.2.6

- Switched Render install path from npm install to pnpm via Corepack.
- Added `packageManager: pnpm@9.15.0` to package.json.
- Kept Prisma pinned to 5.22.0.
- Kept Next.js pinned to 14.2.18.
- Kept `render-build` clean: Prisma generate, migration deploy, Next build only.
- Updated badge to Build 1.2.6.
- Kept seed-data self-healing for empty Scenario dropdowns.

## GitHub Desktop deploy

1. Unzip this ZIP.
2. Copy all files and folders from the ZIP root.
3. Paste into your existing `ptt-smokehouse-control` repo folder.
4. Replace files in destination.
5. Open GitHub Desktop.
6. Commit to `main` with message: `Build 1.2.6 Render pnpm deploy fix`.
7. Push origin.
8. In Render, update the Build Command to the command above.
9. Manual Deploy → Clear build cache & deploy.

# PTT Smokehouse Control — Build 1.2.7

Build 1.2.7 is a deployment recovery build. It avoids Prisma migration-state failures on Render by using Prisma `db push` for this MVP database instead of `migrate deploy` during the Render build.

## Render Build Command

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## Render Start Command

```bash
npm run start
```

## Required Render environment variables

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

Remove if present:

```text
NEXTAUTH_SECRET
NEXTAUTH_URL
PORT
```

## Important database note

This is still an MVP/test database. If Render shows a failed Prisma migration from earlier deploy attempts, the cleanest fix is to delete/recreate the Render Postgres database or continue using this Build 1.2.7 path, which uses `prisma db push` instead of migration deploy.

## What changed in Build 1.2.7

- App badge updated to Build 1.2.7.
- `render-build` changed to:

```bash
prisma generate && prisma db push --accept-data-loss && tsx prisma/seed.ts && next build
```

- Keeps Build 1.2.6 pnpm/Corepack deployment approach.
- Keeps seed-data self-healing behavior for empty scenario/protein dropdowns.
- Keeps flat ZIP packaging with project files at ZIP root.

## GitHub Desktop deployment

1. Unzip this flat ZIP.
2. Copy all files and folders from the ZIP root.
3. Paste into your existing `ptt-smokehouse-control` repo folder.
4. Replace files in destination.
5. In GitHub Desktop, commit: `Build 1.2.7 Render db push recovery`.
6. Push origin.
7. In Render, use the Build Command above.
8. Manual Deploy -> Clear build cache & deploy.

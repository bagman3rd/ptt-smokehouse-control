# PTT Smokehouse Control — Build 1.2.3 Clean

Clean Render-ready build.

## Render settings

Build Command:

```bash
npm ci --legacy-peer-deps && npx prisma generate && npx prisma migrate deploy && npm run build
```

Start Command:

```bash
npm start
```

Environment variables required:

```bash
DATABASE_URL=postgresql://...
NODE_VERSION=20.20.2
NEXT_TELEMETRY_DISABLED=1
```

## Important

This ZIP includes `package-lock.json`, so use `npm ci`, not `npm install`.
Files are at the ZIP root; do not upload a nested folder.

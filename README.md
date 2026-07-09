# PTT Smokehouse Control — Build 1.2.2 Clean ZIP

This is a clean, Render-ready project with files at the ZIP root. Do not upload the ZIP as a nested folder inside another folder.

## Render settings

Build command:

```bash
npm install --legacy-peer-deps && npx prisma generate && npx prisma migrate deploy && npm run build
```

Start command:

```bash
npm start
```

Environment variable required:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
```

## Local test

```bash
npm install --legacy-peer-deps
npx prisma generate
npm run build
npm start
```

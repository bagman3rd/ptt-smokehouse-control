# PTT Smokehouse Control — Build 1.3.3

Build 1.3.3 updates the monthly seasonality multipliers using the cleaned 2025 Pigeon Forge gross revenue curve supplied for planning. It keeps the Build 1.3.2 scenario set: Base $6M, Aggressive $8M, and ROD RUN at a $12M annual-sales basis.

## Scenario changes

- Removed **Conservative $6M** from active planning screens.
- Kept **Base $6M**.
- Kept **Aggressive $8M**.
- Renamed **Event Day** to **ROD RUN**.
- Set **ROD RUN** annual sales basis to **$12,000,000**.

Existing databases are normalized automatically by `ensureDefaultData()` and the seed script:

- `Conservative $6M` is renamed to `Legacy Conservative $6M` and hidden from active planning screens.
- `Event Day` is renamed to `ROD RUN` when possible.
- If both `Event Day` and `ROD RUN` already exist, the old `Event Day` row is renamed to `Legacy Event Day` and hidden.

## Render build command

Use this exact Render Build Command:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## Render start command

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

Recommended:

```text
NODE_VERSION=20.18.1
NEXT_PUBLIC_APP_NAME=PTT Smokehouse Control
```

Remove these if present:

```text
NEXTAUTH_SECRET
NEXTAUTH_URL
PORT
```

## Deploy with GitHub Desktop

1. Unzip the flat ZIP.
2. Copy all files from the ZIP root.
3. Paste into the existing `ptt-smokehouse-control` repo folder.
4. Choose **Replace files in destination**.
5. Commit: `Build 1.3.3 update Pigeon Forge 2025 monthly revenue curve`.
6. Push origin.
7. Render: **Manual Deploy → Clear build cache & deploy**.

## Test after deploy

1. Open Cook Plan.
2. Confirm Scenario dropdown only shows:
   - Base $6M
   - Aggressive $8M
   - ROD RUN
3. Confirm **Conservative $6M** is gone.
4. Confirm **Event Day** is gone.
5. Generate ROD RUN and confirm the annual sales note shows **$12,000,000**.
6. Generate Base $6M, Aggressive $8M, and ROD RUN for the same date and confirm meat numbers change.

## Build 1.3.3 monthly seasonality curve

The app now uses these month multipliers. They are calculated as:

`month multiplier = monthly share of annual Pigeon Forge revenue / 8.333%`

| Month | 2025 Pigeon Forge revenue share | App multiplier |
|---|---:|---:|
| January | 4.9% | 0.584 |
| February | 4.6% | 0.555 |
| March | 6.7% | 0.808 |
| April | 7.8% | 0.935 |
| May | 8.0% | 0.954 |
| June | 11.0% | 1.320 |
| July | 12.5% | 1.506 |
| August | 9.7% | 1.163 |
| September | 7.4% | 0.890 |
| October | 10.3% | 1.232 |
| November | 6.8% | 0.821 |
| December | 10.3% | 1.232 |

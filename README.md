# PTT Smokehouse Control — Build 1.3.4

Build 1.3.4 updates the BBQ production assumptions per Archer's latest planning model.

## Changes in Build 1.3.4

### Protein yield defaults

These are now normalized automatically on seed/bootstrap so existing Render databases update without manual editing:

| Protein | Cooked Yield % |
|---|---:|
| Brisket | 50% |
| Pulled Pork | 55% |
| Ribs | 90% |
| Pulled Chicken | 75% |

Pulled Chicken is set to 75% because the launch assumption is skinless boneless breast.

### Weekly day-of-week sales pattern

Default Tourist is now the default app assumption:

| Day | % of Weekly Sales | Multiplier |
|---|---:|---:|
| Monday | 9% | 0.63 |
| Tuesday | 8% | 0.56 |
| Wednesday | 10% | 0.70 |
| Thursday | 12% | 0.84 |
| Friday | 17% | 1.19 |
| Saturday | 25% | 1.75 |
| Sunday | 19% | 1.33 |

### Day Pattern profiles added to Cook Plan

The Cook Plan screen now includes a **Day Pattern** dropdown:

| Profile | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---:|---:|---:|---:|---:|---:|---:|
| Default Tourist | 9% | 8% | 10% | 12% | 17% | 25% | 19% |
| Summer | 10% | 10% | 12% | 13% | 16% | 22% | 17% |
| Shoulder Season | 8% | 7% | 9% | 11% | 18% | 28% | 19% |
| Rod Run / Event | 5% | 5% | 7% | 13% | 24% | 32% | 14% |

ROD RUN scenario auto-selects the Rod Run / Event pattern. Other scenarios default to Default Tourist, but the dropdown can be changed manually before generating.

## Render deploy settings

Use this exact Render Build Command:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

Start Command:

```bash
npm run start
```

Required environment variables:

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

Do not use these old variables:

```text
NEXTAUTH_SECRET
NEXTAUTH_URL
PORT
```

## Deploy with GitHub Desktop

1. Unzip this flat ZIP.
2. Copy everything from the ZIP root.
3. Paste into your existing `ptt-smokehouse-control` repo folder.
4. Replace files.
5. Commit: `Build 1.3.4 update yields and day patterns`.
6. Push origin.
7. Render → Manual Deploy → Clear build cache & deploy.

## Post-deploy test

1. Open Settings and confirm Pulled Chicken yield is 75%, Pulled Pork 55%, and Ribs 90%.
2. Open Cook Plan.
3. Generate Base $6M with Default Tourist.
4. Generate Base $6M with Summer.
5. Generate Base $6M with Shoulder Season.
6. Generate ROD RUN and confirm Rod Run / Event is selected and the Saturday number is heavier.

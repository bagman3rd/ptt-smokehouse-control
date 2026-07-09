# PTT Smokehouse Control

Private consultant dashboard for Pigeon Toed Tavern BBQ production planning.

## Build 1.2 Scope

- Password login scaffolding
- Daily cook-plan forecast
- Multiple forecast scenarios: Conservative $6M, Base $6M, Aggressive $8M, Event Day
- Core managed proteins: brisket, pulled pork, ribs, pulled chicken
- Ole Hickory EL-EDX + Southern Pride SPK-700 planning assumptions through editable max cook units
- 5 oz sandwich and 7 oz plate portion assumptions
- Usable leftover credit in next cook plan
- End-of-day logging by KM
- Waste, leftover, sold pounds, and 86 tracking
- Dashboard and 30-day report views
- Render + GitHub deployment files
- Build 1.2 Render logout redirect fix
- Build 1.2 editable day-of-week and month multipliers
- Build 1.2 numeric input validation/clamping
- Build 1.2 test report: `TEST_REPORT_BUILD_1_2.md`

## Operating Model

The app starts as Archer's private consultant dashboard. The KM enters end-of-day results. Randy can view reports once access is opened. Pitmaster/KM operational access can be added after the forecast logic is proven.

## Tech Stack

- Next.js 14
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- Render deployment

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL`, `ADMIN_PASSWORD`, and `APP_SESSION_TOKEN`.

4. Run migration and seed:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

5. Start dev server:

```bash
npm run dev
```

Login with the password set in `ADMIN_PASSWORD`.

## Render Deployment

1. Push this folder to GitHub.
2. Create a new Render Blueprint from `render.yaml`, or manually create:
   - Web Service
   - Render PostgreSQL database
3. Set environment variables:
   - `DATABASE_URL` from Render Postgres
   - `ADMIN_PASSWORD` to a strong password
   - `APP_SESSION_TOKEN` to a long random string
   - `NEXT_PUBLIC_APP_NAME=PTT Smokehouse Control`
4. Build command:

```bash
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

5. Start command:

```bash
npm run start
```

6. After deploy, run seed once from Render Shell:

```bash
npm run prisma:seed
```

## Forecast Logic

1. Annual sales / 365
2. Apply day-of-week multiplier
3. Apply month/seasonality multiplier
4. Apply manual event multiplier
5. Estimate BBQ sales percentage
6. Allocate BBQ sales by protein mix
7. Convert sales to cooked pounds using average dollars per cooked pound
8. Subtract usable leftovers from prior log
9. Apply safety factor
10. Convert cooked pounds to raw pounds and recommended cook units

## Build 1.2 Test Report

See `TEST_REPORT_BUILD_1_2.md` for use-case testing, button/dropdown review, and recommendations.

## Next Release Ideas

- Lunch/dinner split
- Smoker-specific capacity model for Ole Hickory EL-EDX and Southern Pride SPK-700
- Photo-based quality checklist
- Weather API integration
- Pigeon Forge event calendar modifiers
- POS sales import
- Vendor ordering module
- Food-cost spreadsheet import/export
- Role-based users beyond single-password MVP

## Build 1.2.1 Hotfix

Fixes empty Scenario dropdowns on newly deployed databases by auto-creating default proteins, forecast scenarios, day multipliers, and month multipliers when the database has no seed data.

If the Render database is already empty, open `/cook-plan`, `/dashboard`, `/settings`, or `/end-of-day` after deploying this build. The defaults will self-heal automatically.

Manual option on Render Shell:

```bash
npm run prisma:seed
```

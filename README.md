# Smokehouse Control — Build 4.8.0

Build 4.8.0 is the **Security Hardening + Tenant Migration Recovery** build.

It assumes the production migration baseline has already been repaired and the app can deploy with:

```bash
prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build
```

The build intentionally does **not** use:

```bash
prisma db push
--accept-data-loss
```

## What Build 4.8.0 adds

### Tenant guard coverage

`lib/tenantGuard.ts` now covers every tenant-scoped operating model, including child records:

- AuditLog
- Protein
- ForecastScenario
- DayMultiplier
- MonthMultiplier
- EventModifier
- CookPlan
- CookPlanItem
- EndOfDayLog
- EndOfDayProteinLog
- SavedReport
- ReportRun
- Smoker
- LearningRecommendation
- SystemCheck

In development and CI, missing tenant scoping now fails loudly instead of becoming a silent cross-tenant leak.

### Child-record restaurantId fields

Build 4.8.0 adds `restaurantId` to:

- CookPlanItem
- EndOfDayProteinLog

That makes direct tenant checks possible on child rows instead of relying only on parent joins.

### Tenant indexes and composite uniqueness

The Prisma schema now expresses tenant-safe uniqueness and lookup patterns, including:

- RestaurantMembership: `restaurantId + userId`
- Protein: `restaurantId + name`
- ForecastScenario: `restaurantId + name`
- DayMultiplier: `restaurantId + dayOfWeek`
- MonthMultiplier: `restaurantId + month`
- CookPlan: `restaurantId + serviceDate + scenarioId`
- EndOfDayLog: `restaurantId + serviceDate`
- Smoker: `restaurantId + name`

### CI checks

CI now includes:

```bash
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run test:tenant-guard
pnpm run test:orphan-records
pnpm run ci:schema-drift
```

### New scripts

```bash
pnpm run test:tenant-guard
pnpm run test:orphan-records
pnpm run build:eval
```

## Deployment

Normal deploy path:

```text
ZIP → File Explorer copy/replace → GitHub Desktop commit/push → GitHub Actions → Render Manual Deploy
```

Commit message:

```text
Build 4.8.0 tenant isolation hardening
```

## Important note

Build 4.8.0 contains a tenant-constraints migration. If existing production data has duplicates that violate tenant-level uniqueness, the migration can fail. Run this first on staging and confirm:

```bash
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run test:tenant-guard
pnpm run test:orphan-records
```

Do not add unrelated customers until these tests pass on a real staging PostgreSQL database.

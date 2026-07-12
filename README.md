# Smokehouse Control — Build 5.1.0

Build 5.1.0 is the **Smoker Scheduling + Production Constraints** build.

## Purpose

This release moves the app from simple capacity warnings toward operational production scheduling. It helps the KM answer:

```text
Can we physically cook this load with the smokers we have today?
```

## Major changes

### Smoker Schedule page

New page:

```text
/admin/smokers/schedule
```

It shows:

- Latest cook plan date
- Active smoker count
- Protein load by smoker
- Cook/start windows
- Capacity warnings
- Suggested fixes when the plan exceeds smoker capacity
- Active smoker capacity matrix

### Today page schedule upgrade

`/today` now uses the smoker scheduling engine instead of the old static smoker notes. It shows planned load timing and smoker assignment for each protein.

### Printable cook-plan schedule

`/cook-plan/print` now includes a smoker schedule table with:

- Time
- Protein load
- Assigned smoker
- Capacity / warning

### Shared smoker scheduling library

Added:

```text
lib/smokerSchedule.ts
```

This centralizes smoker-capacity and schedule logic so `/today`, `/admin/smokers/schedule`, and `/cook-plan/print` use the same rules.

## Deploy

Use the normal deploy path:

```text
ZIP → File Explorer copy/replace → GitHub Desktop commit/push → GitHub Actions → Render Manual Deploy
```

Commit message:

```text
Build 5.1.0 smoker scheduling and production constraints
```

Render build command remains:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

`render-build` uses `prisma migrate deploy`, does not use `prisma db push`, and does not use `--accept-data-loss`.

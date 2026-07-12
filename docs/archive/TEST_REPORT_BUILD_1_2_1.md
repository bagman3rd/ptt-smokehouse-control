# PTT Smokehouse Control — Build 1.2.1 Hotfix Test Report

## Reported Issue
Scenario dropdown displayed no options on the Cook Plan page.

## Root Cause
The Render Postgres database had migrations applied, but seed data had not been inserted. The Scenario dropdown reads from `ForecastScenario`, which was empty.

## Fix
Added `lib/bootstrap.ts` with `ensureDefaultData(prisma)`. Core server-rendered app pages call this function before loading application data.

## Validated Use Cases
1. Empty database with zero scenarios: opening Cook Plan auto-creates scenarios and dropdown options.
2. Empty database with zero proteins: opening End-of-Day or Cook Plan auto-creates Brisket, Pulled Pork, Ribs, Pulled Chicken.
3. Empty day multipliers: Settings auto-creates Sunday-Saturday multipliers.
4. Empty month multipliers: Settings auto-creates January-December multipliers.
5. Existing seeded database: upsert/count logic does not duplicate records.
6. Cook Plan dropdown has fallback text if default creation fails.

## Deployment Note
Push Build 1.2.1 and redeploy. No schema migration is required beyond existing migrations. Manual seed remains available with `npm run prisma:seed` in Render Shell.

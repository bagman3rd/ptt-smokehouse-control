# Build 4.3.2 Tenant + Security Hardening Notes

## Multi-tenant enforcement

Build 4.3.2 adds `lib/tenantGuard.ts`, a Prisma client extension wired through `lib/prisma.ts`.

In non-production environments, tenant-scoped models must include `restaurantId` in their `where` clause or create data. Missing tenant scope throws loudly instead of becoming a silent cross-tenant leak.

Guarded models include:

- Protein
- SavedReport
- ReportRun
- ForecastScenario
- DayMultiplier
- MonthMultiplier
- EventModifier
- CookPlan
- EndOfDayLog
- Smoker
- LearningRecommendation
- SystemCheck

`AuditLog` remains allowed for global auth/security events, but tenant export/reporting paths still scope audit logs by restaurant.

## Cross-tenant regression test

Added:

```bash
pnpm run test:cross-tenant
```

It creates two restaurants and verifies Tenant A cannot read, update, or delete Tenant B records through tenant-scoped query patterns.

## Durable rate limiting

Build 4.3.2 adds the `RateLimitBucket` table and rewrites the rate limiter to use Postgres upserts. This survives restarts and is safe if the Render service is later scaled to more than one instance.

## Account lockout

Login now tracks failed attempts per user:

- `failedLoginCount`
- `lockedUntil`
- `lastFailedLoginAt`

After repeated failures, the account is temporarily locked and an audit entry is written.

## Session revocation

`User.sessionVersion` is included in the signed session cookie. Password resets and user deactivation increment `sessionVersion`, invalidating existing sessions.

## Optional future security item

TOTP 2FA for Admin/Owner roles is still deferred. It should be added before broad third-party customer rollout, but it is not required for the PTT pilot.

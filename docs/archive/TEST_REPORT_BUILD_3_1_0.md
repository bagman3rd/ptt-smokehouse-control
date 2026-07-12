# TEST REPORT — Build 3.1.0

## Purpose

Build 3.1.0 implements the next multi-tenant commercial-readiness layer:

- RestaurantMembership role as the permission source.
- Restaurant switcher.
- Restaurant onboarding/admin page.
- Setup wizard starter page.
- Tenant-scoped audit-log page.
- Static tenant-isolation evaluation checks.

## Evaluation performed

Ran:

```bash
node scripts/build-3-1-evaluation.mjs
```

Result:

```text
Build 3.1.0 evaluation checks completed.
```

## Use cases reviewed

### 1. Logged-in user permission source

Expected: user role comes from active RestaurantMembership for the selected restaurant.

Result: Pass by code inspection. `currentUser()` resolves `currentMembershipForUser()` and returns the membership role as the effective role.

### 2. Restaurant switcher

Expected: users with access to more than one active restaurant can switch restaurant context.

Result: Pass by code inspection. Navigation lists active restaurants for the user and posts to `/api/restaurants/switch`, which validates membership before changing the restaurant cookie.

### 3. New restaurant onboarding

Expected: Admin/Owner can create a restaurant tenant and starter BBQ defaults.

Result: Pass by code inspection. `/admin/restaurants` creates the restaurant, creates starter proteins/scenarios/day/month multipliers, creates a membership for the current user, and switches to the new tenant.

### 4. Setup wizard starter

Expected: app has a guided onboarding starting point.

Result: Pass. `/admin/restaurants/setup` presents the first commercial setup checklist.

### 5. Tenant-scoped audit log

Expected: Admin/Owner can review recent audited actions for the current restaurant only.

Result: Pass. `/admin/audit` queries `AuditLog` by current `restaurantId`.

### 6. Tenant isolation static checks

Expected: major protected pages resolve tenant context before data display.

Result: Pass by static evaluation script.

## Known limitations

- This is still not a full production SaaS tenant system.
- True integration tests with a Postgres test database still need to be added.
- Email remains globally unique in the schema.
- `User.role` still exists as a fallback/legacy field, although membership role is now the effective access source.
- Restaurant setup wizard is a starter checklist, not a full guided form workflow yet.
- Render still uses `prisma db push` because the existing database has not been baselined for migrations.

## Recommendation

Build 3.2.0 should add true onboarding forms for:

- Smoker inventory and capacity.
- Protein cook-cycle timing.
- Restaurant-specific roles/memberships for existing users.
- POS item-to-protein mapping groundwork.
- Automated tenant-isolation tests against a real test database.

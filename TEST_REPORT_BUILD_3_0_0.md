# TEST REPORT — Build 3.0.0

## Scope
Build 3.0.0 converts the app from a single-restaurant MVP toward a multi-tenant architecture. The focus is tenant data separation, tenant-scoped queries, restaurant memberships, and migration of existing legacy records into a default Pigeon Toed Tavern tenant.

## Implemented
- Added `Restaurant` model.
- Added `RestaurantMembership` model for role-within-restaurant groundwork.
- Added `AuditLog` model.
- Added nullable `restaurantId` fields to core operating tables.
- Removed global uniqueness from protein names, scenario names, day/month multipliers, and cook/EOD service dates so multiple restaurants can eventually have the same operating structure.
- Added tenant helpers in `lib/tenant.ts`.
- Updated bootstrap/seed logic to create the default restaurant and attach legacy records.
- Scoped key pages and API routes by the logged-in user's restaurant.
- Scoped reports, CSV exports, backups, saved reports, dashboard, cook plans, EOD logs, settings, learning, and users.
- Added audit logging hooks for cook-plan approval, EOD save/lock, saved reports, and user administration.

## Tests / Static Evaluation
- Package version is 3.0.0.
- Render build command still avoids `--accept-data-loss`.
- Core models include `restaurantId`.
- Protected pages resolve the current restaurant before data queries.
- Protected API routes resolve the current restaurant before tenant-sensitive data queries.
- Report builder requires restaurantId.
- Cook plan generation deletes/recreates plans only within the active tenant.
- EOD save/find uses tenant scope.
- User management lists and mutates users only within the active tenant.
- Backup export is tenant-scoped.
- Evaluation script: `node scripts/build-3-evaluation.mjs`.

## Known Limitations
- This is tenant groundwork, not a fully commercial multi-location SaaS yet.
- Login still does not expose a restaurant selector; users are routed to their default/current restaurant.
- Existing `User.role` remains the primary authorization field while `RestaurantMembership.role` is now populated for the next build.
- Some child rows still inherit tenant separation through parent rows instead of storing `restaurantId` directly.
- Full automated integration tests with a real Postgres database should be added before adding a second paying customer.

## Recommendation for Build 3.1.0
- Make `RestaurantMembership.role` the source of truth for permissions.
- Add restaurant switcher for users with multiple memberships.
- Add `/admin/restaurants` onboarding page.
- Add automated tenant-isolation tests using seeded Restaurant A / Restaurant B data.
- Add `restaurantId` directly to child tables where useful for stronger DB-level isolation.

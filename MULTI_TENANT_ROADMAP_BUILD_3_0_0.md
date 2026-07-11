# Multi-Tenant Roadmap — Build 3.0.0

Build 3.0.0 starts the commercial architecture conversion from a single PTT app into a restaurant-scoped platform.

## Completed in 3.0.0

1. Tenant data model
   - Added `Restaurant`.
   - Added `RestaurantMembership`.
   - Added `AuditLog`.
   - Added `restaurantId` to core operating tables.

2. Query scoping
   - Dashboard, Cook Plan, End of Day, Settings, Reports, Learning, Users, CSV exports, and backup exports now resolve the logged-in user's current restaurant and scope data to that tenant.

3. Legacy data migration path
   - Bootstrap/seed creates the default Pigeon Toed Tavern restaurant.
   - Existing records with `restaurantId = null` are assigned to the default restaurant during bootstrap/seed.

4. Commercial groundwork
   - Removed global uniqueness from restaurant-local operating concepts such as protein names, scenario names, cook-plan service dates, and EOD service dates.
   - Populated `RestaurantMembership` records for new users.
   - Started audit logging for important actions.

## Known limitations

This is still not a full production SaaS tenant system. It is the foundation build.

Remaining risks before selling externally:

- Permissions still primarily read from `User.role`; next build should make `RestaurantMembership.role` authoritative.
- There is no restaurant switcher yet for one user managing multiple restaurants.
- There is no restaurant onboarding UI yet.
- There are no DB-level row-level security policies.
- Some child tables inherit tenant isolation through parent relations instead of direct `restaurantId` fields.
- Real automated integration tests against PostgreSQL are still needed.

## Next build recommendation: 3.1.0

- Make membership role the source of truth.
- Add restaurant switcher.
- Add restaurant onboarding/admin page.
- Add tenant isolation integration tests.
- Add full audit log page.
- Begin onboarding wizard for new restaurants.

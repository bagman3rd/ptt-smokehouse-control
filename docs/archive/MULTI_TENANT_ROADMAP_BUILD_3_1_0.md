# Multi-Tenant Roadmap — Build 3.1.0

## Completed in 3.1.0

- Membership role is now the effective permission source.
- Users can switch between restaurants they belong to.
- Admin/Owner can create a restaurant tenant.
- New restaurant tenants receive starter BBQ production assumptions.
- Audit-log page is tenant-scoped.
- Setup wizard starter page exists.

## Next commercial steps

1. Add automated Postgres integration tests for tenant isolation.
2. Add restaurant setup forms for smoker inventory, cook cycles, hours, and POS mapping.
3. Add an account model that supports one login across multiple restaurant memberships without relying on `User.restaurantId`.
4. Add invite flow for adding an existing user to another restaurant.
5. Add a visible tenant-isolation test harness for development and deployment checks.

# Multi-Location Model — Build 12.1.0

## Context

Every operational request requires a tenant and an explicit active location. A user with access to multiple locations must choose one; the application cannot silently select the first location.

## Membership

Memberships are tenant-scoped and use either:

- `ALL_LOCATIONS`
- `ASSIGNED_LOCATIONS`

Inactive memberships have no access. UI visibility never replaces server-side authorization.

## Location-specific configuration

Each active location requires timezone, service hours, all four core products, explicit yields and unit weights, at least one active smoker with a capacity profile, forecast profile, and inventory policy.

Configuration from another location cannot be used as a fallback.

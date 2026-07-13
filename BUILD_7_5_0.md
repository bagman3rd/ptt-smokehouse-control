# Build 7.5.0 — Tenant Guard and API Reliability

Build 7.5.0 fixes defects found by live API and cross-tenant testing.

## Fixed

- Quick EOD protein-log upserts now include `restaurantId` in both the update and create branches.
- The tenant guard now runs in production as well as development and CI.
- `DISABLE_TENANT_GUARD=1` remains the only explicit maintenance escape hatch.
- Cook-plan, capacity-preview, and EOD APIs resolve the authenticated user, role, and selected restaurant once per request.
- API authorization failures include a non-sensitive `X-Auth-Denial` diagnostic header.
- Added a Next.js development-mode Playwright job so tenant-guard contract violations fail CI.
- Added a rapid sequential cook-plan API test to detect intermittent 403 responses.
- Preserved all Build 7.4.1 pages, native navigation controls, Quick EOD behavior, and prior security fixes.

## No migration

This release does not change the database schema or production data.

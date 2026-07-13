# Build 7.8.0

Build 7.8.0 is a guarded EOD lifecycle and release-proof release.

## Changes

- Fixed revisions, completion, review, and lock updates for existing EOD parent records by using the tenant-scoped `restaurantId_serviceDate` key.
- Retained the tenant-scoped EOD protein upsert key introduced in Build 7.7.0.
- Enabled the tenant guard by default in production, development, test, and CI. Only an explicit `DISABLE_TENANT_GUARD=1` maintenance process can turn it off.
- Added a browser/database lifecycle test covering initial draft, revision, completion, lock, and rejected post-lock edit.
- Expanded the guard-contract test to cover both the parent update and child upsert call shapes.
- Added a multi-restaurant reporting rollup contract test to prove the recovered reporting feature remains present and membership-scoped.
- Added these checks to the mandatory CI release gate.
- Preserved Node 20.19+ and Node 22 compatibility from Build 7.7.2.

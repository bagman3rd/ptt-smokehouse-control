# Build 7.8.2

Build 7.8.2 combines the Build 7.8.1 Admin navigation correction with the Render/TypeScript build repair.

## Corrections

- Preserves the explicit-opt-in privileged 2FA route-blocking policy from Build 7.8.1.
- Preserves exact Admin dropdown destination assertions for all ten Admin pages.
- Repairs `scripts/eod-tenant-guard-contract-test.ts` so it no longer assigns to the read-only `process.env.NODE_ENV` property.
- Continues to verify that the tenant guard is enabled by default and can only be disabled through the controlled maintenance flag.
- Retains the tenant-scoped EOD parent update and protein-row upsert contracts from Build 7.8.0.
- Retains Node 20.19+ and Node 22 compatibility.

No database migration is required.

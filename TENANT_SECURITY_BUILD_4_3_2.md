# Build 4.3.2 Tenant + Security Notes

Build 4.3.2 keeps the Build 4.3 tenant/security functionality and fixes a TypeScript deploy error in the Data Quality module.

## Retained security features

- Tenant guard extension for development/CI.
- Cross-tenant regression coverage.
- Postgres-backed rate limiting.
- Account lockout after repeated failed login attempts.
- Session revocation after password reset/deactivation.

## Deploy fix

`lib/dataQuality.ts` now explicitly types the EOD log structures used for data-quality scoring so strict TypeScript compilation passes on Render.

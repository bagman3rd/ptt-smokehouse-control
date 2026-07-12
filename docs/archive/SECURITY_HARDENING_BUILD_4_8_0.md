# Build 4.8.0 — Security Hardening and Tenant Migration Recovery

Build 4.8.0 adds optional authenticator-code protection, an account security page, stronger user/session controls, and a safer tenant-constraints migration path.

## Included

- Optional TOTP two-factor authentication for Admin/Owner/Kitchen Manager/Kitchen Crew accounts.
- `/account/security` page for password changes, session revocation, and 2FA setup.
- Login support for a 6-digit authenticator code when 2FA is enabled.
- Admin Users page shows 2FA status and includes account unlock controls.
- Password changes, password resets, 2FA changes, and deactivation increment `sessionVersion` to revoke old sessions.
- Build 4.7.0 tenant-constraints migration now cleans duplicate membership/day/month/EOD/cook-plan rows before unique indexes are added.
- Render build attempts to mark the failed Build 4.7.0 migration as rolled back before applying the corrected migration, then uses `prisma migrate deploy`.

## Notes

The 4.7.0 deployment failed because production already had duplicate `RestaurantMembership` rows. Build 4.8.0 dedupes those rows before applying the composite unique index.

2FA setup displays a manual secret and otpauth URL. A QR code can be added later, but authenticator apps can be configured manually from the secret today.

# Test Report — Build 4.8.0

## Static checks completed

- Package version updated to 4.8.0.
- Nav badge updated to Build 4.8.0.
- README references Build 4.8.0.
- Render build uses `prisma migrate deploy`.
- Render build does not use `prisma db push` or `--accept-data-loss`.
- Tenant-constraints migration includes duplicate cleanup before unique indexes.
- User schema includes 2FA and password-reset/session security fields.
- Login form includes an authenticator-code field.
- Account Security page exists.
- Admin Users page shows lockout and 2FA status.

## Live checks still required

- Deploy to staging or production after the Build 4.7.0 failed migration is marked rolled back by the Build 4.8.0 render-build path.
- Confirm `prisma migrate status` is clean after deploy.
- Log in as Admin and create a TOTP secret on `/account/security`.
- Confirm a bad TOTP code fails login and a valid code succeeds.
- Confirm password reset/deactivation invalidates old sessions.

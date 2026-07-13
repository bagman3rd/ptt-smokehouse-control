# Build 7.8.1

Build 7.8.1 fixes the production Admin navigation redirect regression.

## Root cause

Production treated privileged 2FA route blocking as enabled unless explicitly disabled. An Admin or Owner without completed 2FA could open the menu, but every Admin destination redirected to `/account/security?required=1`.

## Corrections

- Privileged-route blocking is now explicit opt-in only (`ENFORCE_PRIVILEGED_2FA=true`).
- Render production and staging default to `ENFORCE_PRIVILEGED_2FA=false` so existing Admin accounts can navigate while 2FA enrollment is completed.
- The Account Security page accurately describes 2FA as strongly recommended and optionally enforceable after enrollment.
- Browser interaction tests now assert every Admin link's exact URL and exact page heading.
- Browser tests explicitly fail if an Admin link lands on Account Security.
- Added a permanent static policy regression test to CI.

No database migration is required.

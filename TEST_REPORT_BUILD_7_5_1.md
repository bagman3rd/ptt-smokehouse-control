# Test Report — Build 7.5.1

## Regression targets

- Root and post-login landing route is Today.
- Admin/Owner operational access is not redirected to Account Security solely because 2FA enrollment is incomplete.
- Admin/Owner-only settings continue to enforce 2FA in production.
- Production pages are not terminated by development-only tenant assertion failures.
- CI explicitly runs the strict tenant assertion against `next dev`.
- Header navigation contains direct server-rendered links and no client-dependent dropdowns.
- Logout and restaurant switching remain native POST forms.

## Local static validation

- Build 7.5.1 defect regression: passed.
- Direct-link navigation regression: passed.
- Route inventory retained.
- Migration set unchanged.

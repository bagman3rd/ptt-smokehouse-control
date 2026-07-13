# Build 7.6.0

Reliability and test-hardening release implementing all recommendations from the independent Build 7.5.2 review.

## Corrections
- CI and tenant-guard policy are consistent.
- Native compact dropdown navigation works without React hydration.
- Cook-plan validation returns HTTP 400 instead of 500.
- Render requires TOTP_ENCRYPTION_KEY.
- Role tests are helper-name independent.
- Removed arbitrary script-count release gate.
- Added keyboard/accessibility checks, concurrent Quick EOD testing, authenticated cross-tenant mutation testing, separate-session mixed load testing with latency percentiles, dependency audit, and production validation canary.

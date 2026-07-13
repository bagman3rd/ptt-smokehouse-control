# Build 7.5.1 — Today Landing and Navigation Recovery

Build 7.5.1 fixes the production regression that redirected Admin/Owner users to Account Security and caused navigation targets to fail with server-side tenant-guard assertions.

## Corrections

- `/` redirects to `/today`.
- Successful login redirects to `/today`.
- Operational pages that allow Manager or Crew access no longer force Admin/Owner 2FA enrollment before they can be opened.
- Privileged Admin/Owner-only pages continue to enforce production 2FA.
- Production tenant isolation continues to rely on tenant-scoped queries and database constraints.
- The aggressive Prisma tenant assertion runs automatically in development and explicitly in the CI guard job, rather than breaking production pages.
- The top header now uses direct server-rendered links instead of dropdown controls.
- Today, Logout, restaurant switching, and every permitted page link work without React hydration or menu toggling.

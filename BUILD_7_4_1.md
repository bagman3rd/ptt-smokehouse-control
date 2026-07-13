# Build 7.4.1 — Hydration-Independent Navigation Fix

Build 7.4.1 fixes an issue where the top navigation rendered but the Operations, Insights, Admin, and Help buttons did not respond when React client hydration failed or a stale client bundle was loaded.

## Correction

- Replaced JavaScript-controlled dropdown buttons with native HTML `details` and `summary` controls.
- Navigation dropdowns now work without React hydration or client-side JavaScript.
- Preserved standard links for Today and all menu destinations.
- Preserved native POST forms for restaurant switching and Logout.
- Added keyboard focus styling and semantic navigation labels.
- Added a regression test that fails if the header becomes client-hydration dependent again.

No database migration or production-data change is included.

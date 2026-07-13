# Build 7.5.2

Build 7.5.2 restores the compact dropdown navigation used by the earlier stable releases while preserving the Build 7.5.1 Today landing-page and authorization fixes.

## Changes

- Replaced the expanded always-visible navigation grid with four compact dropdown menus: Operations, Insights, Admin, and Help.
- Restored the proven client-side dropdown behavior from the earlier clean navigation implementation.
- Added explicit outside-click, touch-outside, and Escape-key closing behavior.
- Added stable test IDs and ARIA state to dropdown buttons, panels, and links.
- Preserved Today as the login and root landing page.
- Preserved native Logout and restaurant-switch forms.
- Preserved all existing role-based menu filtering and all application routes.

No database migration is required.

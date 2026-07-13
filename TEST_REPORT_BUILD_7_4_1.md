# Test Report — Build 7.4.1

## Defect reproduced

The header HTML rendered, but the four dropdown controls were implemented as React client buttons. When hydration failed, the controls remained visible but inert.

## Fix verification

- Confirmed `NavMenu.tsx` is a server-compatible component with no `use client` directive.
- Confirmed all four menu groups use native `details` and `summary` elements.
- Confirmed Today remains a normal link.
- Confirmed Logout remains a native POST form.
- Confirmed restaurant switching remains a native POST form.
- Confirmed all Build 7.0.1 baseline routes and role mappings remain present.

No schema migration is required.

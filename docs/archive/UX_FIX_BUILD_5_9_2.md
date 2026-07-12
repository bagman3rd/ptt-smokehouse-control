# Build 5.9.2 — Navigation and Smoker Form UX Fix

## Problem fixed

The grouped top navigation was implemented with native `<details>` elements. Multiple dropdowns could remain open at once, and clicking elsewhere on the page did not reliably close them.

## Fix

Build 5.9.2 adds a client-side navigation controller:

- one open dropdown at a time
- outside click closes menus
- touch outside closes menus
- Escape closes menus
- selecting a menu item closes menus

## Smoker page fix

The Add Smoker From Catalog form now uses visible labels for every field. Placeholder-only fields were not acceptable because once catalog values loaded, the user could not tell what the values represented.

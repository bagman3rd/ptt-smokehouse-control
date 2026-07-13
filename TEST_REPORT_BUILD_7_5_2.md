# Test Report — Build 7.5.2

## Scope

Navigation presentation and interaction regression only.

## Verified

- NavMenu is a client component.
- Operations, Insights, Admin, and Help render as dropdown buttons rather than an expanded link grid.
- Only one menu can be open at a time.
- Outside click, outside touch, Escape, link selection, restaurant switching, and logout close the active menu.
- Today remains a direct link.
- Role-based link filtering remains server-side in `components/Nav.tsx`.
- No database migration was added.

# Smokehouse Control — Build 5.9.3

Build 5.9.3 is a user-interface repair build layered on top of the 5.9.1 migration/CI repair.

## Fixes

- Top navigation dropdowns now behave like normal menus.
- Only one dropdown can be open at a time.
- Clicking anywhere outside the navigation closes the open dropdown.
- Pressing Escape closes the open dropdown.
- Selecting a link closes the menu.
- Smoker Capacity add form now uses visible labels, not placeholder-only fields.
- Smoker capacity numbers now remain readable after values are loaded from a catalog model.

## Deploy

Commit message:

```text
Build 5.9.3 navigation dropdown and smoker form labels
```

Normal path:

```text
ZIP → File Explorer copy/replace → GitHub Desktop commit/push → GitHub Actions → Render Manual Deploy
```

Render build remains migration-safe and uses `prisma migrate deploy`.

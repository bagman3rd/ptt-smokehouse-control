# Smokehouse Control — Build 6.3.4

Build 6.3.4 is a reliability release focused on safer migrations, explicit smoker configuration, production-mode browser testing, mobile CI coverage, and a complete kitchen workflow regression test.

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
Build 6.3.4 navigation dropdown and smoker form labels
```

Normal path:

```text
ZIP → File Explorer copy/replace → GitHub Desktop commit/push → GitHub Actions → Render Manual Deploy
```

Render build remains migration-safe and uses `prisma migrate deploy`.

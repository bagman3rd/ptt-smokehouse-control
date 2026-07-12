# Smokehouse Control — Build 4.9.0

Build 4.9.0 is the **Kitchen Field Usability** build.

## Purpose

This release focuses on the two places the app will actually be used during live service:

- `/today` — daily command center for KM/pit crew
- `/end-of-day` — closing log used with imperfect kitchen Wi-Fi
- `/cook-plan/print` — pit-friendly printed load plan

## Major changes

### Kitchen Mode on Today

`/today` now includes a Kitchen Mode toggle:

- Larger text
- Larger touch targets
- Higher contrast emphasis
- Execution-first layout

### EOD bad-Wi-Fi protection

The End-of-Day form now:

- Autosaves a local browser draft every 5 seconds
- Shows the last local draft save time
- Provides Save Draft Now / Restore Draft / Clear Draft controls
- Warns before leaving the page with an unsaved local draft
- Preserves the last submit payload if the save fails
- Keeps the full protein log available on the device after a network failure

### EOD quality checks

Build 4.9.0 strengthens closeout checks:

- Negative values blocked
- Complete/Reviewed/Locked logs require explicit leftover units
- All-zero completed logs blocked
- 86 events require a reason before closeout
- Leftover units greater than cooked units trigger a hot-box warning

### Print polish

`/cook-plan/print` now has:

- Bigger type
- Higher contrast
- Pit-friendly manager signoff
- Hot-box verification wording
- EOD closeout reminder
- Better print CSS for letter-size output

## Deploy

Use the normal deploy path:

```text
ZIP → File Explorer copy/replace → GitHub Desktop commit/push → GitHub Actions → Render Manual Deploy
```

Commit message:

```text
Build 4.9.0 kitchen field usability
```

Render build command remains:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

`render-build` uses `prisma migrate deploy`, does not use `prisma db push`, and does not use `--accept-data-loss`.

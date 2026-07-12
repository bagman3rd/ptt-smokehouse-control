# Smokehouse Control — Build 5.8.1

Build 5.8.1 is the **5.7/5.8 merge deploy fix**. It preserves the official-only smoker catalog audit and the UX/regression-test cleanup, then fixes the smoker form TypeScript defaultValue issue that blocked Render deploy.

This build tightens the smoker catalog policy, adds generate-plan regression testing, removes old build-note copy from operator pages, makes the smoker screens easier to read, and replaces the crowded top navigation with grouped dropdown menus.

## Key fixes

- Rechecked the active smoker catalog policy: no estimated capacities are allowed.
- Preserves manufacturer capacities in the units they publish.
- Does not convert pounds, ranges, whole chickens, or half chickens into production-planning counts.
- Corrects the Southern Pride MLR-150 fixture to 12 racks, 24 pork butts, 24 St. Louis ribs, 32 whole chickens, and 8 beef briskets.
- Keeps Cookshack pound capacities as official reference text instead of treating pounds as brisket/pork/rib counts.
- Keeps J&R ranges and pound capacities as official reference text instead of treating ranges as exact counts.
- Adds a generate-plan regression test to protect the cooked-weight protein mix logic.
- Shortens generated cook-plan notes so the plan is easier to read.
- Removes old build-number marketing notes from user-facing pages.
- Groups the top navigation into Operations, Insights, Admin, and Help dropdowns.
- Adds readability improvements for tables, cards, and mobile navigation.

## Deploy

Commit message:

```text
Build 5.8.1 official smoker catalog, UX cleanup, and deploy fix
```

Normal deploy path:

```text
ZIP → File Explorer copy/replace → GitHub Desktop commit/push → GitHub Actions → Render Manual Deploy
```

# Build 6.6.1 — Quick EOD Input Repair

Build 6.6.1 fixes the eight Quick EOD number fields being disabled when legacy protein records do not yet contain stable protein codes.

## Changes

- Core proteins are resolved by stable code first.
- Legacy records fall back to recognized protein names: brisket, pork/butt, chicken/breast, and ribs.
- The eight fields remain editable even when a protein configuration is missing.
- Missing configuration is shown as an administrator warning and is validated at submission.
- No database migration is required.

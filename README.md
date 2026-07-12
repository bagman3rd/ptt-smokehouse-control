# Smokehouse Control — Build 5.7.0

Build 5.7.0 is the **Official Smoker Catalog Audit** build.

This build removes estimated smoker capacities from the active catalog. Smoker catalog rows now use only manufacturer-published values. If a manufacturer page does not publish a pork, brisket, rib, or chicken capacity, that field is intentionally left blank instead of being estimated.

## Key fixes

- Retires old unverified/estimated smoker catalog rows.
- Rebuilds the catalog from manufacturer-published capacity values.
- Corrects Southern Pride MLR-150 to 12 racks, 24 pork butts, 24 St. Louis ribs, 32 whole chickens, and 8 beef briskets.
- Allows catalog capacity fields to be null when the manufacturer does not publish that value.
- Updates smoker dropdown labels so missing official capacity is clearly shown as “official data not published.”
- Updates smoker catalog notes to identify manufacturer source and whether the row is full official capacity or official partial data.

## Deploy

Commit message:

```text
Build 5.7.0 official smoker catalog audit
```

Normal deploy path:

```text
ZIP → File Explorer copy/replace → GitHub Desktop commit/push → GitHub Actions → Render Manual Deploy
```

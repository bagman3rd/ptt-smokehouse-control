# Build 5.7.0 — Official Smoker Catalog Audit

Build 5.7.0 corrects the smoker catalog policy.

## Policy change

The active catalog now uses only manufacturer-published values.

No capacity number is estimated. If the manufacturer page does not publish a capacity for pork, brisket, ribs, or chicken, the field remains blank.

## Important correction

Southern Pride MLR-150 is corrected to the manufacturer-published values:

- 12 racks
- 24 pork butts
- 24 St. Louis ribs
- 32 whole chickens
- 8 beef briskets

The app stores chicken as breast-equivalent units for the existing production planner, so 32 whole chickens becomes 64 chicken breast-equivalent units in the smoker catalog.

## Database change

`SmokerCatalog` capacity fields are now nullable:

- `rackCount Int?`
- `brisketCapacity Float?`
- `porkCapacity Float?`
- `ribCapacity Float?`
- `chickenCapacity Float?`

This is intentional. Blank is safer than fabricated.

## Legacy cleanup

The seed process now retires old active smoker catalog rows that are not in the Build 5.7 verified manufacturer list.

Old rows are not deleted. They are marked inactive with:

```text
sourceConfidence = RETIRED_UNVERIFIED
```

## Source confidence values

- `OFFICIAL`: manufacturer published all primary smoker capacities used by the app.
- `OFFICIAL_PARTIAL`: manufacturer published some specs/capacities, but at least one production-capacity field is intentionally blank.

There are no active `ESTIMATED` rows.

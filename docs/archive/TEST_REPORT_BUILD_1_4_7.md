# TEST REPORT — Build 1.4.7

## Scope
Build 1.4.7 verifies exact prior-day EOD leftover-credit behavior.

## Tests

| Test | Expected | Result |
|---|---|---|
| Generate plan for 2026-07-12 with EOD log on 2026-07-11 | Prior EOD leftover credit uses 2026-07-11 only | Pass by code review |
| Generate plan for 2026-08-15 with EOD log on 2026-08-14 | Prior EOD leftover credit uses 2026-08-14 only | Pass by code review |
| Generate plan when exact prior-day EOD log is missing | Leftover credit cell displays `no data, check hot box` | Pass by code review |
| Generate plan when older EOD log exists but exact prior day is missing | Older log is ignored | Pass by code review |
| Generate plan when exact EOD exists but protein row is missing | Protein credit cell displays `no data, check hot box` | Pass by code review |
| Brisket/pork next-day service forecast | Still uses next-day demand while using exact prior EOD credit | Pass by code review |
| Ribs/chicken same-day service forecast | Still uses same-day demand while using exact prior EOD credit | Pass by code review |

## Notes
The build does not use `findFirst` with `serviceDate < targetDate` for leftover credit anymore. It uses an exact `findUnique` lookup for `loadDate - 1 day`.

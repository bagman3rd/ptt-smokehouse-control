# Build 7.2.3 — Quick EOD Carryover Repair

Build 7.2.3 restores the intended next-day carryover from the eight-number Quick EOD report.

## Corrected behavior

For a Quick EOD report dated July 13, the cook plan generated for July 14 reads that exact July 13 EOD log.

- Sealed pork units reduce the July 14 pork load.
- Sealed chicken units reduce the July 14 chicken load.
- Sealed rib units reduce the July 14 rib load.
- Sealed brisket units are recorded but do not reduce the July 14 brisket load.
- Opened-meat pounds are recorded for repurposed menu use but do not reduce smoker loads.

## Root cause

The visible Quick EOD form recognized both stable protein codes and older name-only protein records. The server API did not. It awarded carryover only when the stored code was exactly PORK, CHICKEN, or RIBS. Restaurants created before protein codes were required therefore saved the eight numbers but received zero next-load credit.

## Repair

A shared core-protein resolver now recognizes stable codes and legacy names in both the form and server API. EOD status checks also count Quick EOD sealed/opened entries as real data.

No database migration is required.

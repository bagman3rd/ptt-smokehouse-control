# Test Report — Build 7.2.3

## Defect reproduced

Legacy name-only protein records were accepted by the Quick EOD form, but the API used only `protein.code` to calculate next-load credit. As a result, sealed pork, chicken, and ribs could be displayed on the July 13 EOD page while the July 14 cook plan received zero usable-leftover units.

## Corrected rules verified

- Legacy `Pork` or `Pork Butt` resolves to PORK.
- Legacy `Chicken` or `Chicken Breast` resolves to CHICKEN.
- Legacy `Ribs` resolves to RIBS.
- Legacy `Brisket` resolves to BRISKET.
- Sealed PORK, CHICKEN, and RIBS become `usableLeftoverUnits`.
- Sealed BRISKET receives zero smoker-load credit.
- All opened-meat pounds receive zero smoker-load credit.
- Quick EOD sealed/opened values prevent the prior EOD status from being incorrectly classified as an empty all-zero report.
- A plan dated July 14 continues to query the exact July 13 EOD record.

## Local checks

- Quick EOD carryover regression: passed
- Build preflight: passed
- Migration integrity: passed
- Permission boundaries: passed
- Account security: passed
- Tenant guard coverage: passed
- Cook-plan generation regression: passed
- Dead-code check: passed
- ZIP structure: passed

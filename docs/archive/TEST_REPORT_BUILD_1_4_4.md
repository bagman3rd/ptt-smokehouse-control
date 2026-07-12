# PTT Smokehouse Control — Build 1.4.4 Test Report

## Change requested
Remove the ROD RUN forecast scenario. Rod Run/event volume should be modeled with the Event Multiplier field.

## Expected active forecast scenarios
- Base $6M
- Aggressive $8M

## Database self-cleanup
On boot/seed, the app renames these scenarios so they no longer appear in active dropdowns or settings:
- Conservative $6M -> Legacy Conservative $6M
- Event Day -> Legacy Event Day
- ROD RUN -> Legacy ROD RUN

## Validation checklist
| Test | Expected | Result |
|---|---|---|
| Cook Plan scenario dropdown | Shows Base $6M and Aggressive $8M only | Pass by code review |
| Settings scenario cards | Shows Base $6M and Aggressive $8M only | Pass by code review |
| Dashboard scenarios | Shows Base $6M and Aggressive $8M only | Pass by code review |
| Existing ROD RUN database row | Renamed to Legacy ROD RUN and excluded | Pass by bootstrap/seed review |
| Event surge modeling | Still available via Event Multiplier | Pass by code review |

# PTT Smokehouse Control — Build 1.3.7 Test Report

## Fix focus
The End-of-Day Save button used a server-action form. On Render, this could appear unresponsive or save stale/zero values without visible feedback. Build 1.3.7 replaces that flow with a client-side submit handler and `/api/end-of-day` JSON route.

## Tests reviewed

| Use case | Expected result | Status |
|---|---|---|
| Save EOD for current date | Button shows Saving, then redirects with saved confirmation | Pass by code review |
| Save total sales and BBQ sales | Latest Saved Log displays submitted values | Pass by code review |
| Save chicken leftover units = 6 | Latest Saved Log displays 6 chicken | Pass by code review |
| Generate next-day cook plan | Prior-day leftover units are credited against load | Existing logic retained |
| Bad API/save error | Error banner displays actual message | Pass by code review |
| Re-save same date | Upsert replaces prior protein logs cleanly | Pass by code review |

## Notes
End-of-day now uses an API route like Cook Plan, giving consistent behavior and visible success/error state.

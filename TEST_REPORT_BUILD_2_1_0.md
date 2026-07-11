# PTT Smokehouse Control — Build 2.1.0 Test Report

## Objective
Build 2.1.0 is a usability and data-integrity update. It focuses on preventing bad daily production decisions before the KM/pitmaster uses the app during live operations.

## Use cases reviewed

### 1. Generate plan with prior EOD present
- User chooses a load date.
- App checks exact prior calendar day EOD via `/api/eod-status`.
- Expected: green status card, source date shown, leftover/waste summary shown.
- Result: implemented.

### 2. Generate plan with prior EOD missing
- User chooses a load date where no exact prior EOD exists.
- Expected: amber warning before generation, and generated plan should still show `no data, check hot box`.
- Result: implemented.

### 3. EOD entry with cooked units but no sold/waste/leftover
- User enters cooked units and leaves sold/waste/leftover blank.
- Expected: warning appears and API fallback treats cooked units as usable leftovers.
- Result: implemented.

### 4. EOD negative-value guardrail
- User enters a negative value.
- Expected: save blocked with validation error.
- Result: implemented in client validation.

### 5. Manual hot-box adjustment on cook approval
- User reviews physical hot box and enters a positive or negative adjustment.
- Expected: approved cook units are adjusted on save, and the reason includes the manual adjustment note.
- Result: implemented through `approveCookPlan`.

### 6. Dashboard alerts
- Low confidence, missing prior EOD data, max-capacity recommendations, and no current operational plan should be surfaced.
- Result: implemented.

### 7. Delete future test plans
- User can remove accidental far-future cook plans beyond the current 14-day operational horizon.
- Result: implemented as a dashboard action.

## Build risk
No schema changes. No migration required. Existing Render build command remains unchanged.

# PTT Smokehouse Control — Build 2.4.0 Test Report

## Scope
Build 2.4.0 adds a report builder and CSV exports so saved cook-plan and end-of-day data can be queried operationally.

## Use Cases Tested

1. **Waste last month by day of week**
   - Source: End-of-Day Logs
   - Metric: Waste lb
   - Grouping: Day of week + protein
   - Result: Supported through `/reports?source=eod&metric=wasteLb&groupBy=dayOfWeekProtein&range=lastMonth`.

2. **Briskets loaded last week**
   - Source: Cook Plans
   - Metric: Loaded / approved units
   - Grouping: Date + protein
   - Protein filter can be set to Brisket.
   - Result: Supported through the report builder.

3. **86 events by protein**
   - Source: End-of-Day Logs
   - Metric: 86 events
   - Grouping: Protein
   - Result: Supported.

4. **Raw EOD export**
   - Exports service date, status, sales, protein, cooked units, sold lb, leftover units/lb, waste, 86s, and notes.
   - Result: Supported at `/api/reports/export?dataset=eodRaw`.

5. **Raw cook-plan export**
   - Exports load date, scenario, forecast sales, protein, forecast units, recommended units, approved units, raw/cooked demand, and overrides.
   - Result: Supported at `/api/reports/export?dataset=cookPlanRaw`.

6. **Authenticated exports**
   - Export API uses `apiAuthError()`.
   - Result: Protected.

## Evaluation
- Build version: 2.4.0.
- Navigation badge: Build 2.4.0.
- Reports page now has flexible source/metric/range/protein/grouping controls.
- Aggregate report CSV export added.
- Raw data CSV exports added.
- Existing learning, EOD locking, API protection, and cook-plan logic preserved.

## Recommendations
1. Add saved named reports.
2. Add scheduled report emails.
3. Add charts for waste trend, loaded units, forecast accuracy, and 86 frequency.
4. Add multi-restaurant `restaurantId` before selling externally.
5. Add audit logs for report exports and settings changes.
6. Add POS-imported actual sales data to improve report and learning accuracy.

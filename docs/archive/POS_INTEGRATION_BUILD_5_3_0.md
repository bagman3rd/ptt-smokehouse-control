# Build 5.3.0 — POS Integration

Build 5.3.0 upgrades the original sales-history CSV bridge into an item-level POS import workflow.

## What changed

- Added reusable POS menu-item mappings.
- Added item-level CSV import for Toast, Square, Clover, or spreadsheet exports.
- Added POS import batch history.
- Added row-level POS import storage for future learning and reconciliation.
- Added mapped-protein preview before import.
- Added unmapped-item warnings.
- Added tenant backup/export coverage for POS mappings and POS import data.

## CSV format

Required columns:

```csv
date,itemName,quantity,grossSales
2026-07-01,Brisket Plate,18,540
2026-07-01,Pulled Pork Sandwich,42,714
```

## Workflow

1. Go to **Admin → Restaurants → POS / Sales Import**.
2. Add menu-item mappings.
3. Paste item-sales CSV.
4. Review mapped protein totals.
5. Confirm the import.
6. Review recent import batches.

## Why this matters

The app can now train future forecasts from item-level sales instead of only daily total sales. This is the bridge between manual smokehouse planning and automated POS-driven learning.

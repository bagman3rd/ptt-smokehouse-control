# Reporting Model — Build 11.7.0

## Required source domains

Every complete report retains source identifiers for:

- Approved forecast
- Approved production plan
- Load execution
- Smoker capacity
- Inventory ledger
- Physical count
- Source revision

A deterministic source hash accompanies the source snapshot.

## Daily report

The daily report contains one row each for brisket, pork, ribs, and chicken. It calculates forecast variance, forecast accuracy, production variance, actual yield, waste rate, ending inventory rate, expected closing inventory, and unexplained difference.

The daily report is complete only when every required source exists, the source workflow is complete, smoker capacity is not exceeded, and every product reconciles within 0.01 cooked pound.

## Weekly report

The weekly report aggregates complete daily reports from one tenant and one location. Forecast accuracy uses weighted absolute percentage error rather than a simple average of daily percentages.

## Reconciliation equation

`opening + production receipts + transfer in - service usage - waste - transfer out + adjustments = closing on hand`

`unexplained difference = recorded closing on hand - expected closing on hand`

Any material unexplained difference blocks completion.

## Source integrity

Reports from different tenants or locations cannot be combined. Duplicate operating dates are rejected.

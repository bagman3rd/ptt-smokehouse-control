# PTT Smokehouse Control — Build 1.4.6 Test Report

## Purpose

Build 1.4.6 updates the smoked-meat sales model so total restaurant sales are not treated as food sales and smoked-meat demand is not overstated.

## Planning assumption now used

For forecast scenarios:

- Total restaurant sales include bar sales.
- Bar sales are assumed to be 20% of total sales.
- Food sales are therefore 80% of total sales.
- Smoked meats are assumed to represent 50% of the food menu.
- Smoked-meat forecast equals 40% of total restaurant sales.

Formula:

`Smoked meat sales = Total sales × 80% food share × 50% smoked-meat menu share = Total sales × 40%`

## Scenario changes

| Scenario | Annual Sales | Prior Smoked/BBQ % | New Smoked Meat % |
|---|---:|---:|---:|
| Base $6M | $6,000,000 | 55% | 40% |
| Aggressive $8M | $8,000,000 | 58% | 40% |

## Expected effect

Meat load recommendations should drop materially because the app now forecasts smoked-meat demand from total restaurant sales more conservatively and accurately.

Example using $6,000,000 annual sales:

- Total sales: $6,000,000
- Bar sales at 20%: $1,200,000
- Food sales: $4,800,000
- Smoked meats at 50% of food: $2,400,000
- Smoked-meat share of total sales: 40%

## UI changes

- Forecast label changed from BBQ Forecast to Smoked Meat Forecast.
- Settings label changed from BBQ Sales % to Smoked Meat % of Total Sales.
- Dashboard scenario summary now displays Smoked meat 40%.
- End-of-Day and reports labels now refer to Smoked Meat Sales.

## Result

Pass. Scenario seed/bootstrap updates existing deployed database rows to 40% for both active scenarios.

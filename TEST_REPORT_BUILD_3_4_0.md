# Test Report — Build 3.4.0

## Scope

Build 3.4.0 addresses two requested changes:

1. Remove the top navigation identity pills that displayed text such as `Admin · Admin` and `Pigeon Toed Tavern`.
2. Make the sales model obvious: total restaurant sales include 20% liquor/bar sales, which are excluded before smoked-meat production demand is calculated.

## Checks Performed

- Confirmed package version is `3.4.0`.
- Confirmed nav badge displays Build 3.4.0.
- Confirmed the single-restaurant nav pill is no longer rendered.
- Confirmed the user/role nav pill is no longer rendered.
- Confirmed multi-restaurant switcher still appears only when the user has multiple restaurant memberships.
- Confirmed sales-model constants are explicit: 20% liquor, 80% food.
- Confirmed Dashboard displays a liquor/food split and explains that liquor is excluded from meat demand.
- Confirmed Forecast Scenario cards show smoked meat as both percent of total and percent of food.
- Confirmed Cook Plan form shows the annual total sales breakdown.
- Confirmed Settings explains that the PTT default 40% smoked-meat share equals 80% food × 50% smoked-meat share of food.
- Confirmed cook-plan generated notes include liquor/bar exclusion.

## Sales Model Confirmation

For the PTT Base $6M scenario:

- Total restaurant sales: $6,000,000
- Liquor/bar sales at 20%: $1,200,000
- Food sales at 80%: $4,800,000
- Smoked-meat sales at 40% of total: $2,400,000
- Smoked-meat share of food: 50%

So yes: the 20% liquor assumption was already mathematically reflected by the 40% smoked-meat setting, but Build 3.4.0 now makes it visible and explicit in the UI.

## Result

Static evaluation passed.

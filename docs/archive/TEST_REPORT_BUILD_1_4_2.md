# PTT Smokehouse Control — Build 1.4.2 Test Report

## Issue fixed

The prior build showed correct notes for brisket/pork timing, but the forecast calculation still used the selected date for all proteins. That meant a Sunday plan used Sunday estimates for brisket and pork, even though those products are loaded/cooked Sunday for Monday service.

## Correct behavior

For selected load date D:

- Brisket uses D+1 service demand.
- Pulled pork uses D+1 service demand.
- Ribs use D same-day service demand.
- Pulled chicken uses D same-day service demand.

## Test case

Selected load date: Sunday.

Expected:

- Brisket load is calculated from Monday forecast.
- Pork butt load is calculated from Monday forecast.
- Ribs are calculated from Sunday forecast.
- Chicken is calculated from Sunday forecast.

## Status

PASS by code review and forecast-route inspection. The route now computes separate same-day and next-day forecasts and applies them per protein category.

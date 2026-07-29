# Production Planning Model — Build 11.4.0

## Weight-based products

For brisket and pork:

1. `buffered cooked demand = forecast demand × (1 + buffer percent)`
2. `eligible carryover = opened cooked pounds + eligible sealed units converted through raw unit weight and yield`
3. `net cooked demand = max(0, buffered demand - eligible carryover)`
4. `exact raw pounds = net cooked demand ÷ yield`
5. `planned whole units = ceil(exact raw pounds ÷ configured raw unit weight)`
6. `planned raw pounds = planned whole units × configured raw unit weight`

Brisket sealed units are not credited.

## Unit-count products

For ribs and chicken:

1. Forecast demand remains rack-equivalents or whole-bird-equivalent double breasts.
2. Eligible sealed units credit one-for-one.
3. Opened cooked pounds convert through configured cooked weight per unit.
4. Net demand cannot fall below zero.
5. Planned quantity rounds upward to a whole operational unit.

## Scheduling

- Each smoker booking is exclusive.
- Product windows use offsets from the service operating date.
- Brisket may begin the prior day at 9:00 a.m.
- Pork targets 5:00 p.m. on the prior day, but duration remains configurable.
- Ribs and chicken are same-day products.
- Primary smokers are used before backup/overflow smokers.
- Missing or exhausted capacity produces an explicit unscheduled quantity and blocks approval.
- Mixed-load equivalencies are not inferred.

## Historical integrity

Every approved plan must retain its forecast ID, calculation version, yields, unit weights, carryover, raw requirement, rounding result, bookings, warnings, actor and timestamp.

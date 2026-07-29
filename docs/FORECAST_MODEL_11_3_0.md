# Forecast Model — Build 11.3.0

## Formula

For each product:

`final demand = average-day baseline × DOW factor × monthly factor × event factor × manual factor`

Where:

- `DOW factor = approved DOW share ÷ (100 ÷ 7)`
- `event factor = 1 + event adjustment percent`
- `manual factor = 1 + manual adjustment percent`

The engine preserves unrounded values. Build 11.4.0 owns raw/cooked conversion and operational rounding.

## Approved day-of-week shares

| Day | Share | Factor |
|---|---:|---:|
| Monday | 9% | 0.630 |
| Tuesday | 8% | 0.560 |
| Wednesday | 10% | 0.700 |
| Thursday | 12% | 0.840 |
| Friday | 17% | 1.190 |
| Saturday | 25% | 1.750 |
| Sunday | 19% | 1.330 |

## Confidence

Confidence considers data freshness, recent sample size, recent absolute percentage error, event certainty and manual-adjustment magnitude. The score is an explanation aid, not an autonomous approval.

## Guardrails

- Monthly factor: 0.50–2.00.
- Event adjustment: -50% to +300%.
- Manual adjustment: -50% to +200%.
- Non-zero manual adjustment requires a reason.
- Automatic factor outside 0.50–2.00 requires explicit review.
- Manual adjustment above 20% produces heightened review.
- Approval retains calculation version, actor, reason, timestamp, output and warnings.

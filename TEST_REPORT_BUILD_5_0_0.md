# Test Report — Build 5.0.0

## Static checks performed

- package version updated to 5.0.0
- nav badge updated to Build 5.0.0
- README references Build 5.0.0
- Forecast Proof page exists at `/learning/proof`
- Learning page links to Forecast Proof
- forecast proof helper library exists
- trailing MAPE, accuracy, bias, and proof-status language exists
- render build uses `prisma migrate deploy`
- render build does not use `prisma db push`
- render build does not use `--accept-data-loss`

## Live data limitation

Forecast proof cannot be validated fully until the app has 60–90 days of live PTT data.

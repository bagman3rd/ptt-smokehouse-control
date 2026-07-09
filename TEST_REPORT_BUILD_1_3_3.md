# PTT Smokehouse Control — Test Report Build 1.3.3

## Scope

Build 1.3.3 updates the app monthly multipliers using the cleaned 2025 Pigeon Forge gross revenue curve supplied for planning.

## Monthly multiplier conversion

The app forecast uses annual sales ÷ 365 × day multiplier × month multiplier × event multiplier.

Monthly multipliers were calculated as monthly annual revenue share divided by the neutral monthly share of 8.333%.

| Month | Revenue share | Multiplier |
|---|---:|---:|
| January | 4.9% | 0.584 |
| February | 4.6% | 0.555 |
| March | 6.7% | 0.808 |
| April | 7.8% | 0.935 |
| May | 8.0% | 0.954 |
| June | 11.0% | 1.320 |
| July | 12.5% | 1.506 |
| August | 9.7% | 1.163 |
| September | 7.4% | 0.890 |
| October | 10.3% | 1.232 |
| November | 6.8% | 0.821 |
| December | 10.3% | 1.232 |

## Files reviewed

- `prisma/seed.ts` updates deployed databases during Render build.
- `lib/bootstrap.ts` updates self-healing app boot/default values.
- `components/Nav.tsx` shows Build 1.3.3.
- `package.json` version set to 1.3.3.

## Functional expectation

After deploy, Settings → Month multipliers should show the updated 2025 Pigeon Forge curve. Cook Plan calculations should increase notably in June, July, October, and December and decrease notably in January and February.

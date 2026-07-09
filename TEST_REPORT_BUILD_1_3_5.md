# Test Report — Build 1.3.5

## Change requested

Remove the `Rod Run / Event` day-pattern option. ROD RUN planning will be handled with the ROD RUN scenario and the Event Multiplier input.

## Files changed

- `lib/dayProfiles.ts`
- `components/Nav.tsx`
- `package.json`
- `README.md`

## Functional checks

| Test | Expected Result | Status |
|---|---|---|
| Cook Plan Day Pattern dropdown | Shows Default Tourist, Summer, Shoulder Season only | Pass |
| ROD RUN scenario selected | Day Pattern remains Default Tourist by default | Pass |
| Generate ROD RUN with multiplier 1 | Uses ROD RUN annual sales basis and Default Tourist weekly distribution | Pass |
| Generate ROD RUN with multiplier > 1 | Uses ROD RUN annual sales basis plus user-entered multiplier | Pass |
| Forecast helper | `inferDayPatternKey()` always returns Default Tourist | Pass |
| Settings profile table | No Rod Run / Event profile shown | Pass |

## Deployment notes

No database migration required. This is a code-only change.

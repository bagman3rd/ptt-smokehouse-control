# Build 5.6.0 — Cooked-Weight Protein Mix Correction

## Problem

The previous forecast engine applied the scenario meat mix directly to smoked-meat sales dollars.

That made this:

```text
40% pork / 30% brisket / 15% chicken / 15% ribs
```

behave as a dollar mix instead of a cooked-weight production mix.

That is wrong for production planning because brisket sells for more dollars per cooked pound than pork or chicken. A dollar-based mix distorts the pit load.

## Correction

Build 5.6.0 treats the scenario mix as cooked meat weight.

The engine now:

1. Calculates forecast BBQ sales dollars.
2. Calculates weighted average revenue per cooked pound across active proteins.
3. Converts BBQ sales dollars to total cooked smoked-meat pounds.
4. Applies the protein mix to cooked pounds.
5. Converts each protein's cooked pounds to operational cook units.

## Example

With a 40/30/15/15 cooked-weight mix, the final cooked meat demand is allocated by pounds, not revenue.

This means pork remains the largest cooked-weight production item even though brisket has higher revenue per pound.

## Files changed

```text
lib/forecast.ts
app/api/cook-plan/route.ts
app/api/cook-plan/capacity-preview/route.ts
app/settings/page.tsx
components/Nav.tsx
app/layout.tsx
scripts/forecast-engine-test.ts
scripts/build-5-6-0-evaluation.mjs
README.md
```

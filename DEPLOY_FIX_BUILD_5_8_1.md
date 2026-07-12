# Build 5.8.1 — Deploy Fix

This build keeps the 5.7.0 smoker catalog audit and 5.8.0 UX/regression cleanup, then fixes the smoker form TypeScript deploy blocker seen on Render.

## Error fixed

`Type 'number | null' is not assignable to type 'string | number | readonly string[] | undefined'`

## Root cause

`SmokerCatalog` capacity fields became nullable in the official-only catalog audit. The edit smoker form used fallback expressions that could still return `null` into number input `defaultValue`.

## Correction

All nullable smoker number defaults now pass through `preferredNumberInput()`, which returns only a number or an empty string.

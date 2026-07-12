# Smokehouse Control — Build 5.6.0

Build 5.6.0 is the **Cooked-Weight Protein Mix Correction** build.

## Critical forecasting correction

Protein mix percentages are now treated as **cooked meat weight mix**, not dollar mix.

For example:

- Pulled Pork: 40% of cooked smoked-meat pounds
- Brisket: 30% of cooked smoked-meat pounds
- Pulled Chicken: 15% of cooked smoked-meat pounds
- Ribs: 15% of cooked smoked-meat pounds

The app still starts with projected BBQ sales dollars, but it now converts those dollars into total cooked smoked-meat pounds using the weighted average revenue per cooked pound across the active proteins. It then applies the 40/30/15/15 mix by cooked pounds.

That fixes the prior behavior where high-dollar brisket could be overrepresented because the mix was being applied directly to sales dollars.

## Forecast method

1. Calculate total daily sales.
2. Apply smoked-meat sales percent.
3. Convert smoked-meat sales dollars to total cooked smoked-meat pounds.
4. Apply the protein mix by cooked weight.
5. Convert cooked pounds to operational units:
   - Briskets
   - Pork butts
   - Rib racks
   - Chicken breasts
6. Apply safety factor.
7. Subtract prior EOD leftovers.
8. Clamp to protein min/max settings.

## UI cleanup

The top navigation now shows:

```text
Smokehouse Control
```

instead of:

```text
PTT Smokehouse Control
```

The app can still support Pigeon Toed Tavern as the default restaurant, but the product header is now generic for multi-tenant/commercial use.

## Testing

Static evaluation scripts verify:

- Package version is 5.6.0.
- Nav badge shows Build 5.6.0.
- Top nav does not show PTT Smokehouse Control.
- Forecast engine no longer splits BBQ dollars directly by protein mix percentage.
- Cook plan and capacity preview pass all active proteins into the forecast engine.
- Settings page labels protein mix as cooked-weight mix.
- Render build still uses `prisma migrate deploy`.
- Render build does not use `prisma db push`.
- No `--accept-data-loss` exists in package scripts.

## Deploy

Use the normal flow:

```text
ZIP → File Explorer copy/replace → GitHub Desktop commit/push → GitHub Actions → Render Manual Deploy
```

Commit message:

```text
Build 5.6.0 cooked-weight protein mix correction
```

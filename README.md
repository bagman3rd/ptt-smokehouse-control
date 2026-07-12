# Smokehouse Control — Build 5.3.0

Build 5.3.0 is the **POS Integration** build.

## Purpose

This release reduces manual entry friction by adding item-level POS CSV import, menu-item mapping to smoked proteins, protein-level preview before import, POS import history, and POS data backup/export coverage.

## Major changes

### POS menu-item mapping

New Prisma model:

```text
MenuItemMapping
```

Each restaurant can map POS item names to smoked proteins with:

- POS item name
- normalized item name
- protein
- cooked portion size in pounds
- yield factor
- active/inactive status

### POS item-sales import

New Prisma models:

```text
PosImportBatch
PosImportRow
```

The import workflow supports CSV from Toast, Square, Clover, or spreadsheets.

Required format:

```csv
date,itemName,quantity,grossSales
2026-07-01,Brisket Plate,18,540
2026-07-01,Pulled Pork Sandwich,42,714
```

### POS preview before import

The POS page now previews:

- rows found
- valid rows
- invalid rows
- unmapped rows
- gross sales
- mapped cooked pounds
- sales by protein
- unmapped item warnings

### Learning/data foundation

Imported POS rows are stored at item level. Mapped rows estimate cooked pounds by protein, creating the foundation for better forecast training and POS-vs-EOD reconciliation.

### Backup/export coverage

Tenant export and backup JSON now include:

- menuItemMappings
- posImportBatches
- posImportRows

## Deploy command

Render build command stays:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## New scripts

```bash
pnpm run test:pos-import
pnpm run build:eval
```

## Commit message

```text
Build 5.3.0 POS integration and menu item mapping
```

## Important limitation

This is CSV-first POS integration. Direct Toast/Square/Clover API sync should come later after the item-mapping workflow proves itself in staging and live restaurant use.

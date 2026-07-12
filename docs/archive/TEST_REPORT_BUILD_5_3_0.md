# Test Report — Build 5.3.0

## Static checks completed

- Package version updated to 5.3.0.
- README/Nav version references updated to Build 5.3.0.
- Prisma schema includes MenuItemMapping, PosImportBatch, and PosImportRow.
- Migration added: 20260712000400_build_530_pos_integration.
- POS page includes mapping, CSV preview, import confirmation, and recent import batches.
- POS import library parses item-level CSV and summarizes sales by protein.
- Tenant guard includes POS models.
- Tenant backup/export includes POS models.

## Manual staging tests required

1. Deploy to staging first.
2. Open Admin → Restaurants → POS / Sales Import.
3. Add mappings for Brisket Plate and Pulled Pork Sandwich.
4. Paste the sample CSV.
5. Confirm import.
6. Verify a PosImportBatch exists.
7. Verify draft EOD total sales were created/updated.
8. Verify tenant export includes menuItemMappings, posImportBatches, and posImportRows.

## Known limitation

This is CSV-first POS integration. Direct Toast/Square/Clover API sync should be a later build after the CSV workflow proves the mapping model.

# Smokehouse Control — Build 6.7.0

## Top-10 restaurant POS integration release

Build 6.7.0 adds a vendor-neutral POS integration platform for Clover, Toast, Square for Restaurants, Oracle MICROS/Simphony, NCR Voyix Aloha, SpotOn Restaurant, TouchBistro, Lightspeed Restaurant, PAR Brink, and Shift4 SkyTab/Revel.

### Included
- Tenant-scoped POS connections and restaurant/location mapping
- AES-256-GCM credential encryption using `POS_ENCRYPTION_KEY` (or `AUTH_SECRET` fallback)
- Catalog/menu item synchronization model
- Normalized order-line/item-mix storage
- Gross sales, discounts, refunds, net sales, voids, channels, and modifiers
- Existing menu-item-to-protein mapping reused for estimated cooked-pound consumption
- Duplicate-safe upserts keyed by connection, external order, and external line
- Sync-run history with read/write/duplicate/unmapped counts and sales reconciliation totals
- Manual sync controls and connection/disconnection workflow
- Fully testable demo connector for all ten providers
- Existing universal CSV import retained as the fallback for unsupported exports and pre-approval customers
- Tenant guard coverage and a Build 6.7.0 static integration test

### Production vendor access
The application architecture is complete, but live credentials are vendor-controlled. Toast, Oracle, NCR, TouchBistro, PAR, and some other providers may require partner approval, customer authorization, allowlisting, or vendor-specific contract access. The UI deliberately prevents a configured live connection from pretending it has completed a successful sync before those credentials are validated.

### Deployment
1. Set a long random `POS_ENCRYPTION_KEY` in Render.
2. Deploy normally with `pnpm run render-build`.
3. Prisma applies migration `20260712001100_build_670_top10_pos_integrations`.
4. Open **Admin → POS Import** and configure a provider in Demo mode first.
5. Add live credentials only after vendor approval and endpoint validation.

## 6.6.1 corrective-base update

This package was regenerated from the user-supplied Build 6.6.1 corrective base. It preserves the Quick EOD protein-code fallback and keeps all eight EOD number fields editable unless the report is locked. Release health endpoints, CI labels, monitoring headers, and preflight version checks were also corrected to report Build 6.7.0.

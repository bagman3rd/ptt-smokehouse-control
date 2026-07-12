# Build 5.5.0 — Commercial Smoker Catalog

Build 5.5.0 adds a preloaded smoker catalog for Ole Hickory Pits, Southern Pride, J&R Manufacturing, Cookshack, and M&M BBQ Company.

## New database table

`SmokerCatalog` stores brand/model-level defaults:

- brand
- model
- series
- smoker type
- fuel type
- rack count
- rack dimensions
- cooking area
- brisket capacity
- pork butt capacity
- rib rack capacity
- chicken breast capacity
- cook window
- notes
- source URL/label
- source confidence: OFFICIAL, RESEARCHED, or ESTIMATED

## Smoker page behavior

On `/admin/smokers`:

1. Select a catalog model from the dropdown.
2. Brand/model populate automatically.
3. Rack count and capacities auto-load.
4. Operator can override the capacity values before saving.
5. Saved smoker remains linked to the catalog record through `catalogId`.

## Catalog page

`/admin/smokers/catalog` displays all catalog rows grouped by brand with source confidence and notes.

## Research caution

Manufacturer pages often publish rack dimensions or total weight capacity rather than every BBQ-specific protein count. Build 5.5.0 marks rows as:

- `OFFICIAL`: direct manufacturer protein capacity published.
- `RESEARCHED`: manufacturer rack/surface data published, protein-specific values derived from comparable rack class.
- `ESTIMATED`: model included for planning, but exact spec sheet should be verified before purchase.

For purchasing decisions, always confirm the exact current model-year spec sheet, rack option, venting/hood requirement, gas/electric configuration, and NSF/ETL listing with the manufacturer or dealer.

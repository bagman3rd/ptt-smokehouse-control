# PTT Smokehouse Control — Build 11.2.0

## Setup and Master Data

Build 11.2.0 implements the Master Plan stage for restaurant setup, locations, products, units, yields, smokers, capacities, cook windows, roles and onboarding validation.

### Acceptance statement

A fresh tenant and location can be configured through approved application workflows without direct database edits.

## Implemented

1. Canonical PTT master-data contract.
2. Exact smoker-location and cook-window value controls.
3. Canonical role and authority definitions.
4. Core product, unit, yield, carryover and operating-day rules.
5. Approved baseline smoker records and unresolved-capacity flags.
6. Generated Admin Setup Center linked to detected application routes.
7. Prisma, route, page, field and value evidence mapping.
8. Fresh-tenant staging configuration template.
9. Fresh-tenant role-based UAT workbook.
10. Static findings register and SHA-256 evidence manifest.
11. Optional read-only production/staging database schema inspection.
12. Dedicated GitHub Actions evidence workflow.
13. Render build identity updated to 11.2.0.
14. Cumulative inclusion of Build 11.1.0 application inventory controls.

## Canonical controls

- Core products: brisket, pork, ribs and pulled chicken.
- Pork yield baseline: 55%.
- Chicken yield baseline: 75%.
- Rib yield baseline: 90%.
- Brisket yield: configurable and effective-dated; no unstated hard-coded value.
- Ribs: displayed in racks with retained raw/cooked weight.
- Chicken: one 2.5 lb whole-bird-equivalent double breast equals one smoker-space unit.
- Sealed inventory: non-negative whole units.
- Open inventory: cooked pounds.
- Sealed brisket: no next-day carryover credit.
- Sealed pork, ribs and chicken: eligible for approved prior-day carryover credit.
- Carryover history: ten days visible; prior-day credit only.
- Service hours: 11:00 a.m.–10:00 p.m. daily.
- Sunday pork and brisket loads use Monday demand.

## Smoker location values

- Outdoor
- Indoors under hood
- In the wall
- Outdoors in smoke house

## Cook-window values

- Overnight only
- Same-day only
- All day / flexible
- Backup / overflow only
- Not currently active

## Safety boundary

This build does not add a database migration, change dependencies, invent unresolved smoker capacities, or alter forecast/production/EOD calculations. The database-readiness script is read-only. Fresh-tenant acceptance must be completed through the deployed application in isolated staging.

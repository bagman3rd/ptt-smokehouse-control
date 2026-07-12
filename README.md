# Smokehouse Control — Build 5.5.0

Build 5.5.0 is the **Commercial Smoker Catalog + Auto-Capacity Selection** build. It adds a researched smoker catalog table and lets operators pick brand/model from a dropdown so rack count and protein capacities auto-load on the Smoker Capacity page.

## Purpose

This release makes the product easier to demo, explain, train, and sell. It adds a guided tour, expanded help docs, a sales one-pager, and a stronger synthetic demo dataset.

## Major changes

### Guided tour

New page:

```text
/tour
```

The tour walks users through:

- Today Command Center
- Cook Plan
- Print Pit Sheet
- End of Day
- Reports
- Learning
- Forecast Proof
- POS Import
- Smoker Schedule
- System verification

### Sales package

New page:

```text
/sales
```

The page explains the product around the core value propositions:

- Reduce BBQ waste
- Prevent sellouts
- Standardize pitmaster decisions
- Prove improvement
- Train from real data
- Run multiple restaurants

### Expanded Help page

The Help page now includes practical operator docs:

- What is a load date?
- Why pork uses tomorrow
- Why brisket uses tomorrow
- How leftovers affect plans
- How forecast confidence works
- How to import POS sales
- How to add smokers
- How to add users
- How to read reports
- What to do when Wi-Fi fails during EOD

### Improved Demo page

The Demo page now clearly explains what the demo creates and links to the tour and sales package.

Demo Mode now creates 90 days of synthetic EOD history instead of four weeks.

## Deploy command

Render build command stays:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## New scripts

```bash
pnpm run test:demo-docs
pnpm run build:eval
```

## Commit message

```text
Build 5.5.0 commercial smoker catalog and auto-capacity selection
```

## Important limitation

The demo data is synthetic. The app still needs real PTT operating data to prove final forecast accuracy and learning recommendations in production.

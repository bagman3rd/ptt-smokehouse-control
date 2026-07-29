# Build 11.2.0 Master Data Acceptance

## Release requirement

A fresh tenant and location must be configured through approved application workflows without direct SQL, Prisma Studio edits, database-console edits or manual table mutation.

## Required configuration

- Restaurant name, timezone, status and operating hours.
- At least one active location.
- Brisket, pork, ribs and pulled chicken.
- Approved display units, raw/cooked conversion inputs and effective-dated yields.
- Carryover eligibility and inventory unit rules.
- Ole Hickory EL-ED/X and Southern Pride SPK-700.
- Exact smoker-location and cook-window values.
- Capacity rules that distinguish validated from unresolved values.
- ADMIN, OWNER, KM, KC, PITMASTER and VIEWER memberships.
- Configuration version, actor, timestamp and audit evidence.

## Release gates

- No open P0 or P1 defect.
- No tenant-isolation failure.
- No server-side authorization failure.
- No unapproved direct database setup step.
- No silent rewrite of historical approved calculations.
- No invented unresolved smoker capacity represented as approved.
- Owner/KM operational terminology approval.
- Exact Git revision, Render deploy and evidence artifact recorded.

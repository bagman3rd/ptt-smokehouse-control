# Build 7.2.2 — Full Application Recovery

Authoritative baseline: Build 7.0.1.

This release preserves all 31 page routes and reapplies only validated defect fixes from 7.2.x:
- unknown roles fail closed to Kitchen Crew;
- invalid and negative EOD values are rejected;
- quick EOD sealed counts remain integer-only;
- concurrent EOD protein writes use transactional upserts and a database uniqueness constraint;
- non-tenant authentication failures are retained in SecurityEvent;
- password and 2FA changes rotate durable sessions cleanly;
- current-session revocation requires normal sign-out;
- stale POS integrationActions.ts is overwritten by a compile-safe compatibility shim.

No 7.0.1 page or navigation route was intentionally removed.

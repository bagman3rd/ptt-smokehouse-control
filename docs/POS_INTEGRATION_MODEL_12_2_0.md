# POS Integration Model — Build 12.2.0

Every provider event must identify provider, provider event ID, tenant, application location, provider location, business date, currency, source total, and source lines.

The provider location must map to the same active application location. Cross-tenant and cross-location imports are rejected.

The idempotency key is:

`provider + tenantId + locationId + providerEventId`

Each line also requires a unique order/line identity. A repeated provider event or line cannot create a second durable record.

# Build 3.5.0 Rate Limit and Staging Test Notes

## Rate limiter status

The current rate limiter is intentionally simple and in-memory.

That is acceptable while the app runs as a single Render web service instance. It is not a commercial-scale solution.

## Scaling risk

If Render is scaled to multiple instances, each instance will keep its own independent count. A nominal limit of 10 requests per minute on two instances can effectively become about 20 requests per minute, depending on load balancing.

## Required later fix

Before horizontal scaling or broader public launch, replace the in-memory limiter with a shared backing store:

- Redis
- Upstash Redis
- Postgres-backed rate-limit table
- Render-compatible external cache

## Staging test status

The following scripts exist and are wired:

```bash
pnpm run test:tenant
pnpm run test:backup
```

They require a live staging `DATABASE_URL`. Static evaluation cannot prove a real database restore or tenant-isolation pass.

Before onboarding the first outside customer, run both scripts against staging and record the results in a test report.

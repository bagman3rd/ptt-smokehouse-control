# Build 7.7.2 local verification

Verified locally:

- package version is 7.7.2
- Node engine range accepts 20.20.2
- Node engine range accepts 22.16.0
- Node engine range rejects unsupported Node 18
- Node engine range rejects Node 23+
- Render and CI configuration files remain present
- Build 7.7.0 tenant-scoped EOD migration remains intact
- flat ZIP packaging

The full dependency installation, Prisma generation, migration replay, Next.js build, PostgreSQL integration suite, and Playwright suite must run in GitHub Actions and Render.

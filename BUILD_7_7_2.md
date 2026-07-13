# Build 7.7.2

Build 7.7.2 is a deployment-runtime compatibility patch based on Build 7.7.1.

## Fix

The existing Render service was configured in the Render dashboard with `NODE_VERSION=20.20.2`. That service-level value overrides the value committed in `render.yaml`. Build 7.7.1 constrained `engines.node` to `22.x`, so pnpm rejected the otherwise supported Node 20.20.2 runtime before dependency installation.

Build 7.7.2 supports both approved runtime families used by this project:

- Node 20.19.0 through Node 20.x
- Node 22.x

The repository and CI continue to prefer Node 22.16.0. Existing Render services pinned to Node 20.20.2 can also build without changing dashboard settings.

No database migration is required.

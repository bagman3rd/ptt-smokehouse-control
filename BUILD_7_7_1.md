# Build 7.7.2

## CI installation repair

Build 7.7.0 pinned Node 20.18.1 while the committed lockfile includes a package requiring Node 20.19.0+, Node 22.13.0+, or Node 24+. Because `.npmrc` enables `engine-strict=true`, `pnpm install --frozen-lockfile` correctly failed before any tests ran.

Build 7.7.2:

- pins Node 22.16.0 in CI, `.node-version`, and `.nvmrc`;
- declares Node 22.x in `package.json`;
- adds a pre-install lockfile-engine compatibility check;
- repairs the stale release evaluation that incorrectly expected the removed native `<details>` navigation;
- retains the Build 7.7.0 tenant-scoped Quick EOD migration and all application behavior.

No database migration is added in this patch.

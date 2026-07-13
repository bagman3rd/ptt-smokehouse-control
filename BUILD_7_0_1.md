# Smokehouse Control — Build 7.0.1

## Render Prisma generation correction

Build 7.0.1 fixes the false stale-client failure introduced by the Build 7.0.0 verification script.

The previous verifier searched TypeScript declaration wrapper files for the literal text `PosConnection`. With pnpm, those wrapper files may only re-export the generated client, so the check could fail even after a successful `prisma generate`.

Build 7.0.1 now:

- deletes the project-local generated Prisma client before generation;
- runs `prisma generate --schema=prisma/schema.prisma` explicitly;
- verifies Prisma's runtime DMMF contains all five POS models;
- verifies the actual `prisma.posConnection` delegate exists;
- runs this sequence before both ordinary and Render production builds.

No database schema change is included in this release.

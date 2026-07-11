# PTT Smokehouse Control — Build 2.7.1 Test Report

## Purpose

Build 2.7.1 is a patch release for Build 2.7.0.

Requested changes:

1. Grant Kitchen Crew read access to the Cook Plan page.
2. Preserve Kitchen Crew write access to End of Day logs.
3. Keep Cook Plan generation and approval restricted to Admin, Owner, and Kitchen Manager.
4. Fix the Render deploy failure caused by Prisma warning about adding a unique username constraint during `prisma db push`.

## Findings from Render failure

Render failed during `prisma db push` because Prisma warned that adding a unique constraint on `User.username` could fail if duplicate values already existed. Because the build command does not use `--accept-data-loss`, Prisma correctly stopped the deploy.

## Fixes made

- Removed the database-level `@unique` constraint from `User.username` to avoid the unsafe `db push` warning.
- Kept application-level duplicate username/email prevention when creating users.
- Left the login search using `findFirst` by username or email.
- Updated Cook Plan page access to include Kitchen Crew.
- Kitchen Crew sees the latest cook plan in read-only mode.
- Kitchen Crew cannot see the Create Forecast form.
- Kitchen Crew cannot approve cook plans or enter hot-box adjustments.
- Updated navigation so Kitchen Crew sees the Cook Plan link.
- Fixed API auth helper usage so API routes return the auth response directly instead of wrapping a `NextResponse` object in JSON.

## Access matrix verified by inspection

| Page / Action | Admin | Owner | Kitchen Manager | Kitchen Crew |
|---|---:|---:|---:|---:|
| Dashboard | Yes | Yes | Yes | Yes |
| Cook Plan page | Yes | Yes | Yes | Read only |
| Generate Cook Plan | Yes | Yes | Yes | No |
| Approve Cook Plan | Yes | Yes | Yes | No |
| End of Day | Yes | Yes | Yes | Yes |
| Reports | Yes | Yes | Yes | No |
| Learning | Yes | Yes | Yes | No |
| Settings | Yes | Yes | No | No |
| User Management | Yes | Yes | No | No |

## Static checks completed

- Version updated to 2.7.1.
- Navigation badge updated to Build 2.7.1.
- `User.username` no longer has a Prisma `@unique` constraint.
- User creation checks duplicate username/email at the application level.
- Cook Plan page allows Kitchen Crew role.
- Cook Plan page uses `canManagePlan` to hide generation and approval controls from Kitchen Crew.
- Cook Plan API remains restricted to Admin, Owner, and Kitchen Manager.
- End-of-Day API still allows Kitchen Crew.
- API auth responses are returned directly.
- Render build command still does not use `--accept-data-loss`.

## Recommendation

Build 2.7.1 should deploy cleanly without adding `--accept-data-loss`. Before commercial use, move from `prisma db push` to real migrations and then reintroduce database-level uniqueness with a controlled migration after duplicate cleanup.

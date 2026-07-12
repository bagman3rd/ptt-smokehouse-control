# TEST REPORT — Build 2.7.0

Build 2.7.0 was evaluated as a role-based access-control release on top of Build 2.6.0.

## Use cases tested by static inspection and evaluation script

1. Initial admin login
   - Username: admin
   - Password: Render ADMIN_PASSWORD
   - Admin user is seeded with a PBKDF2 password hash.

2. Add individual users
   - Admin/Owner can create users from /admin/users.
   - Each user has name, username, email, password hash, role, and active flag.

3. Role-based navigation
   - Admin/Owner see Dashboard, Cook Plan, End of Day, Reports, Learning, Settings, Users.
   - Kitchen Manager sees Dashboard, Cook Plan, End of Day, Reports, Learning.
   - Kitchen Crew sees Dashboard and End of Day.

4. Role-based page protection
   - Settings and Users are Admin/Owner only.
   - Cook Plan is Admin/Owner/Kitchen Manager only.
   - End of Day is available to all active roles.
   - Reports/Learning are Admin/Owner/Kitchen Manager only.

5. Role-based API protection
   - Cook-plan generation requires Admin/Owner/Kitchen Manager.
   - End-of-day write access allows Kitchen Crew.
   - Full backup export requires Admin/Owner.

6. Password handling
   - No plaintext user passwords are stored.
   - Passwords are hashed with PBKDF2-SHA256.
   - Session cookies are per-user and HMAC-signed.

## Evaluation script result

`node scripts/build-2-evaluation.mjs` passed.

## Known limitations

- Full Next.js production build was not run in this sandbox because npm/pnpm package downloads are blocked here.
- This build still uses `prisma db push` for Render schema sync. Before live service history becomes valuable, switch to tracked migrations.
- Role permissions are app-wide, not restaurant-specific. Multi-restaurant SaaS still needs restaurantId tenancy.

## Recommendations

1. Add AuditLog for user creation, role changes, password resets, EOD saves, cook-plan approvals, and setting changes.
2. Add forced password change on first login for new users.
3. Add password reset/invite flow.
4. Add Restaurant/restaurantId groundwork before selling to multiple BBQ restaurants.
5. Add report-level permissions later if owners want kitchen managers excluded from financial reports.

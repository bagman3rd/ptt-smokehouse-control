# Build 7.9.0

## Smoker deletion
- Admin and Owner users can permanently delete a smoker from Admin → Smokers.
- Deletion requires an explicit browser confirmation.
- The server action re-checks role, active restaurant membership, smoker ownership, and deletion count.
- Deletion is tenant-scoped with `deleteMany({ where: { id, restaurantId } })`.
- A DELETE audit-log event stores the removed smoker record.
- Smoker management, smoker schedule, Today, Dashboard, and System pages are revalidated after deletion.

## Tests
- Static smoker-delete contract test.
- Playwright create/cancel/confirm/delete workflow.
- Existing interactive-control and authorization suites remain intact.

No database migration is required.

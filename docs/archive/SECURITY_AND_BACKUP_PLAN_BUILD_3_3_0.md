# Build 3.3.0 Security and Backup Plan

## Added in this build

- Login/signup/API rate limiting.
- Zod validation for key public and write endpoints.
- Per-tenant JSON export.
- Tenant soft-delete path.
- Audit log entries for signup, demo creation, sales import, tenant export, and tenant deactivation.
- Demo data mode for prospects.
- Self-service signup and generic BBQ defaults.

## Still required before first external paying customer

- Restore drill on a staging database every release cycle.
- Hard-delete retention policy after tenant deactivation.
- Real email verification and password reset.
- Toast OAuth integration or scheduled CSV import.
- Formal privacy/data processing terms.

# Multi-Location Authorization — Build 12.1.0

Authorization evaluates user membership, membership status, tenant, location assignment, role, and action.

ADMIN and OWNER can access all authorized tenant locations. KM can manage assigned locations. PITMASTER and KC receive operational permissions for assigned locations. VIEWER remains read-only.

Every direct URL and API request must repeat the server-side tenant/location check. Cross-tenant access is always rejected.

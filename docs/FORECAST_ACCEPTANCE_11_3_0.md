# Build 11.3.0 Forecast Acceptance

## Release gate

Known test scenarios reproduce expected demand calculations, and the deployed workflow proves authorization, tenant isolation, auditability and approval behavior.

## Required acceptance

- F-001 through F-008 reproduce expected outputs.
- Day of week is derived from the operating/service date.
- Monthly and event adjustments are visible and explained.
- Manual adjustment requires a reason.
- Original automatic demand and final adjusted demand remain visible.
- Confidence score and warning causes are understandable.
- KM/OWNER approval rights are enforced server-side.
- KC/VIEWER cannot approve or mutate privileged forecast fields.
- Approval is idempotent.
- Approved records retain calculation version and historical inputs.
- Tenant A cannot access tenant B forecasts.
- Provider outages do not block manual forecast calculation.
- No open P0/P1 defect remains.

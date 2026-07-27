# Smokehouse Control — Tier 1 UAT Traceability Matrix

**Build:** 11.0.2 · **Standard:** Master Testing Plan v3.0 Part V (Part V)

Disposition legend: `PASSED_AUTOMATED` (in-repo automated evidence, green in CI) · `PENDING` (needs execution/evidence) · `PENDING_EXTERNAL` (requires staging run or human session) · `NOT_APPLICABLE` · `BLOCKED` · `FAILED`. Per §50.3, "not tested" is not acceptable for release — every item below carries a disposition.

## Coverage summary

| Metric | Count |
|---|---|
| Routes inventoried | 34 |
| Controls inventoried | 423 |
| Critical journeys | 12 |
| Journeys with automated evidence | 12/12 |
| Requirements traced | 12 |
| Requirements automated | 9/12 |
| Requirements pending external (staging/human) | 3 |

## Critical journeys (§56)

| ID | Journey | Roles | Disposition | Evidence |
|---|---|---|---|---|
| J1 | Owner signup → trial → first cook plan | OWNER | PASSED_AUTOMATED | e2e/core-workflow.spec.ts<br>app/api/signup/route.ts |
| J2 | Create & publish cook plan | ADMIN, OWNER, KITCHEN_MANAGER | PASSED_AUTOMATED | e2e/core-workflow.spec.ts<br>scripts/generate-plan-regression-test.mjs |
| J3 | End-of-day submission + carryover | KITCHEN_MANAGER, KITCHEN_CREW | PASSED_AUTOMATED | e2e/eod-lifecycle.spec.ts<br>scripts/quick-eod-carryover-test.mjs |
| J4 | Generate & export report | ADMIN, OWNER | PASSED_AUTOMATED | scripts/report-rollup-contract-test.mjs<br>app/api/account/export/route.ts |
| J5 | Tenant isolation (cross-tenant denied) | ALL | PASSED_AUTOMATED | e2e/tenant-guard-contract.spec.ts<br>scripts/cross-tenant-regression-test.mjs<br>scripts/tenant-guard-coverage-test.mjs |
| J6 | Role/permission enforcement (URL + API) | ALL | PASSED_AUTOMATED | scripts/permission-boundary-test.mjs<br>scripts/authorization-coverage-test.mjs<br>scripts/api-role-contract-test.mjs |
| J7 | Subscription billing lifecycle (webhook idempotency) | OWNER, SYSTEM | PASSED_AUTOMATED | app/api/webhooks/stripe/route.ts<br>scripts/payment-webhook-contract-test.ts |
| J8 | Notification consent + quiet hours + unsubscribe | SYSTEM | PASSED_AUTOMATED | scripts/notification-contract-test.ts<br>scripts/compliance-logic-test.ts |
| J9 | GDPR data export + account deletion | ADMIN, OWNER | PASSED_AUTOMATED | app/api/account/export/route.ts<br>app/account/privacy/actions.ts<br>scripts/hardening-contract-test.ts |
| J10 | AI assistant cost cap + injection defense | ALL | PASSED_AUTOMATED | scripts/hardening-contract-test.ts<br>scripts/archer-chat-contract-test.mjs |
| J11 | POS import mapping + reconciliation | ADMIN, OWNER | PASSED_AUTOMATED | scripts/pos-import-mapping-test.mjs<br>e2e/pos-integration.spec.ts |
| J12 | Backup + restore drill | SYSTEM | PASSED_AUTOMATED | scripts/database-restore-drill.mjs |

## Requirements traceability (§52)

| Req | Requirement | Critical | Journeys | Disposition | Note |
|---|---|---|---|---|---|
| R-TENANT | Tenant A can never access Tenant B data (stop condition) | Yes | J5 | PASSED_AUTOMATED |  |
| R-PAY-IDEMP | A payment/webhook event can never be applied twice (stop condition) | Yes | J7 | PASSED_AUTOMATED |  |
| R-PAY-STATUS | A successful payment is never represented as failed & refund status correct | Yes | J7 | PASSED_AUTOMATED |  |
| R-AUTHZ | Authentication/authorization cannot be materially bypassed | Yes | J6 | PASSED_AUTOMATED |  |
| R-TCPA | Marketing messages require opt-in; STOP honored; quiet hours enforced | Yes | J8 | PASSED_AUTOMATED |  |
| R-GDPR | Users can export data and delete account; erasure preserves audit | Yes | J9 | PASSED_AUTOMATED |  |
| R-AICOST | AI spend capped per conversation and per restaurant per day | Yes | J10 | PASSED_AUTOMATED |  |
| R-EOD | End-of-day carryover rule computes correctly | Yes | J3 | PASSED_AUTOMATED |  |
| R-BACKUP | Backup can be restored and verified | Yes | J12 | PASSED_AUTOMATED |  |
| R-SCALE | 100k-user capacity model profiles pass §64 thresholds | Yes | — | PENDING_EXTERNAL | load/k6-capacity-model.js (run on staging) |
| R-PERF | Performance thresholds (§27.1) gate the release | Yes | — | PENDING_EXTERNAL | scripts/performance-budget-check.mjs + Lighthouse |
| R-NOVICE | 12+ novice users complete critical tasks unassisted (§57) | Yes | — | PENDING_EXTERNAL | docs/UAT_NOVICE_PROTOCOL.md (human execution) |

## Route inventory (§53)

Every route requires a per-screen disposition in UAT (see Appendix D checklist). Automated interaction coverage is enforced by `e2e/interaction-manifest.spec.ts`.

| Route | Source |
|---|---|
| / | app/page.tsx |
| /account/privacy | app/account/privacy/page.tsx |
| /account/privacy/confirm-delete | app/account/privacy/confirm-delete/page.tsx |
| /account/security | app/account/security/page.tsx |
| /admin/audit | app/admin/audit/page.tsx |
| /admin/data | app/admin/data/page.tsx |
| /admin/observability | app/admin/observability/page.tsx |
| /admin/restaurants | app/admin/restaurants/page.tsx |
| /admin/restaurants/pos | app/admin/restaurants/pos/page.tsx |
| /admin/restaurants/setup | app/admin/restaurants/setup/page.tsx |
| /admin/smokers | app/admin/smokers/page.tsx |
| /admin/smokers/catalog | app/admin/smokers/catalog/page.tsx |
| /admin/smokers/schedule | app/admin/smokers/schedule/page.tsx |
| /admin/system | app/admin/system/page.tsx |
| /admin/users | app/admin/users/page.tsx |
| /billing | app/billing/page.tsx |
| /cook-plan | app/cook-plan/page.tsx |
| /cook-plan/print | app/cook-plan/print/page.tsx |
| /dashboard | app/dashboard/page.tsx |
| /demo | app/demo/page.tsx |
| /end-of-day | app/end-of-day/page.tsx |
| /help | app/help/page.tsx |
| /learning | app/learning/page.tsx |
| /learning/proof | app/learning/proof/page.tsx |
| /login | app/login/page.tsx |
| /privacy | app/privacy/page.tsx |
| /reports | app/reports/page.tsx |
| /sales | app/sales/page.tsx |
| /settings | app/settings/page.tsx |
| /signup | app/signup/page.tsx |
| /support | app/support/page.tsx |
| /terms | app/terms/page.tsx |
| /today | app/today/page.tsx |
| /tour | app/tour/page.tsx |

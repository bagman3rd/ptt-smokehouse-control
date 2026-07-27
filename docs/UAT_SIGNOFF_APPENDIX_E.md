# Appendix E — Tier 1 UAT Release Sign-Off Form (v3.0 §67)

**Product:** Smokehouse Control **Tier:** 1 (Full)
**Build/version:** 11.0.0 **Commit SHA:** ________________
**UAT environment:** ________________ **Data set:** ________________
**UAT Owner:** ________________ **Release Authority:** ________________
**Date:** ________________

The decision applies **only** to the exact build and configuration tested. Any code, migration, dependency, feature-flag, environment, permission, or integration change after approval **invalidates** this sign-off (artifact lock, §67).

## Part 1 — Entry criteria (§50.1) — must all be YES

- [ ] Requirements, roles, integrations, acceptance criteria baselined
- [ ] Exact release build deployed to production-like UAT environment
- [ ] Level 2 automated testing passes; smoke passes; no known critical engineering defect
- [ ] Migrations succeeded on production-like data; recoverable backup exists
- [ ] Route/control/form/role/journey inventories + traceability matrix complete (`docs/UAT_TRACEABILITY.md`)
- [ ] Test accounts, tenant data, payment sandbox, mail/SMS allowlists, reset procedures ready
- [ ] Expected results/authoritative sources identified for calculations, reports, permissions
- [ ] Instrumentation active (logs, error tracking, telemetry, audit, evidence storage)

## Part 2 — Stop conditions (§50.2) — must all be NO

- [ ] Tenant A could access Tenant B data/actions by any method → **must be NO**
- [ ] A payment could be charged twice / success shown as failed / refund status wrong → **must be NO**
- [ ] Testing caused data loss, corruption, irreversible migration damage, or audit loss → **must be NO**
- [ ] Authentication/authorization materially bypassed → **must be NO**
- [ ] Build too unstable to distinguish failures from noise → **must be NO**
- [ ] Test messages/charges/destructive actions reached real customers/production → **must be NO**

## Part 3 — Mandatory approval gates (§67.1)

- [ ] Entry criteria satisfied; no stop condition remains
- [ ] Every route/screen/state in scope has a disposition (no "not tested")
- [ ] Every inventoried control activated & verified or has approved N/A rationale
- [ ] Every form submitted successfully; required field/validation classes executed
- [ ] Every critical workflow passed end-to-end for each role, tenant, device class, integration path
- [ ] Novice-user thresholds (§57.3) passed; no critical task needs coaching (`docs/UAT_NOVICE_PROTOCOL.md` results attached)
- [ ] Role, permission, tenant-isolation, account-state, accessibility, mobile, browser, payment, notification, file, reporting, audit, recovery acceptance passed
- [ ] Approved 100,000-user capacity model + §64 acceptance profiles passed (`docs/CAPACITY_MODEL.md`, k6 results attached)
- [ ] Performance thresholds (§27.1) met (`performance-budget.json`, Lighthouse + bundle report attached)
- [ ] All critical & high defects closed except approved high-risk exceptions (§66.4)
- [ ] Evidence complete, reproducible, tied to exact commit/artifact/config
- [ ] Post-deploy verification, monitoring, rollback criteria, support readiness approved

## Part 4 — Evidence package references

| Evidence | Location / reference |
|---|---|
| Traceability matrix | `docs/UAT_TRACEABILITY.md` / `artifacts/uat-traceability.json` |
| Control inventory | `artifacts/interaction-manifest.json` |
| Automated CI run | GitHub Actions run ID: ____________ |
| Capacity model + k6 results | `docs/CAPACITY_MODEL.md` + attached k6 output |
| Performance/Lighthouse/bundle | attached report + `scripts/performance-budget-check.mjs` output |
| Novice-user results | attached per `docs/UAT_NOVICE_PROTOCOL.md` |
| Backup/restore drill | `scripts/database-restore-drill.mjs` output |
| Defect log + dispositions | ____________ |

## Part 5 — Decision (§67.2)

- [ ] **APPROVE** — all mandatory gates pass
- [ ] **APPROVE WITH EXPLICIT HIGH-RISK EXCEPTION** — no critical defect; documented high defect accepted with expiry, monitoring, workaround, correction commitment
- [ ] **REJECT** — one or more gates fail, evidence incomplete, scope changed, or artifact mismatch
- [ ] **RETEST REQUIRED** — corrections/config changes materially affect accepted workflows

**Accepted high-risk exceptions (if any):** ________________________________
(owner, expiry date, monitoring, workaround, correction commitment)

**UAT Owner signature:** ________________ **Date:** ________

**Release Authority signature:** ________________ **Date:** ________

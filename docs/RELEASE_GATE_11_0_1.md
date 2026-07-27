# Build 11.0.1 Release Gate

> **11.0.1 is a hotfix over 11.0.0.** It fixes a broken relative import in
> `app/account/privacy/confirm-delete/page.tsx` (imported `./actions` instead of
> `../actions`) that failed `next build` on Render with "Module not found: Can't
> resolve './actions'". A new `scripts/import-resolution-check.mjs` guard (wired
> into `ci:test` and `test:compliance`) now catches unresolved imports, missing
> page/route exports, and client/server boundary violations before deploy.

A production ZIP may be generated only by `.github/workflows/release.yml` after the exact commit completes the mandatory **Build 11.0.1 CI** workflow successfully.

## Standard automated gate (Parts I–IV)
- exact commit SHA; successful CI workflow run ID
- production build succeeds; static analysis + lint clean
- unit, API, integration, migration tests pass; schema-drift clean
- role tests + tenant-isolation tests pass (Tier 1)
- complete Playwright directory on desktop and mobile
- accessibility checks pass (Section 25) — includes **axe-core** critical/serious = zero
- security checks pass: `pnpm audit` + **gitleaks** secret scan
- **performance budget** (bundle size, §27.1) passes
- backup restore proven within 30 days; mandatory dump/restore drill
- `RELEASE_EVIDENCE.json` in the audited artifact

## Build 11.0.0 additions — Tier 1 Part V gate (§48–67)
Before a major Tier 1 release, in addition to the automated gate:

- **Traceability current** — `test:uat-traceability` passes; `docs/UAT_TRACEABILITY.md` regenerated for the exact commit; every route/control/journey/requirement has a disposition (no "not tested").
- **Payment stop-conditions cleared** — `test:payment-webhook` passes; live webhook verified in Stripe test mode: duplicate event applied once, success never shown as failed, refund status correct.
- **Observability live** — `test:observability-contract` passes; `SENTRY_DSN` (or equivalent) configured in production; deploy-health/rollback threshold set; error digest verified.
- **Capacity model executed (§64)** — k6 `normal`, `peak`, and `spike` profiles run on a **same-tier staging instance**; `endurance` + `volume` for releases affecting connections/queues/caches/memory/file/background jobs. p95<500ms, errors<1%. Results attached.
- **Performance thresholds executed (§27.1)** — Lighthouse mobile + Web Vitals (LCP<2.5s, CLS<0.1, INP<200ms) and bundle<300 KB captured and attached.
- **Novice-user acceptance (§57)** — 12+ novice participants, ≥3 per persona, ≥90% unassisted completion of critical tasks, mean ease ≥5.5/7; failures fixed-and-retested or explicitly risk-accepted. Results attached per `docs/UAT_NOVICE_PROTOCOL.md`.
- **Appendix E signed** — `docs/UAT_SIGNOFF_APPENDIX_E.md` completed; UAT Owner + Release Authority signatures; decision recorded (APPROVE / APPROVE-WITH-EXCEPTION / REJECT / RETEST). Artifact lock applies.

## Operator setup for the above
- Stripe: set `STRIPE_WEBHOOK_SECRET`, register the `/api/webhooks/stripe` endpoint, run test-mode events.
- Observability: set `SENTRY_DSN`, `DEPLOY_ERROR_ROLLBACK_THRESHOLD`, `ERROR_ALERT_THRESHOLD_24H`.
- Scale: provision a same-tier staging instance + `loadtest` account; run `load/k6-capacity-model.js`.
- Accessibility: run `test:e2e:axe` against the built app.

Local ZIPs are source-review packages and are not audited production artifacts.

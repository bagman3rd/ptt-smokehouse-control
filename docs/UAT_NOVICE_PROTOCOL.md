# Novice-User UAT Protocol (v3.0 §57, Appendix C)

**Build:** 11.0.0 · **Standard:** Master Testing Plan v3.0 Part V

This is the moderated novice-user acceptance program. It is **release-blocking** for a major Tier 1 release. It cannot be automated — it requires real, inexperienced participants — so this document defines exactly how to run it and record results so the Appendix E sign-off can reference concrete evidence.

## Participants (§57.1)

- Recruit users who **match actual customer roles** (restaurant owner, kitchen manager, pitmaster/crew) but have **not used the release candidate** and **did not design or build it**.
- **Minimum 12 participants** for a major release; **≥ 3 per critical persona**.
- Mix device confidence, age, domain experience, screen size, browser, and accessibility needs.
- Do **not** substitute engineers who know the app.

### Personas & minimum counts

| Persona | Description | Min participants |
|---|---|---|
| Owner/Operator | Signs up, configures restaurant, reads reports, manages billing | 3 |
| Kitchen Manager | Builds cook plans, reviews forecasts, manages staff | 3 |
| Kitchen Crew | Submits end-of-day logs on a shared tablet/phone | 3 |
| Occasional/Admin | Multi-location or admin oversight | 3 |

## Session protocol (§57.2)

1. Explain the **product** is being tested, not the participant. Get consent for notes/recording.
2. Start from the natural entry point (invitation, login, or a freshly created account).
3. Read a **business goal, not interface instructions**. Example: *"Set up your restaurant and create tomorrow's cook plan,"* never *"Click Cook Plan, then New."*
4. Participant **thinks aloud**. Moderator records expectations, hesitations, wrong turns, terminology confusion, recovery behavior.
5. **Do not rescue.** If blocked, record the failure and the exact prompt required, mark the task unsuccessful-without-assistance, then continue.
6. After each task, collect **perceived ease (1–7)** and what they expected to happen.
7. At the end, collect overall confidence, trust, most confusing point, missing information, and whether they could repeat the task alone.
8. **Retest** corrected usability failures with **new** novice participants.

## Critical tasks (each participant, by persona)

| Task | Persona | Success = unassisted completion + correct recognition |
|---|---|---|
| T1 | Owner | Create account, complete restaurant setup, land on dashboard |
| T2 | Owner | Find and interpret last week's report; export it |
| T3 | Owner | Locate billing status and understand trial end date |
| T4 | Kitchen Mgr | Create a cook plan for tomorrow and publish it |
| T5 | Kitchen Mgr | Adjust a protein quantity and understand the forecast change |
| T6 | Crew | Submit an end-of-day log and recognize confirmation |
| T7 | Crew | Recover from a wrong entry (edit/correct before submit) |
| T8 | All | Use the Archer assistant to answer a "how do I…" question |

## Acceptance thresholds (§57.3)

A release **passes** novice-user acceptance only when:

- **≥ 90%** of participants complete each **critical** task **unassisted**.
- **Mean perceived ease ≥ 5.5 / 7** across critical tasks.
- **No critical task** depends on moderator coaching or tribal knowledge.
- **Zero** participants experience a data-loss or trust-breaking event (charged wrong, lost work, unclear whether an action succeeded).
- Every usability **failure** has a disposition: fixed-and-retested, or an explicit accepted risk with owner + expiry.

## Evidence to capture (for Appendix E)

- Participant roster (persona, device, browser, a11y needs; no PII beyond what's needed).
- Per-task: completed unassisted (Y/N), time, ease (1–7), notable quotes.
- Aggregate: completion rate per task, mean ease, list of failures + dispositions.
- Session recordings/notes stored with the build/commit reference.

## Result log (fill per session)

```
Build/commit: ____________________  Date: __________  Moderator: __________
Participant #__  Persona: __________  Device/Browser: __________  A11y: ______
T1 [ ] unassisted  ease __/7   notes: ______________________________________
T2 [ ] unassisted  ease __/7   notes: ______________________________________
...
Overall confidence __/7  Trust __/7  Most confusing: ___________________
Could repeat alone? [ ] Yes [ ] No
```

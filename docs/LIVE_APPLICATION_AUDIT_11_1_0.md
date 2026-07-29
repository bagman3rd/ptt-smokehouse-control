# Live Application Audit — Build 11.1.0

## Objective

Prove what the deployed application actually does for each role. Static inventory establishes the test universe; this protocol establishes behavior.

## Required accounts

Use distinct test accounts for ADMIN, OWNER, KM, KC, PITMASTER and VIEWER. Do not simulate a role by manually editing cookies, local storage or database rows during the test.

## Required viewports

- Desktop: approximately 1440 × 900
- Kitchen tablet landscape: approximately 1024 × 768
- Narrow mobile verification for critical screens: approximately 390 × 844

## Execution

For every row in `live-screen-audit-workbook.csv`:

1. Sign in using the specified role.
2. Reach the screen through normal navigation.
3. Open the route directly in a new tab.
4. Record whether the page loads and whether the user is correctly allowed or denied.
5. Operate every visible button, link, menu, tab, dropdown, field, checkbox, radio, date control, modal and submission control.
6. Test required-field, invalid-value, duplicate-submission and cancellation behavior.
7. Verify loading, success, empty and error states.
8. Verify keyboard focus and touch usability.
9. Capture a screenshot for the normal state and each confirmed defect.
10. Record the final disposition: KEEP, REFACTOR, REPLACE or REMOVE.

## Defect severity

- P0: data loss/corruption, tenant exposure, critical security/payment compromise, or inability to operate the core production workflow.
- P1: major workflow failure, materially wrong production quantity, authorization failure, or unrecoverable EOD failure.
- P2: material impairment with a workable alternative.
- P3: cosmetic or low-impact issue.

Build 11.1.0 is blocked by any open P0 or P1 defect.

## Stop conditions

Stop testing and preserve evidence when:

- one tenant can see or change another tenant’s information;
- an unauthorized role can perform a privileged mutation;
- testing causes unexplained data loss or corruption;
- a production message, payment or destructive provider action is triggered unexpectedly;
- the deployed build identity does not match the tested commit.

## Completion rule

“Not tested” is not a disposition. Every inventoried screen and role combination must be marked passed, correctly denied, failed with a defect, or not applicable with a documented reason.

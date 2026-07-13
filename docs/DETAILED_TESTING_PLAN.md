# Detailed Testing Plan — Interactive Control Coverage

This plan supplements the existing unit, integration, API, database, security, migration, recovery, performance, usability, and acceptance testing requirements.

## Mandatory interaction-completeness testing

Every visible place where a user can click, tap, type, select, submit, expand, close, switch, or otherwise expect an action must be inventoried and tested. This includes:

- Every button
- Every link and navigation item
- Every dropdown trigger and every dropdown option
- Every form and submit button
- Every text, number, date, file, checkbox, radio, select, and textarea field
- Every tab, accordion, details panel, modal, drawer, tooltip trigger, pagination control, table action, print control, download/export control, and restaurant switcher
- Every keyboard-operable control
- Every mobile/touch version of each control
- Every disabled, loading, error, success, and locked state

## Required test angles for every interaction

1. Normal case — valid action produces the stated result.
2. Invalid case — bad input is rejected with a clear message.
3. Boundary case — minimum, maximum, zero, decimal, empty, and oversized values behave correctly.
4. Permission case — each role can use only the controls it is authorized to use.
5. Tenant case — a user cannot act on another restaurant's records by changing URLs, IDs, request bodies, or form values.
6. Failure case — network, server, database, timeout, or external-provider failure produces a safe recoverable state.
7. Regression case — the control still works after unrelated changes.
8. Operational case — the result makes sense in an actual restaurant workflow.
9. Accessibility case — keyboard, focus, accessible name, screen-reader semantics, and visible error identification work.
10. Responsive case — desktop, tablet, and mobile layouts remain clickable without overlap or clipping.
11. Concurrency case — double-clicks, duplicate submits, two tabs, and simultaneous users do not create duplicate or conflicting records.
12. Navigation case — the destination loads without a server error, unexpected redirect, blank screen, or loss of role context.

## Release gate

A release cannot be approved when any visible interactive control is untested. The automated suite must maintain an interaction inventory and exercise all top navigation menus and links on every release. Route-specific forms must have explicit success, validation, permission, tenant, and duplicate-submit tests. Manual acceptance must cover physical-device and browser combinations that cannot be reproduced in CI.

## Current automated coverage

Build 7.7.1 adds:

- Click testing for Operations, Insights, Admin, and Help dropdown triggers.
- Open, close, outside-click, and Escape behavior.
- Navigation through every top-menu destination.
- Server-error detection after each navigation.
- An accessible-name inventory across all primary application routes.
- Desktop and mobile execution through the existing Playwright projects.

Future screens and controls must be added to the interaction inventory in the same release that introduces them.

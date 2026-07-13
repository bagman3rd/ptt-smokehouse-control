# Build 7.4.0 — Full Application Recovery

Build 7.4.0 was rebuilt from Build 7.0.1, the last confirmed clean source tree.

## Included fixes

- Full 31-page route and navigation restoration
- Case-insensitive legacy role normalization without reopening unknown-role privilege escalation
- Build 7.2 EOD validation, concurrency, security-event, and session-rotation fixes
- Build 7.2.3 Quick EOD legacy protein carryover correction
- Build 7.3 exact Playwright carryover assertions and supported locators
- Stale POS integration compatibility shim

## Release rule

Future patches must compare complete page, navigation, and role behavior against this recovered baseline, not merely count route files.

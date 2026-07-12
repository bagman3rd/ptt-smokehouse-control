# Build 4.9.0 — Kitchen Field Usability

## Objective

Make the app more resilient and usable in a live BBQ kitchen environment, especially on phones and during closing when Wi-Fi may be unreliable.

## Included

### /today Kitchen Mode

A Kitchen Mode toggle was added to `/today`. This mode increases touch-target size, increases heading scale, and uses stronger contrast for kitchen execution.

### End-of-Day offline tolerance

The EOD form now autosaves locally every 5 seconds and preserves the last submit payload after a failed save. This is not a full offline sync engine, but it prevents the worst operational failure: a closing manager losing a full protein log during bad Wi-Fi.

### EOD closeout safeguards

The EOD form already had guided closeout and blocking validation. Build 4.9.0 adds stricter closeout behavior around 86 events and gives managers explicit restore/clear draft controls.

### Print polish

The print view is tuned for pit use: big type, high contrast, manager signoff, hot-box verification, and an EOD closeout reminder.

## Field test checklist

Run these on an actual phone before PTT pilot:

- Open `/today?kitchen=1` on phone.
- Generate or view a cook plan.
- Open `/end-of-day` and enter partial values.
- Kill Wi-Fi or refresh page.
- Confirm local EOD draft restores.
- Submit with Wi-Fi disabled and confirm failed payload is preserved.
- Reconnect and save.
- Print `/cook-plan/print` and verify it is readable in kitchen lighting.

## Remaining future work

- Full service-worker offline queue.
- SMS/email closeout reminders.
- QR code on print view to open exact EOD date.
- True smoker schedule timeline by smoker rack and time window.

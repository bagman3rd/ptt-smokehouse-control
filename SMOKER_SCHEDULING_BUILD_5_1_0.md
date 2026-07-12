# Build 5.1.0 — Smoker Scheduling + Production Constraints

## Goal

Turn smoker capacity from a warning into an execution schedule.

## Added

- `/admin/smokers/schedule`
- `lib/smokerSchedule.ts`
- `/today` smoker schedule integration
- `/cook-plan/print` schedule section
- Capacity conflict messaging
- Suggested operational fixes

## Current schedule rules

- Pork: 5:00 PM prior-day load
- Brisket: 9:00 AM–9:00 PM cook, hot hold overnight
- Ribs: same-day 8:00 AM cook window
- Chicken: same-day 10:00 AM cook window

## Known limitations

This is a deterministic schedule foundation, not a full optimizer yet. Build 5.1.0 does not yet persist protein-specific cook-cycle settings or resolve multi-smoker splits automatically. Those are future refinements after PTT field testing.

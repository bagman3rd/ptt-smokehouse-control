# Quick EOD Model — Build 11.5.0

## Required products

- Brisket
- Pork
- Ribs
- Pulled chicken

## Inputs

- Sealed quantity: nonnegative whole operational units
- Open quantity: nonnegative cooked pounds
- Optional note

## Plausibility

Where cooked-equivalent configuration is available:

`remaining cooked equivalent = open cooked pounds + sealed units × cooked weight per sealed unit`

The submission is rejected when remaining cooked equivalent exceeds completed production.

## Correction

The first submission is immutable. A manager correction:

- Requires a reason
- Preserves the prior submission
- Creates a new submission ID and version
- Records actor and timestamp
- Updates only the current effective EOD value

## Close gate

The operating date cannot close until:

- Every load is Completed or Cancelled
- No active exception remains
- Every required product has an EOD submission

## Rollover

Rollover requires a closed day and the next consecutive date. Carryover is derived from the final effective EOD submissions.

- Pork, ribs and chicken sealed units may be eligible.
- Brisket sealed units remain recorded but eligible sealed carryover is zero.
- Open cooked pounds remain separately visible.

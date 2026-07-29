# Inventory Exception Ownership — Build 11.6.0

## Lifecycle

`OPEN -> ACKNOWLEDGED -> RESOLVED`

An exception records:

- P0–P3 severity
- Summary
- Optional product
- Named owner
- Optional due timestamp
- Open, acknowledgement, and resolution actors/times
- Written resolution

## Ownership

A manager assigns the owner. Only the assigned owner acknowledges. A manager resolves.

## Close controls

- Open P0/P1 exceptions block close.
- Every unresolved exception requires an owner.
- Resolution never deletes original summary, severity, ownership, or acknowledgement history.

## Urgent actions

The board distinguishes unowned exceptions from assigned open exceptions.

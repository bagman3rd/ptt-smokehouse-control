# Today Operations Model — Build 11.5.0

## Purpose

The Today workflow is the default kitchen execution surface for the active restaurant operating date. It displays the plan in the order an operator acts, not in database order.

## Load card

Every load card contains:

- Product and operational quantity
- Unit
- Smoker
- Planned start and completion
- Actual quantity and timestamps
- Current status
- Named owner
- Next labeled action
- Notes and active exception

## Status flow

`PLANNED -> READY -> LOADED -> COOKING -> RESTING -> HOLDING -> READY_FOR_SERVICE -> COMPLETED`

`CANCELLED` is manager-controlled. `EXCEPTION` temporarily interrupts an active load and preserves the prior status for manager resolution.

A normal action advances only one valid step. A manager correction may restore a different standard status only with an append-only reason and event.

## Execution controls

- Ready-to-Loaded requires actual quantity.
- More than 10% actual-versus-plan variance requires a reason.
- Every action requires command ID, actor, role and timestamp.
- Repeated command ID returns duplicate without another mutation or event.
- Viewer is read-only.
- Operations roles can advance loads, add notes and flag exceptions.
- Manager roles control assignment, correction, resolution, cancellation, close and rollover.

## Urgent actions

The board derives, rather than manually stores:

- Unassigned active load
- Missed planned load start
- Service-readiness risk
- Active exception
- Incomplete EOD after 9:00 p.m.
- Open operating day after 10:00 p.m.

## Contingency

A versioned snapshot preserves the latest approved plan context, load state, notes, exceptions and EOD state for printing or export during transient provider or network failure.

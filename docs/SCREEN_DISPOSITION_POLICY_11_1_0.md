# Screen Disposition Policy — Build 11.1.0

## KEEP

The capability is required, correctly placed in the operating workflow, understandable to the intended role and technically sound enough to preserve. Defects may still require correction.

## REFACTOR

The capability is required, but the current implementation, information architecture, usability, performance, testability or maintainability is materially deficient. Preserve the business purpose while changing the implementation.

## REPLACE

The user outcome is required, but the current screen or workflow is not a viable foundation. Replace it with a new design or bounded implementation after preserving required data and audit history.

## REMOVE

The capability is obsolete, duplicative, misleading, unsafe, unreachable by an approved workflow or outside the product charter. Removal requires dependency review and confirmation that no retained route, job, integration or report depends on it.

## Baseline default

The static generator assigns KEEP with `PENDING_LIVE_ROLE_AUDIT`. This is a preservation default, not approval. The live audit owner must revise the disposition when evidence supports REFACTOR, REPLACE or REMOVE.

## Required evidence

Every final disposition must include:

- tested build and Git revision;
- role and route;
- observed behavior;
- screenshot or log evidence;
- confirmed dependencies;
- defect IDs where applicable;
- owner and target build for follow-up work.

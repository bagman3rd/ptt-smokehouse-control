# Build 9.1.0 — Archer visual and identity update

Build 9.1.0 updates the Archer assistant without changing the operational database schema.

## Visual changes

- Replaces the Archer avatar and full portrait with the user-approved likeness.
- Places Archer in pitmaster gear in front of large commercial smokers.
- Keeps Archer's full head visible in both avatar and portrait crops.
- Anchors the conversation at the top of the available viewport and reserves a fixed portrait area below it.
- Improves desktop and mobile sizing so the portrait does not push the composer off screen.

## Identity response

Questions such as "Who is Archer?", "What's up with the Archer guy?", and equivalent identity questions return one approved, deliberately long, teenager-style celebration of Archer. The behavior is deterministic and works with or without an OpenAI API key.

## Validation

- Identity phrases are covered by a permanent contract test.
- Ordinary support questions continue to use the normal built-in/OpenAI response path.
- No migration is required.

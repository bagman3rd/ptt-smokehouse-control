# Build 9.7.0

Build 9.7.0 fixes Archer becoming unusable after a long first response.

## Root cause
The client returned the prior conversation as API history. Archer's approved identity answer can exceed 1,200 characters, while the API limited each history entry to 1,200 characters. The second valid question was rejected because the prior answer was too long, and the generic error incorrectly blamed the new question.

## Corrections
- History entries now support up to 2,400 characters, matching Archer's maximum returned answer.
- Client history is capped to the same contract before submission.
- History validation has a distinct error message.
- Request sequencing prevents stale responses from leaving the chat busy or overwriting a newer result.
- Voice, identity responses, demo mode, visuals, and all existing support behavior are preserved.

No database migration is required.

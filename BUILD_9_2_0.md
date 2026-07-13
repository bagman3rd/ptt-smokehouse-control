# Build 9.2.0

Adds two-way browser voice support to Archer.

- Microphone dictation using the browser Web Speech API.
- Deep, slow, rugged original pitmaster speech profile using browser speech synthesis.
- Voice mute/unmute control.
- Listening, permission-denied, unsupported-browser, and transcription error states.
- Audio is not uploaded or retained by PTT; the browser converts speech into text.
- Existing typed chat and built-in fallback answers remain available.
- No database migration required.

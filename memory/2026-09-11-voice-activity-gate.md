# Voice activity gate

- **Symptom:** Low-level ambient sound could trigger Gemini Live while the user was not speaking.
- **Root cause:** `JanSewakLive` forwarded every microphone PCM chunk whenever assistant playback was idle. The existing RMS threshold protected only against playback echo.
- **Fix:** Added `VoiceActivityGate`, which requires two adjacent chunks at or above RMS 0.015 before it forwards input, preserves the first chunk as lead-in, and releases after five quiet chunks. It resets on mute, disconnect, and playback-echo gating.
- **Verification:** `npm run lint` and `npx tsc --noEmit` pass. Production build is blocked in this environment by a Turbopack process-port permission failure after clearing Google Fonts network access.

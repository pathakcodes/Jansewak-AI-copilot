# Guidance latency and highlight recovery

- Avoidable delays: first screenshot had a 300ms timer, recurring capture was limited to 1500ms with a 2500ms fallback, and saved fields required a second model tool round trip after highlighting.
- Changes: register the first-frame callback before starting capture, capture immediately after video readiness, refresh at a bounded 1000ms cadence, and emit saved-field copy chips directly after a validated highlight. Keep image resolution and voice/noise thresholds unchanged.
- Failed highlights request a fresh frame and tell Gemini to retry silently, at most twice. Success or new user input resets recovery. At the limit request a clearer view without apologizing or narrating tool failure.
- Verification: node tests/profile-copy.cjs checks validated-highlight copy output, rejected-highlight behavior, retry bounds, and reset on success/new input. Lint, TypeScript and diff whitespace checks pass.
- Limit: native speech adherence and actual end-to-end latency require a live shared-screen session; no measured model latency improvement is claimed.

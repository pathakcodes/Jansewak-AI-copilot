# Profile copy values

- Symptom: PiP showed the model's Aadhaar availability explanation instead of the saved digits; the profile input masked digits.
- Root cause: provide_text trusted generated text even when field_hint identified a saved profile field. The profile input explicitly used password type.
- Fix: Resolve known field hints from the current local profile before displaying a chip; blank saved values do not show explanatory prose. Aadhaar input uses text. Copy values wrap. Guidance instructions proactively offer the next visible empty field, wait for completion, and ignore the PiP overlay in screenshots.
- Regression: node tests/profile-copy.cjs exercises the real tool dispatcher with the reported explanation, Aadhaar's local placeholder, other profile fields, updated saved values, missing values, and unrelated composed text.
- Verification: Dispatcher regression checks and TypeScript pass. Live Gemini speech and screen-sharing behavior still require a fresh interactive session.

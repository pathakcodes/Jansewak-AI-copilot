<p align="center">
  <img src="assets/jansewak-avatar.gif" width="300" alt="JanSewak AI copilot — animated 3D assistant in a red blouse and purple saree" />
</p>

<h1 align="center">जनसेवक · JanSewak AI Copilot</h1>

<p align="center"><b>Your voice guide for sarkari websites.</b></p>

<p align="center">Built with ❤️ by <a href="https://github.com/pathakcodes"><b>pathakcodes</b></a> for the <a href="https://buildwhatmovesindia.com"><b>Build What Moves India</b></a> hackathon 🇮🇳</p>

<p align="center">
  🌐 <a href="https://jansewak.vercel.app"><b>Live app</b></a>
  &nbsp;·&nbsp; 🎬 <a href="https://jansewak.vercel.app/pitch/demo.mp4"><b>Watch the demo video</b></a>
  &nbsp;·&nbsp; 📊 <a href="https://jansewak.vercel.app/pitch/slides.html"><b>Pitch deck</b></a>
</p>

---

**[Finals PPT — Google Slides](https://docs.google.com/presentation/d/1fyeN663Pcb9NGuvyBixRQMb-B_hYvYfS9EmE6CgphsA/edit?slide=id.g3faa8b295d0_3_21#slide=id.g3faa8b295d0_3_21)**

Copy this link to open the presentation on any machine:

```text
https://docs.google.com/presentation/d/1fyeN663Pcb9NGuvyBixRQMb-B_hYvYfS9EmE6CgphsA/edit?slide=id.g3faa8b295d0_3_21#slide=id.g3faa8b295d0_3_21
```

**Your own government-work assistant.** Talk to a warm AI sahayak — a lady in a saree — in **any Indian language**, and she guides you step by step through any Indian government website: train tickets on IRCTC, PF on EPFO, Aadhaar, pensions, complaints and more.

Built for the [Build What Moves India](https://buildwhatmovesindia.com) hackathon.

## 🎬 See her in action

**[▶ Watch: JanSewak guides a citizen through a government form](https://jansewak.vercel.app/pitch/demo.mp4)** — voice conversation in Hindi, screen sharing, the always-on-top guide window highlighting each field, and one-tap copy chips filling the form.

## What she does

- 🗣️ **Voice-first** — no typing. Speak naturally; she replies with a human voice (Gemini Live native audio).
- 🌏 **Every Indian language** — start in any language, or just say "मराठी में बोलो" mid-conversation and she switches.
- 🖥️ **Screen guidance** — share your screen and a floating **always-on-top guide window** (Document Picture-in-Picture) shows your screen with **highlighted click targets**, spoken + written next steps.
- 📋 **Copy-paste form text** — tell her your details once ("my name is Shivam") and she gives exact text for each field, transliterated to the script the form needs (शिवम).
- 📁 **File tools built in** — resize/compress photos & signatures to govt limits (≤50KB, ≤20KB…) right in the guide window.
- 🏛️ **Knowledge base + internet** — seeded step-by-step guides (IRCTC booking included); for everything else she uses Google Search grounding and reads your shared screen. **Any government website works from day one.**
- 🔒 **Safety** — she never asks for OTPs, passwords, PINs or full Aadhaar numbers, and warns about scams.
- 📱 Android & iOS apps with the same capabilities — coming soon.

## Run locally

```bash
npm install
# paste your key from https://aistudio.google.com/apikey into .env.local
npm run dev
```

Open http://localhost:3000 → **बात करें** → allow the microphone → talk.

`.env.local`:

```
GEMINI_API_KEY=...            # required
GEMINI_LIVE_MODEL=...         # optional, defaults to gemini-2.5-flash-native-audio-preview-12-2025
```

## Deploy to Vercel

```bash
npx vercel
```

Then in the Vercel dashboard → Project → Settings → Environment Variables, add `GEMINI_API_KEY`. Redeploy. That's it — the app is static + one serverless route.

## How it's built

| Piece | Tech |
| --- | --- |
| App | Next.js 16 (App Router, TypeScript, Tailwind v4) |
| Voice + vision | Gemini Live API via `@google/genai`, browser ↔ Gemini WebSocket |
| Auth | `/api/token` mints **ephemeral tokens** server-side — the real API key never reaches the browser |
| Mic | AudioWorklet → 16kHz PCM16 chunks → `sendRealtimeInput` |
| Voice out | 24kHz PCM queued through WebAudio; an AnalyserNode drives the avatar's mouth |
| Screen | `getDisplayMedia` → 1 JPEG frame/sec to the model |
| Guide window | Document Picture-in-Picture (Chromium) with React portal; floating-panel fallback elsewhere |
| Agent → UI | Gemini function calls: `suggest_action`, `highlight_region` (0–1000 bbox grid), `provide_text`, `open_file_tool`, `set_language`, `lookup_knowledge` + Google Search grounding |
| Avatar | Rigged 3D GLB rendered with Three.js, with facial animation and speech-driven mouth movement |

### Adding a website to the knowledge base

Add one entry to `lib/knowledge/portals.ts` (URL, tasks, and optionally step-by-step guides). Everything else — recommendation, guidance, screen reading — works automatically.

## Demo flow (the one to show)

1. Say: *"मुझे ट्रेन टिकट बुक करनी है"* → she suggests IRCTC with an **Open** button.
2. Open it, click **Share screen**, pick the IRCTC tab, then **⧉ Pop out** the guide window over IRCTC.
3. Follow the red highlights; say *"my name is Shivam"* → a **शिवम** copy chip appears for the name field.
4. On the photo upload step she opens the file tool preset to the size limit.

> Best experienced in Chrome/Edge (Document Picture-in-Picture). Works with a floating panel in other browsers.

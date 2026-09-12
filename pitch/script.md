# JanSewak — 2-Minute Video Script

**Format per the brief:** Minute 1 = demo as a citizen · Minute 2 = how you built it and why.
**Setup before recording:** fresh Chrome profile (so the sample "Ramesh Kumar" profile is seeded), jansewak.vercel.app open, `pitch/slides.html` open in another window (press F for fullscreen), OBS/Loom capturing the screen + your mic.

---

## MINUTE 1 — The citizen demo

### 0:00–0:08 · Slide 1 (Title)
> "This is JanSewak — a sahayak you *talk to*, in any Indian language, who guides you through any government website, click by click."

### 0:08–0:16 · Slide 2 (Problem)
> "900 million Indians are online, but on a sarkari website everyone — farmer or engineer — needs a guide, and there's no one to ask. So people hunt YouTube tutorials: thousands of them, outdated, and never about *your* screen or *your* case."

### 0:16–0:20 · Slide 3 (Demo intro)
> "Watch a citizen fill an income-tax form — just by talking."

### 0:20–1:00 · LIVE DEMO (switch to jansewak.vercel.app)
Do exactly this flow — rehearse it twice first:

1. Click **बात शुरू करें** → say: **"नमस्ते, मुझे income tax का form भरना है, sample form खोलो।"**
   *(She greets, suggests the sample form → an Open card appears.)*
2. Click **खोलें/Open** → form opens → back on JanSewak click **🖥️ स्क्रीन साझा करें**, pick the form tab → click **⧉ Pop out**.
   *(Narrate over it: "She asks to see my screen — and now she guides me in a floating window that stays on top.")*
3. She highlights the Name field. Tap the **रमेश कुमार copy chip** in the guide window → paste into the form. Same for **PAN** and **mobile**.
   *(Narrate: "My details are saved on my device — one tap to copy, in the right script.")*
4. Say: **"अब मराठी में बोलो"** — she switches language mid-conversation. *(2 seconds — huge judge moment.)*
5. Click **Submit** → green success. Say to camera:
   > "No typing my details, no English, no cyber café. Sab kuch — bolkar."

---

## MINUTE 2 — How we built it, and why

### 1:00–1:08 · Slide 4 (Features)
> "So JanSewak does it all in one place: voice in every Indian language, live screen guidance, copy-ready form text, photo resizing, scheme discovery, grievance filing — on any government website, from day one."

### 1:08–1:32 · Slide 5 (How)
> "Under the hood: one browser tab connected straight to Gemini Live over WebSocket — native audio in major Indian languages. Her screen-vision comes from frames we send only when pixels change; her hands are Gemini function calls — highlight_region draws the yellow box, provide_text makes the copy chips, open_file_tool resizes photos to government KB limits. The API key never reaches the browser — single-use ephemeral tokens. And latency is engineered, not hoped for: we benchmarked configs to ~3 seconds to first word, gated out echo, and made capture survive background tabs. Built with Next.js, deployed on Vercel."

### 1:32–1:52 · Slide 6 (Why)
> "Why build it like this? Because it works on *every* government website *today* — zero changes needed from the government. It's the YouTube tutorial people already search for — except never outdated, because she reads your live screen, your case, your language. And trust is built in: her profile never leaves the device, and she refuses to handle OTPs, Aadhaar numbers or passwords."

### 1:52–2:00 · Slide 7 (Vision + close)
> "Today she guides on any screen. Tomorrow, we want government portals to expose official MCP APIs and one login for every site — making agent-driven public service native. JanSewak — har sarkari kaam, apni bhasha mein, bolkar. jansewak.vercel.app."

---

## Recording tips
- **Use earphones** while demoing — cleanest audio path for her voice + yours.
- Rehearse the demo twice; if she flubs a step, just cut and re-record that segment — Loom/OBS + a trim is fine.
- Keep the PiP window over the form's empty right side so both stay visible.
- If a step is slow, don't wait silently — narrate what she's doing ("she's looking at my screen…").
- Record slides and demo as separate clips and stitch; it's easier than one perfect take.

"use client";

/**
 * Browser text-to-speech (SpeechSynthesis) helper — free, offline-capable,
 * no API key. Used by the homepage avatar and the inbuilt form agent.
 * Prefers an Indian female voice when available.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  const female = /female|woman|lekha|veena|swara|kalpana|heera|priya|neerja|kajal/i;
  const male = /male|man\b|rishi|hemant|madhur|prabhat/i;
  const byPref =
    voices.find((v) => v.lang === "hi-IN" && female.test(v.name)) ??
    voices.find((v) => v.lang === "en-IN" && female.test(v.name)) ??
    voices.find((v) => v.lang === "hi-IN" && !male.test(v.name)) ??
    voices.find((v) => v.lang === "hi-IN") ??
    voices.find((v) => v.lang === "en-IN" && !male.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("hi")) ??
    null;
  if (byPref) cachedVoice = byPref;
  return byPref;
}

// Chrome loads voices asynchronously — warm the cache when they arrive.
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => pickVoice();
}

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak `text` aloud; resolves when finished (or cancelled). Never hangs:
 *  if no voice actually starts (headless/unsupported), resolves quickly. */
export function speak(text: string, opts?: { rate?: number; pitch?: number }): Promise<void> {
  return new Promise((resolve) => {
    if (!isTtsSupported() || !text.trim()) return resolve();
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "hi-IN";
    u.rate = opts?.rate ?? 1;
    u.pitch = opts?.pitch ?? 1.05;
    u.onend = finish;
    u.onerror = finish;
    // Chrome's synthesizer can sit in a paused state until nudged
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(u);
    // safety nets: no voice ever starts, or onend is silently dropped
    setTimeout(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) finish();
    }, 1200);
    setTimeout(finish, Math.min(20000, 2500 + text.length * 120));
  });
}

export function cancelSpeech() {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return isTtsSupported() && window.speechSynthesis.speaking;
}

/** Fake voice level for mouth animation while TTS plays (SpeechSynthesis
 *  exposes no real audio levels). */
export function ttsLevel(): number {
  if (!isSpeaking()) return 0;
  const t = performance.now();
  return 0.3 + 0.18 * Math.sin(t / 90) + 0.1 * Math.sin(t / 37);
}

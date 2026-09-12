"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { cancelSpeech, isSpeaking, isTtsSupported, speak, ttsLevel } from "@/lib/tts";

const LINES: { hi: string; en: string }[] = [
  { hi: "नमस्ते! मैं जनसेवक हूँ — आपकी अपनी सरकारी सहायक।", en: "Namaste! I'm JanSewak — your own sarkari sahayak." },
  { hi: "मैं आपकी स्क्रीन देखकर बताती हूँ कि कहाँ क्लिक करना है।", en: "I watch your screen and show exactly where to click." },
  { hi: "मैं आपकी पेंशन और PF के काम में मार्गदर्शन करती हूँ।", en: "I guide you through pension and PF work." },
  { hi: "मैं ट्रेन टिकट बुक करवाने में मदद करती हूँ।", en: "I help you book train tickets on IRCTC." },
  { hi: "मैं फॉर्म का टेक्स्ट तैयार कर देती हूँ — बस कॉपी कीजिए।", en: "I prepare your form text — just copy-paste." },
  { hi: "मैं आपकी फोटो को 50KB में छोटा कर देती हूँ।", en: "I resize your photo to 50KB for uploads." },
  { hi: "मैं हर भारतीय भाषा में बात करती हूँ — बस कहिए!", en: "I speak every Indian language — just ask!" },
  { hi: "मैं बताती हूँ कौन-सी सरकारी योजना आपके लिए है।", en: "I find which government scheme is for you." },
  { hi: "मैं आपकी शिकायत लिखकर दर्ज करवाती हूँ।", en: "I draft and file your complaints." },
];

const TYPE_MS = 45;
const HOLD_MS = 1900;

/** Homepage avatar that "speaks" her capabilities: a typewriter speech
 *  bubble synced with her mouth — and, once unmuted, her actual voice
 *  (browser TTS, hi-IN) reading each line aloud. */
export default function AvatarTalk() {
  const [lineIdx, setLineIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const typingRef = useRef(false);
  const voiceOnRef = useRef(false);

  // decided on the client only — avoids an SSR hydration mismatch
  useEffect(() => {
    const t = setTimeout(() => setTtsAvailable(isTtsSupported()), 0);
    return () => clearTimeout(t);
  }, []);

  const line = LINES[lineIdx];
  const typing = chars < line.hi.length;

  const lineIdxRef = useRef(0);
  useEffect(() => {
    typingRef.current = typing;
  }, [typing]);
  useEffect(() => {
    lineIdxRef.current = lineIdx;
  }, [lineIdx]);

  // toggling voice ON speaks the current line right away (not just the next)
  useEffect(() => {
    voiceOnRef.current = voiceOn;
    cancelSpeech();
    if (voiceOn) speak(LINES[lineIdxRef.current].hi);
  }, [voiceOn]);

  // speak each new line aloud as it starts typing
  useEffect(() => {
    if (voiceOnRef.current) {
      cancelSpeech();
      speak(LINES[lineIdx].hi);
    }
  }, [lineIdx]);

  useEffect(() => () => cancelSpeech(), []);

  useEffect(() => {
    const t = setTimeout(
      () => {
        if (chars < line.hi.length) {
          setChars((c) => c + 1);
        } else if (!voiceOnRef.current || !isSpeaking()) {
          // with voice on, wait for her to finish saying the line
          setLineIdx((i) => (i + 1) % LINES.length);
          setChars(0);
        }
      },
      typing ? TYPE_MS : HOLD_MS,
    );
    return () => clearTimeout(t);
  }, [chars, line.hi.length, typing]);

  const talking = typing || (voiceOn && isSpeaking());

  return (
    <div className="flex flex-col items-center">
      {/* speech bubble */}
      <div className="relative mb-3 w-full max-w-sm" aria-live="polite">
        <div className="grid rounded-2xl border border-orange-200 bg-white px-4 py-3 shadow-md">
          {/* every line rendered invisibly in the same grid cell — the bubble
              is always as tall as the longest one, so it never resizes */}
          {LINES.map((l, i) => (
            <div key={i} aria-hidden className="invisible col-start-1 row-start-1">
              <p className="text-[15px] font-semibold leading-relaxed">{l.hi}</p>
              <p className="mt-0.5 text-xs">{l.en}</p>
            </div>
          ))}
          <div className="col-start-1 row-start-1">
            <p className="text-[15px] font-semibold leading-relaxed text-stone-800">
              {line.hi.slice(0, chars)}
              {typing && <span className="animate-pulse text-orange-500">▍</span>}
            </p>
            <p className={`mt-0.5 text-xs text-stone-400 transition-opacity duration-300 ${typing ? "opacity-0" : "opacity-100"}`}>
              {line.en}
            </p>
          </div>
        </div>
        {/* voice toggle — browsers need one click before audio can play */}
        {ttsAvailable && (
          <button
            onClick={() => setVoiceOn((v) => !v)}
            className={`absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border shadow-md transition ${
              voiceOn ? "border-emerald-600 bg-emerald-600 text-white" : "border-orange-300 bg-white hover:bg-orange-50"
            }`}
            title={voiceOn ? "आवाज़ बंद करें" : "सुनिए — उसकी आवाज़ चालू करें"}
            aria-label={voiceOn ? "Mute voice" : "Unmute voice"}
          >
            {voiceOn ? "🔊" : "🔇"}
          </button>
        )}
        {/* bubble tail */}
        <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-orange-200 bg-white" />
      </div>

      <Avatar
        state={talking ? "speaking" : "idle"}
        getLevel={() => {
          if (voiceOnRef.current) return ttsLevel();
          return typingRef.current ? 0.28 + 0.18 * Math.sin(performance.now() / 90) + 0.08 * Math.sin(performance.now() / 37) : 0;
        }}
        size={280}
      />
    </div>
  );
}

"use client";
import { useUiLanguage } from "@/lib/ui-language";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import {
  cancelSpeech,
  isSpeaking,
  isTtsSupported,
  speak,
  ttsLevel,
} from "@/lib/tts";

const greeting = "नमस्ते! बताइए, किस काम में मदद चाहिए?";

export default function AvatarTalk() {
  const { t, locale } = useUiLanguage();
  const [voiceOn, setVoiceOn] = useState(false);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAvailable(isTtsSupported()), 0);
    return () => {
      clearTimeout(timer);
      cancelSpeech();
    };
  }, []);
  useEffect(() => {
    if (!voiceOn) return;
    const timer = setInterval(() => {
      if (!isSpeaking()) setVoiceOn(false);
    }, 500);
    return () => clearInterval(timer);
  }, [voiceOn]);
  function toggleVoice() {
    if (voiceOn) {
      cancelSpeech();
      setVoiceOn(false);
    } else {
      speak(t(greeting), { lang: locale === "hi" ? "hi-IN" : "en-IN" });
      setVoiceOn(true);
    }
  }
  return (
    <div className="home-avatar">
      <div className="home-avatar-portrait">
        <Avatar
          state={voiceOn ? "speaking" : "idle"}
          getLevel={ttsLevel}
          size={360}
          framing="portrait"
        />
      </div>
      <div className="home-avatar-caption">
        <p>{t(greeting)}</p>
      </div>
      <button
        type="button"
        className="home-voice-button"
        onClick={toggleVoice}
        disabled={!available}
        aria-pressed={voiceOn}
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M11 5 6 9H3v6l5 4V5Z" />
          <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </svg>
        <span>
          {voiceOn
            ? t("Stop sample")
            : available
              ? t("Hear a greeting")
              : t("Voice preview unavailable")}
        </span>
      </button>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { translations } from "./ui-translations";

export type UiLanguage = "hi" | "en";
const key = "jansewak.ui-language";
let fallback: UiLanguage = "hi";
function snapshot(): UiLanguage {
  try {
    const value = localStorage.getItem(key);
    return value === "en" ? "en" : value === "hi" ? "hi" : fallback;
  } catch {
    return fallback;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("jansewak-language", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("jansewak-language", callback);
  };
}
export function useUiLanguage() {
  const locale = useSyncExternalStore(subscribe, snapshot, () => "hi" as const);
  const t = useCallback(
    (text: string) => {
      const entry = translations[text.replace(/\s+/g, " ").trim()];
      return entry ? entry[locale === "hi" ? 0 : 1] : text;
    },
    [locale],
  );
  return {
    locale,
    t,
    setLocale(value: UiLanguage) {
      fallback = value;
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Keep the choice for this tab. */
      }
      window.dispatchEvent(new Event("jansewak-language"));
    },
  };
}

export function LanguageToggle() {
  const { locale, setLocale } = useUiLanguage();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === "hi"
        ? "जनसेवक | सरकारी काम में, आपके साथ"
        : "JanSewak | Help with government forms";
  }, [locale]);
  return (
    <div
      className="ui-language"
      role="group"
      aria-label={locale === "hi" ? "वेबसाइट की भाषा" : "Website language"}
    >
      <button
        type="button"
        lang="hi"
        aria-pressed={locale === "hi"}
        onClick={() => setLocale("hi")}
      >
        हिन्दी
      </button>
      <button
        type="button"
        lang="en"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        English
      </button>
    </div>
  );
}

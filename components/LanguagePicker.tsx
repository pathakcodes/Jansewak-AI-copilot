"use client";

export const LANGUAGES = [
  { code: "Hindi", label: "हिन्दी" },
  { code: "English", label: "English" },
  { code: "Bengali", label: "বাংলা" },
  { code: "Tamil", label: "தமிழ்" },
  { code: "Telugu", label: "తెలుగు" },
  { code: "Marathi", label: "मराठी" },
  { code: "Gujarati", label: "ગુજરાતી" },
  { code: "Kannada", label: "ಕನ್ನಡ" },
  { code: "Malayalam", label: "മലയാളം" },
  { code: "Punjabi", label: "ਪੰਜਾਬੀ" },
  { code: "Odia", label: "ଓଡ଼ିଆ" },
  { code: "Urdu", label: "اردو" },
];

interface LanguagePickerProps {
  value: string;
  onChange: (lang: string) => void;
  disabled?: boolean;
}

export default function LanguagePicker({ value, onChange, disabled }: LanguagePickerProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-stone-600">
      <span aria-hidden>🗣️</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800 disabled:opacity-60"
        aria-label="Choose language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label} · {l.code}
          </option>
        ))}
      </select>
    </label>
  );
}

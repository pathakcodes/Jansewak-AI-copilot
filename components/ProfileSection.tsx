"use client";

import { useEffect, useRef, useState } from "react";
import { hasSavedProfile, loadProfile, Profile, profileToShareLink, saveProfile, SAMPLE_PROFILE } from "@/lib/profile";

interface ProfileSectionProps {
  open: boolean;
  onClose: () => void;
  /** Called after save so a live session can be told about the update. */
  onSaved: (p: Profile) => void;
}

const FIELDS: { key: keyof Profile; label: string; placeholder: string; type?: string }[] = [
  { key: "aadhaar", label: "आधार · Aadhaar (local copy only)", placeholder: "12 digits", type: "text" },
  { key: "fullName", label: "पूरा नाम · Full name (English)", placeholder: "Shivam Kumar Pathak" },
  { key: "nameNative", label: "नाम (अपनी भाषा में) · Name in native script", placeholder: "शिवम कुमार पाठक" },
  { key: "age", label: "उम्र · Age", placeholder: "28", type: "number" },
  { key: "gender", label: "लिंग · Gender", placeholder: "Male / Female / Other" },
  { key: "mobile", label: "मोबाइल · Mobile", placeholder: "9876543210", type: "tel" },
  { key: "email", label: "ईमेल · Email", placeholder: "you@example.com", type: "email" },
  { key: "address", label: "पता · Address", placeholder: "House, Village/City, District, State, PIN" },
  { key: "state", label: "राज्य · State", placeholder: "Bihar" },
  { key: "pan", label: "PAN (optional)", placeholder: "ABCDE1234F" },
];

const DIGILOCKER_DOCS = ["🪪 Aadhaar (eKYC)", "🧾 PAN Card", "🚗 Driving Licence", "📜 10th Marksheet"];

export default function ProfileSection({ open, onClose, onSaved }: ProfileSectionProps) {
  if (!open) return null;
  return <ProfileDialog onClose={onClose} onSaved={onSaved} />;
}

type DlStep = "idle" | "aadhaar" | "otp" | "fetching" | "done";

function ProfileDialog({ onClose, onSaved }: Omit<ProfileSectionProps, "open">) {
  // Mounted only while the dialog is open, so state initializes from storage.
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [saved, setSaved] = useState(false);
  const [isSeed] = useState(() => !hasSavedProfile());
  const [linkCopied, setLinkCopied] = useState(false);

  // simulated DigiLocker flow
  const [dlStep, setDlStep] = useState<DlStep>("idle");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [otp, setOtp] = useState("");
  const [fetchedDocs, setFetchedDocs] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const runFetch = () => {
    setDlStep("fetching");
    setFetchedDocs([]);
    DIGILOCKER_DOCS.forEach((doc, i) => {
      timers.current.push(setTimeout(() => setFetchedDocs((d) => [...d, doc]), 500 + i * 550));
    });
    timers.current.push(
      setTimeout(() => {
        // This simulation does not fetch identity data. Keep the user's fields.
        setDlStep("done");
      }, 500 + DIGILOCKER_DOCS.length * 550 + 300),
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xl">👤</span>
          <h2 className="text-lg font-bold text-stone-800">मेरी प्रोफ़ाइल · My Profile</h2>
          <button onClick={onClose} className="ml-auto rounded-full p-1.5 text-stone-400 hover:bg-stone-100" aria-label="Close">
            ✕
          </button>
        </div>

        {/* DigiLocker / Aadhaar demo fetch */}
        <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗄️</span>
            <p className="text-sm font-bold text-indigo-900">DigiLocker से details लाएँ</p>
            <span className="ml-auto rounded bg-indigo-200 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">DEMO</span>
          </div>

          {dlStep === "idle" && (
            <>
              <p className="mt-1 text-xs leading-relaxed text-indigo-800/80">
                आधार से जुड़े documents (PAN, licence…) से नाम-पता अपने-आप भर जाएगा — टाइपिंग की ज़रूरत नहीं।
              </p>
              <button
                onClick={() => setDlStep("aadhaar")}
                className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                🔗 Connect DigiLocker (simulated)
              </button>
            </>
          )}

          {dlStep === "aadhaar" && (
            <div className="mt-2 space-y-2">
              <label className="block text-xs font-semibold text-indigo-900">आधार के आख़िरी 4 अंक · Aadhaar last 4 digits</label>
              <input
                value={aadhaarLast4}
                onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                className="w-full rounded-lg border border-indigo-300 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-indigo-600 focus:outline-none"
              />
              <button
                disabled={aadhaarLast4.length !== 4}
                onClick={() => setDlStep("otp")}
                className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                📲 OTP भेजें · Send OTP
              </button>
              <p className="text-center text-[10px] text-indigo-500">Demo — कोई असली आधार नंबर न डालें, कुछ भी 4 अंक चलेंगे</p>
            </div>
          )}

          {dlStep === "otp" && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-indigo-800">📲 OTP आपके registered mobile पर भेजा गया (simulated)</p>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit OTP"
                inputMode="numeric"
                className="w-full rounded-lg border border-indigo-300 px-3 py-2 text-center text-lg tracking-[0.4em] focus:border-indigo-600 focus:outline-none"
              />
              <button
                disabled={otp.length !== 6}
                onClick={runFetch}
                className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                ✓ Verify & Fetch
              </button>
              <p className="text-center text-[10px] text-indigo-500">Demo — कोई भी 6 अंक चलेंगे</p>
            </div>
          )}

          {(dlStep === "fetching" || dlStep === "done") && (
            <div className="mt-2 space-y-1.5">
              {fetchedDocs.map((d) => (
                <div key={d} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700">
                  {d} <span className="ml-auto text-emerald-600">✓ fetched</span>
                </div>
              ))}
              {dlStep === "fetching" ? (
                <p className="animate-pulse text-center text-xs font-medium text-indigo-700">DigiLocker से ला रही हूँ…</p>
              ) : (
                <p className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-center text-xs font-semibold text-emerald-800">
                  ✓ Demo पूरा हुआ — नीचे अपनी जानकारी जाँच कर Save करें
                </p>
              )}
            </div>
          )}
        </div>

        {isSeed && dlStep === "idle" && (
          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            🧪 Demo के लिए <b>seed details ({SAMPLE_PROFILE.fullName})</b> पहले से भरे हैं — सीधे आज़माएँ, या अपने असली details
            लिखकर Save करें।
          </p>
        )}
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800">
          सेव किए बदलाव इस browser में रहते हैं। Default demo details ऐप में शामिल हैं। जनसेवक मार्गदर्शन के लिए
          profile details Gemini को भेजती है; आधार केवल local copy के लिए है। OTP या पासवर्ड यहाँ न रखें।
        </p>

        <button type="button" onClick={() => { setProfile({ ...SAMPLE_PROFILE }); setSaved(false); }}
          className="mb-4 rounded-lg border border-stone-300 px-3 py-2 text-sm">
          Default details भरें · Load defaults
        </button>

        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-0.5 block text-xs font-semibold text-stone-600">{f.label}</label>
              <input
                type={f.type ?? "text"}
                value={profile[f.key] ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3" aria-labelledby="vault-title">
          <h3 id="vault-title" className="font-bold text-stone-800">🗂️ वॉल्ट · Vault</h3>
          <p className="mt-1 text-xs text-stone-600">पंजीकरण की स्थिति देखते समय इस जानकारी से मदद मिलेगी। DEMO वाला नंबर नमूना है।</p>
          <label htmlFor="vault-registration" className="mt-3 block text-xs font-semibold text-stone-600">पंजीकरण संख्या · Registration number</label>
          <input id="vault-registration" value={profile.registrationNumber ?? ""}
            onChange={(e) => { setProfile((p) => ({ ...p, registrationNumber: e.target.value })); setSaved(false); }}
            placeholder="DEMO-BR-2026-001234"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
        </section>

        <button
          onClick={() => {
            saveProfile(profile);
            setSaved(true);
            onSaved(profile);
            setTimeout(onClose, 700);
          }}
          className="mt-5 w-full rounded-xl bg-emerald-700 py-3 font-semibold text-white hover:bg-emerald-800"
        >
          {saved ? "✓ Saved" : "💾 सेव करें · Save"}
        </button>

        {/* share as URL — opens the sample form with the agent + these details */}
        <button
          onClick={() => {
            saveProfile(profile);
            navigator.clipboard.writeText(profileToShareLink(profile)).then(() => {
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            });
          }}
          className="mt-2 w-full rounded-xl border border-emerald-600 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          {linkCopied ? "✓ Link copied!" : "🔗 Share link — sample form खुलेगा, agent + details के साथ"}
        </button>
        <p className="mt-1.5 text-center text-[10px] leading-relaxed text-stone-400">
          Link में details सिर्फ URL के #hash में रहते हैं — server पर नहीं जाते। परिवार के किसी सदस्य को भेजिए,
          उनके browser में agent इन्हीं details से guide करेगा।
        </p>
      </div>
    </div>
  );
}

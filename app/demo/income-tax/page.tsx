"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar, { AvatarState } from "@/components/Avatar";
import { loadProfile, Profile, profileFromLocationHash, saveProfile } from "@/lib/profile";
import { cancelSpeech, isSpeaking, speak, ttsLevel } from "@/lib/tts";

/* ---------------- speech recognition (voice commands) ---------------- */

interface RecognitionResultEvent {
  results: { [i: number]: { [j: number]: { transcript: string } }; length: number };
  resultIndex: number;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
declare global {
  interface Window {
    webkitSpeechRecognition?: new () => RecognitionLike;
    SpeechRecognition?: new () => RecognitionLike;
  }
}

/* ---------------- form definition ---------------- */

type FieldKey = "name" | "pan" | "mobile" | "email" | "address" | "gender";

interface FieldDef {
  key: FieldKey;
  label: string;
  hindi: string;
  placeholder: string;
  kind: "input" | "textarea" | "select";
  fromProfile: (p: Profile) => string;
  /** guide-mode narration */
  sayGuide: string;
  /** auto-mode narration */
  sayAuto: string;
}

const FIELDS: FieldDef[] = [
  {
    key: "name", label: "Full Name (as per PAN)", hindi: "पूरा नाम", placeholder: "Enter full name", kind: "input",
    fromProfile: (p) => p.fullName,
    sayGuide: "सबसे पहले अपना पूरा नाम लिखिए — बिल्कुल वैसा जैसा PAN कार्ड पर छपा है।",
    sayAuto: "मैं आपका नाम भर रही हूँ",
  },
  {
    key: "pan", label: "PAN Number", hindi: "पैन नंबर", placeholder: "ABCDE1234F", kind: "input",
    fromProfile: (p) => p.pan,
    sayGuide: "अब PAN नंबर — दस अक्षरों का, जैसे A B C D E एक दो तीन चार F।",
    sayAuto: "अब PAN नंबर भर रही हूँ",
  },
  {
    key: "mobile", label: "Mobile Number", hindi: "मोबाइल नंबर", placeholder: "10-digit mobile", kind: "input",
    fromProfile: (p) => p.mobile,
    sayGuide: "अपना दस अंकों का मोबाइल नंबर लिखिए — इसी पर OTP आएगा।",
    sayAuto: "मोबाइल नंबर भर रही हूँ",
  },
  {
    key: "email", label: "Email ID", hindi: "ईमेल", placeholder: "you@example.com", kind: "input",
    fromProfile: (p) => p.email,
    sayGuide: "अब अपनी ईमेल आईडी लिखिए।",
    sayAuto: "ईमेल भर रही हूँ",
  },
  {
    key: "address", label: "Residential Address", hindi: "पता", placeholder: "House, Village/City, District, State, PIN", kind: "textarea",
    fromProfile: (p) => p.address,
    sayGuide: "अब पूरा पता लिखिए — मकान, गाँव या शहर, ज़िला, राज्य और पिन कोड।",
    sayAuto: "आपका पता भर रही हूँ",
  },
  {
    key: "gender", label: "Gender", hindi: "लिंग", placeholder: "", kind: "select",
    fromProfile: (p) => (/^m/i.test(p.gender) ? "Male" : /^f/i.test(p.gender) ? "Female" : p.gender ? "Other" : ""),
    sayGuide: "अब लिंग चुनिए — Male, Female या Other।",
    sayAuto: "लिंग चुन रही हूँ",
  },
];

const EMPTY_VALUES: Record<FieldKey, string> = { name: "", pan: "", mobile: "", email: "", address: "", gender: "" };

type Mode = "idle" | "guide" | "auto";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sample e-filing page with an INBUILT JanSewak agent — no screen share
 * needed. She sits bottom-right, highlights each field and explains it
 * (Guide mode), or fills the form herself from your profile while
 * narrating (Auto mode). Voice commands let you correct her: "mobile
 * 9876543210", "अगला", "रुको", "auto भरो", "submit"…
 */
export default function SampleIncomeTaxForm() {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [importedFromLink, setImportedFromLink] = useState(false);

  const [mode, setMode] = useState<Mode>("idle");
  const [step, setStep] = useState(-1); // FIELDS.length = submit button
  const [bubble, setBubble] = useState(
    "नमस्ते! मैं यहीं बैठी हूँ — screen share की ज़रूरत नहीं। 🧭 Guide दबाइए, मैं हर खाना समझाऊँगी। ⚡ Auto से मैं खुद भर दूँगी।",
  );
  const [talking, setTalking] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");

  const runId = useRef(0);
  const modeRef = useRef<Mode>("idle");
  const stepRef = useRef(-1);
  const valuesRef = useRef(EMPTY_VALUES);
  const fieldRefs = useRef<Partial<Record<FieldKey | "submit", HTMLElement | null>>>({});
  const recRef = useRef<RecognitionLike | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // load profile — from the share link's #hash if present (never a server)
  useEffect(() => {
    const t = setTimeout(() => {
      const fromLink = profileFromLocationHash();
      if (fromLink) {
        saveProfile(fromLink);
        setProfile(fromLink);
        setImportedFromLink(true);
        setBubble("✓ Link से आपके details मिल गए! ⚡ Auto दबाइए — मैं फॉर्म खुद भर दूँगी। या 🧭 Guide से साथ-साथ भरते हैं।");
      } else {
        setProfile(loadProfile());
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // avatar mouth follows real TTS
  useEffect(() => {
    const t = setInterval(() => setTalking(isSpeaking()), 200);
    return () => {
      clearInterval(t);
      cancelSpeech();
      recRef.current?.stop();
    };
  }, []);

  const narrate = useCallback(async (text: string) => {
    setBubble(text);
    cancelSpeech();
    await speak(text);
  }, []);

  const scrollToStep = (i: number) => {
    const key = i >= FIELDS.length ? "submit" : FIELDS[i].key;
    fieldRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const stopAgent = useCallback(
    (say?: string) => {
      runId.current++;
      cancelSpeech();
      setMode("idle");
      setStep(-1);
      setBubble(say ?? "ठीक है, रुक गई। जब चाहें 🧭 Guide या ⚡ Auto दबाइए।");
      if (say) speak(say);
    },
    [],
  );

  /* ---------------- guide mode ---------------- */

  const guideStep = useCallback(
    async (i: number, id: number) => {
      if (runId.current !== id) return;
      if (i >= FIELDS.length) {
        setStep(FIELDS.length);
        scrollToStep(FIELDS.length);
        await narrate("बस! सब भर गया। अब नीला Submit बटन दबाइए। 🎉");
        setMode("idle");
        return;
      }
      const f = FIELDS[i];
      setStep(i);
      scrollToStep(i);
      const suggestion = profile ? f.fromProfile(profile) : "";
      await narrate(
        f.sayGuide + (suggestion ? ` आपके profile के अनुसार: ${suggestion}।` : "") + " भरने के बाद मैं खुद अगले खाने पर ले चलूँगी।",
      );
    },
    [narrate, profile],
  );

  const startGuide = () => {
    const id = ++runId.current;
    setMode("guide");
    guideStep(0, id);
  };

  // guide mode: auto-advance once the active field has a value
  useEffect(() => {
    if (mode !== "guide" || step < 0 || step >= FIELDS.length) return;
    if (!values[FIELDS[step].key]) return;
    const id = runId.current;
    const t = setTimeout(() => {
      if (runId.current === id && modeRef.current === "guide") guideStep(step + 1, id);
    }, 1600);
    return () => clearTimeout(t);
  }, [values, mode, step, guideStep]);

  /* ---------------- auto mode ---------------- */

  const typeInto = async (key: FieldKey, value: string, id: number) => {
    if (FIELDS.find((f) => f.key === key)?.kind === "select") {
      setValues((v) => ({ ...v, [key]: value }));
      return;
    }
    for (let c = 1; c <= value.length; c++) {
      if (runId.current !== id) return;
      setValues((v) => ({ ...v, [key]: value.slice(0, c) }));
      await sleep(value.length > 40 ? 18 : 40);
    }
  };

  const startAuto = async () => {
    const id = ++runId.current;
    setMode("auto");
    setSubmitted(false);
    const p = profile ?? loadProfile();
    for (let i = 0; i < FIELDS.length; i++) {
      if (runId.current !== id) return;
      const f = FIELDS[i];
      setStep(i);
      scrollToStep(i);
      const val = f.fromProfile(p);
      if (val) {
        const saying = narrate(`${f.sayAuto} — ${val}`);
        await typeInto(f.key, val, id);
        await saying;
      } else {
        await narrate(`${f.hindi} आपके profile में नहीं है — यह खाना आप भर दीजिए।`);
      }
      await sleep(250);
    }
    if (runId.current !== id) return;
    setStep(FIELDS.length);
    scrollToStep(FIELDS.length);
    setMode("idle");
    await narrate(
      "हो गया! सब जाँच लीजिए। कुछ बदलना हो तो 🎤 दबाकर बोलिए — जैसे 'mobile 9 8 7 6…'। सही हो तो Submit दबाइए, या बोलिए 'submit कर दो'।",
    );
  };

  /* ---------------- voice commands ---------------- */

  const handleVoice = (raw: string) => {
      const text = raw.trim();
      setHeard(text);
      const t = text.toLowerCase().replace(/\s+/g, " ");

      if (/(रुको|रुक जाओ|stop|बंद करो)/.test(t)) return stopAgent("रुक गई।");
      if (/(auto|अपने आप|खुद भर|आटो)/.test(t)) return void startAuto();
      if (/(अगला|next|आगे)/.test(t) && modeRef.current === "guide") {
        return void guideStep(stepRef.current + 1, runId.current);
      }
      if (/(submit|जमा|सबमिट)/.test(t)) {
        setSubmitted(true);
        setStep(-1);
        setMode("idle");
        return void narrate("फॉर्म जमा कर दिया — बधाई हो! 🎉");
      }

      // field corrections
      const digits = (t.match(/\d/g) ?? []).join("");
      const set = (key: FieldKey, value: string, confirm: string) => {
        setValues((v) => ({ ...v, [key]: value }));
        void narrate(confirm);
      };
      const pan = text.toUpperCase().replace(/\s/g, "").match(/[A-Z]{5}\d{4}[A-Z]/)?.[0];
      if (pan) return set("pan", pan, `PAN बदल दिया: ${pan}`);
      if (/mobile|मोबाइल|फोन|फ़ोन/.test(t) && digits.length >= 10) {
        return set("mobile", digits.slice(-10), `मोबाइल बदल दिया: ${digits.slice(-10)}`);
      }
      if (/email|ईमेल/.test(t)) {
        const email = t.match(/\S+@\S+\.\S+/)?.[0];
        if (email) return set("email", email, `ईमेल बदल दी: ${email}`);
      }
      if (/नाम|name/.test(t)) {
        const m = text.replace(/.*?(?:नाम|name)\s*(?:बदलो|बदल दो|change|to|is|=|:)?\s*/i, "").replace(/(कर दो|करो|लिखो|रखो)\s*$/i, "").trim();
        if (m.length > 2) return set("name", m, `नाम बदल दिया: ${m}`);
      }
      if (/पता|address/.test(t)) {
        const m = text.replace(/.*?(?:पता|address)\s*(?:बदलो|बदल दो|change|to|is|=|:)?\s*/i, "").trim();
        if (m.length > 4) return set("address", m, "पता बदल दिया।");
      }
      if (/gender|लिंग|महिला|female/.test(t)) {
        const g = /महिला|female/.test(t) ? "Female" : /पुरुष|male/.test(t) ? "Male" : "";
        if (g) return set("gender", g, `लिंग: ${g}`);
      }

      setBubble(`मैंने सुना: “${text}” — कहिए: 'auto भरो', 'अगला', 'रुको', 'mobile <नंबर>', 'नाम <नया नाम>', 'submit'।`);
  };
  // recognition callbacks read through a ref so they never go stale
  const handleVoiceRef = useRef(handleVoice);
  useEffect(() => {
    handleVoiceRef.current = handleVoice;
  });

  const toggleMic = () => {
    if (listeningRef.current) {
      listeningRef.current = false;
      recRef.current?.stop();
      recRef.current = null;
      setListening(false);
      return;
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setBubble("इस browser में voice input नहीं है — Chrome इस्तेमाल कीजिए।");
      return;
    }
    const rec = new Ctor();
    rec.lang = "hi-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (last?.[0]?.transcript) handleVoiceRef.current(last[0].transcript);
    };
    rec.onend = () => {
      // Chrome stops recognition periodically — restart while mic is on
      if (listeningRef.current && recRef.current) {
        try {
          recRef.current.start();
        } catch {
          setListening(false);
          listeningRef.current = false;
        }
      }
    };
    recRef.current = rec;
    listeningRef.current = true;
    setListening(true);
    setBubble("🎤 सुन रही हूँ… बोलिए: 'auto भरो', 'अगला', 'mobile 98765…', 'नाम बदलो …', 'submit'");
    rec.start();
  };

  /* ---------------- render helpers ---------------- */

  const setVal = (k: FieldKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const active = (i: number) => step === i && (mode !== "idle" || i === FIELDS.length);
  const running = mode !== "idle";
  const avatarState: AvatarState = talking ? "speaking" : listening ? "listening" : "idle";

  const fieldWrap = (i: number, f: FieldDef, child: React.ReactNode) => (
    <div
      key={f.key}
      ref={(el) => {
        fieldRefs.current[f.key] = el;
      }}
      className={`relative rounded-lg p-2 transition-all duration-300 ${
        active(i) ? "bg-emerald-50 ring-4 ring-emerald-400/80" : ""
      }`}
    >
      {active(i) && (
        <span className="absolute -left-2 -top-3 z-10 animate-bounce rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white shadow">
          👉 यहाँ
        </span>
      )}
      <label className="mb-1 block text-sm font-semibold">
        {f.label} / {f.hindi} <span className="text-red-600">*</span>
      </label>
      {child}
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#F4F6FA] pb-64 text-stone-800 sm:pb-40">
      <div className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900">
        🧪 SAMPLE FORM — JanSewak hackathon demo. This is not a real government website. Nothing is saved or submitted
        anywhere.
      </div>

      <header className="border-b-4 border-orange-500 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B3B8C] text-2xl">🏛️</div>
          <div>
            <p className="text-lg font-bold text-[#0B3B8C]">आयकर विभाग · Income Tax Department</p>
            <p className="text-xs text-stone-500">e-Filing Sample Portal (Demo) · Government of India (simulated)</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {importedFromLink && (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
            🔗 Link से profile import हो गई — agent इन्हीं details से मदद करेगी।
          </div>
        )}

        <div className="rounded-lg border border-stone-300 bg-white shadow-sm">
          <div className="border-b border-stone-200 bg-[#0B3B8C] px-5 py-3 text-white">
            <h1 className="font-semibold">Taxpayer Basic Details — Form (Sample)</h1>
          </div>

          {submitted ? (
            <div className="m-5 rounded-lg border border-green-300 bg-green-50 p-5 text-center">
              <p className="text-lg font-bold text-green-800">✓ Form submitted successfully (demo)</p>
              <p className="mt-1 text-sm text-green-700">
                फॉर्म सफलतापूर्वक जमा हुआ। JanSewak की मदद से आपने यह फॉर्म भरा! 🎉
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setValues(EMPTY_VALUES);
                  setStep(-1);
                }}
                className="mt-4 rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
              >
                Fill again
              </button>
            </div>
          ) : (
            <form
              className="space-y-4 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
                setStep(-1);
                setMode("idle");
                void narrate("फॉर्म जमा हो गया — बधाई हो! 🎉");
              }}
            >
              {FIELDS.map((f, i) =>
                fieldWrap(
                  i,
                  f,
                  f.kind === "textarea" ? (
                    <textarea
                      value={values[f.key]}
                      onChange={setVal(f.key)}
                      placeholder={f.placeholder}
                      rows={2}
                      className="w-full rounded border border-stone-400 px-3 py-2.5 focus:border-[#0B3B8C] focus:outline-none"
                    />
                  ) : f.kind === "select" ? (
                    <select
                      value={values[f.key]}
                      onChange={setVal(f.key)}
                      className="w-full rounded border border-stone-400 bg-white px-3 py-2.5 focus:border-[#0B3B8C] focus:outline-none"
                    >
                      <option value="">-- Select --</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  ) : (
                    <input
                      value={values[f.key]}
                      onChange={setVal(f.key)}
                      placeholder={f.placeholder}
                      maxLength={f.key === "pan" ? 10 : f.key === "mobile" ? 10 : undefined}
                      className={`w-full rounded border border-stone-400 px-3 py-2.5 focus:border-[#0B3B8C] focus:outline-none ${
                        f.key === "pan" ? "uppercase tracking-widest" : ""
                      }`}
                    />
                  ),
                ),
              )}

              <div
                ref={(el) => {
                  fieldRefs.current.submit = el;
                }}
                className={`flex items-center gap-3 rounded-lg border-t border-stone-200 p-2 pt-4 ${
                  step === FIELDS.length ? "bg-emerald-50 ring-4 ring-emerald-400/80" : ""
                }`}
              >
                <button type="submit" className="rounded bg-[#0B3B8C] px-6 py-2.5 font-semibold text-white hover:bg-[#0A2F6E]">
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setValues(EMPTY_VALUES)}
                  className="rounded border border-stone-400 px-6 py-2.5 font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Reset
                </button>
                {step === FIELDS.length && <span className="animate-bounce text-lg">👉</span>}
              </div>
            </form>
          )}
        </div>
      </main>

      {/* ---------------- inbuilt agent, bottom right ---------------- */}
      <div className="fixed bottom-3 right-3 z-50 w-[300px] max-w-[calc(100vw-1.5rem)]">
        <div className="overflow-hidden rounded-2xl border border-orange-300 bg-[#FFF7EC] shadow-2xl">
          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-100 to-amber-50 px-3 py-1.5">
            <span className="text-sm">🙏</span>
            <p className="text-xs font-bold text-stone-800">जनसेवक · inbuilt guide</p>
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
              <span className={`h-1.5 w-1.5 rounded-full ${running || listening ? "animate-pulse bg-emerald-500" : "bg-stone-300"}`} />
              {mode === "auto" ? "AUTO" : mode === "guide" ? "GUIDE" : listening ? "सुन रही हूँ" : "READY"}
            </span>
          </div>

          <div className="flex items-start gap-2 px-3 pt-2">
            <div className="-my-1 shrink-0">
              <Avatar state={avatarState} getLevel={ttsLevel} size={96} />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[13px] leading-snug text-stone-800">{bubble}</p>
              {heard && listening && <p className="mt-1 truncate text-[10px] text-stone-400">🎤 “{heard}”</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-2.5">
            {!running ? (
              <>
                <button
                  onClick={startGuide}
                  className="flex-1 rounded-lg bg-emerald-700 px-2 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  🧭 Guide करो
                </button>
                <button
                  onClick={() => void startAuto()}
                  className="flex-1 rounded-lg bg-[#0B3B8C] px-2 py-2 text-xs font-semibold text-white hover:bg-[#0A2F6E]"
                >
                  ⚡ Auto भरो
                </button>
              </>
            ) : (
              <>
                {mode === "guide" && (
                  <button
                    onClick={() => void guideStep(stepRef.current + 1, runId.current)}
                    className="flex-1 rounded-lg bg-emerald-700 px-2 py-2 text-xs font-semibold text-white"
                  >
                    ⏭ अगला
                  </button>
                )}
                <button
                  onClick={() => stopAgent()}
                  className="flex-1 rounded-lg bg-red-600 px-2 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  ⏹ रोकें
                </button>
              </>
            )}
            <button
              onClick={toggleMic}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                listening ? "bg-red-100 text-red-700 ring-2 ring-red-400" : "border border-stone-300 bg-white text-stone-700"
              }`}
              title="Voice से बदलिए: 'mobile 98765…', 'नाम बदलो…', 'अगला', 'submit'"
            >
              {listening ? "🔴" : "🎤"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

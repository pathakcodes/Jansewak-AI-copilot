"use client";

/**
 * User profile — stored ONLY in this browser's localStorage, never on a
 * server. The agent uses it to pre-fill provide_text suggestions so users
 * don't have to speak their details every session.
 */
export interface Profile {
  fullName: string;
  nameNative: string;
  age: string;
  gender: string;
  mobile: string;
  email: string;
  address: string;
  pan: string;
  aadhaar?: string;
  state?: string;
  registrationNumber?: string;
}

const KEY = "jansewak-profile";

export const EMPTY_PROFILE: Profile = {
  state: "",
  registrationNumber: "",
  aadhaar: "",
  fullName: "",
  nameNative: "",
  age: "",
  gender: "",
  mobile: "",
  email: "",
  address: "",
  pan: "",
};

/** Demo persona pre-seeded until the user saves their own details, so the
 *  guided-form flow works out of the box (handy for hackathon judges). */
export const SAMPLE_PROFILE: Profile = {
  state: "Bihar",
  registrationNumber: "DEMO-BR-2026-001234",
  // User-requested default seed, including production builds.
  aadhaar: "720621580099",
  fullName: "Shivam Kumar Pathak",
  nameNative: "शिवम कुमार पाठक",
  age: "",
  gender: "Male",
  mobile: "7413020731",
  email: "shivampathak339@gmail.com",
  address: "42 Demo Nagar, Patna, Bihar - 800001",
  pan: "",
};

export function loadProfile(): Profile {
  if (typeof window === "undefined") return SAMPLE_PROFILE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SAMPLE_PROFILE;
    const saved = JSON.parse(raw);
    const profile: Profile = { ...EMPTY_PROFILE, ...saved };
    // Repair this user's saved copy of the old simulated DigiLocker persona.
    // Other users' saved profiles and customized fields are left untouched.
    if (profile.mobile === SAMPLE_PROFILE.mobile && profile.email === SAMPLE_PROFILE.email) {
      if (saved.state === undefined) profile.state = SAMPLE_PROFILE.state;
      if (saved.registrationNumber === undefined) profile.registrationNumber = SAMPLE_PROFILE.registrationNumber;
      if (profile.address === "42 Demo Nagar, Jaipur, Rajasthan - 302001") profile.address = SAMPLE_PROFILE.address;
      if (!profile.aadhaar) profile.aadhaar = SAMPLE_PROFILE.aadhaar;
      if (profile.fullName === "Ramesh Kumar" && profile.nameNative === "रमेश कुमार") {
        profile.fullName = SAMPLE_PROFILE.fullName;
        profile.nameNative = SAMPLE_PROFILE.nameNative;
        if (profile.age === "45") profile.age = SAMPLE_PROFILE.age;
        if (profile.pan === "ABCDE1234F") profile.pan = SAMPLE_PROFILE.pan;
        if (profile.address === "House No. 12, Village Rampur, District Sitapur, Uttar Pradesh - 261001") {
          profile.address = SAMPLE_PROFILE.address;
        }
      }
    }
    return profile;
  } catch {
    return SAMPLE_PROFILE;
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

/** True once the user has saved their own details (seed no longer shown). */
export function hasSavedProfile(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(KEY);
}

/**
 * Share a profile as a URL: base64url-encoded JSON in the hash (never sent
 * to any server — the hash stays in the browser). The link opens the sample
 * form with the inbuilt agent, pre-loaded with these details.
 */
export function profileToShareLink(p: Profile): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ ...p, aadhaar: "" }));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${location.origin}/demo/income-tax#p=${b64}`;
}

/** Parse a profile out of the current URL hash (see profileToShareLink). */
export function profileFromLocationHash(): Profile | null {
  if (typeof window === "undefined") return null;
  const m = /[#&]p=([A-Za-z0-9_-]+)/.exec(window.location.hash);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return { ...EMPTY_PROFILE, ...JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return null;
  }
}

/** Resolve known form fields locally so model prose never replaces saved values. */
export function profileValueForField(field: string, p: Profile): string | undefined {
  const t = field.toLowerCase();
  if (/otp|password|captcha|ओटीपी|पासवर्ड|कैप्चा|father|mother|spouse|पिता|माता|पति|पत्नी|username|user name/.test(t)) return undefined;
  if (/registration\s*(number|no\.?|id)|पंजीकरण\s*(संख्या|नंबर|क्रमांक)/.test(t)) return p.registrationNumber;
  if (/\bstate\b|राज्य|प्रदेश/.test(t)) return p.state;
  if (/aadha+r|adhar|आधार/.test(t)) return p.aadhaar;
  if (/mobile|phone|मोबाइल|फ़ोन|फोन|संपर्क/.test(t)) return p.mobile;
  if (/email|e-mail|ईमेल|ई-मेल/.test(t)) return p.email;
  if (/\bpan\b|पैन/.test(t)) return p.pan;
  if (/name|नाम|naam/.test(t)) return /native|hindi|हिन्दी|हिंदी|अपनी भाषा/.test(t) ? p.nameNative : p.fullName;
  if (/address|पता|ठिकाना/.test(t)) return p.address;
  if (/\bage\b|उम्र|आयु/.test(t)) return p.age;
  if (/gender|sex|लिंग/.test(t)) return p.gender;
  return undefined;
}

/** Compact text block injected into the agent's system instruction. */
export function profileToPromptText(p: Profile): string {
  const rows = [
    p.fullName && `Full name (English): ${p.fullName}`,
    p.nameNative && `Name (native script): ${p.nameNative}`,
    p.age && `Age: ${p.age}`,
    p.gender && `Gender: ${p.gender}`,
    p.mobile && `Mobile: ${p.mobile}`,
    p.email && `Email: ${p.email}`,
    p.address && `Address: ${p.address}`,
    p.state && `State: ${p.state}`,
    p.registrationNumber && `Vault — registration number: ${p.registrationNumber}${p.registrationNumber.startsWith("DEMO-") ? " (sample for demos, not a real portal-issued registration)" : ""}`,
    p.pan && `PAN: ${p.pan}`,
    p.aadhaar && "Aadhaar: saved locally. For a visible Aadhaar input, call provide_text with field_hint='Aadhaar' and text=''; the app inserts the actual saved digits into the copy chip. Never use this explanation as the field value.",
  ].filter(Boolean);
  return rows.join("\n");
}

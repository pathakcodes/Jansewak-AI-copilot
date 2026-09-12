import Link from "next/link";
import AvatarTalk from "@/components/landing/AvatarTalk";
import { PORTALS } from "@/lib/knowledge/portals";

const CAPABILITIES = [
  {
    icon: "🗣️",
    title: "बोलकर काम कराइए",
    subtitle: "Just talk — no typing",
    detail: "Speak naturally in your own words. JanSewak listens, understands and answers with a warm human voice.",
  },
  {
    icon: "🌏",
    title: "हर भारतीय भाषा में",
    subtitle: "All Indian languages",
    detail:
      "Hindi, Tamil, Bengali, Marathi, Telugu, Kannada and every language Gemini supports. Just say \"मराठी में बोलो\" and she switches instantly.",
  },
  {
    icon: "🖥️",
    title: "स्क्रीन देखकर मार्गदर्शन",
    subtitle: "Sees your screen, guides each click",
    detail:
      "Share your screen and a small always-on-top guide window highlights exactly where to click on the government website — step by step.",
  },
  {
    icon: "📋",
    title: "फॉर्म का टेक्स्ट तैयार",
    subtitle: "Copy-paste ready form text",
    detail:
      "Tell her your details once — she prepares exact text for every field, even transliterated to Hindi or your language, ready to copy.",
  },
  {
    icon: "📁",
    title: "फोटो-दस्तावेज़ टूल",
    subtitle: "Photo & document resizer",
    detail:
      "Form says photo must be under 50KB? The built-in tool resizes photos, signatures and documents to the exact limit — right inside the guide window.",
  },
  {
    icon: "🏛️",
    title: "सही योजना, सही पोर्टल",
    subtitle: "Right scheme, right portal",
    detail:
      "Ask \"बुज़ुर्गों के लिए पेंशन?\" and she finds the scheme you qualify for and takes you to the official website — never a fake one.",
  },
  {
    icon: "📝",
    title: "शिकायत लिखवाइए",
    subtitle: "Complaints & grievances",
    detail: "She drafts your grievance in proper words for CPGRAMS or any department, and files it with you step by step.",
  },
  {
    icon: "🌐",
    title: "हर सरकारी वेबसाइट, आज से",
    subtitle: "Any government website, from day one",
    detail:
      "Even sites not in her knowledge base — she reads your shared screen, searches the internet, and figures the flow out with you.",
  },
];

const STEPS = [
  {
    n: "१",
    title: "बात कीजिए",
    en: "Talk to her",
    detail: "Press the mic and say what you need — \"ट्रेन टिकट बुक करनी है\".",
  },
  {
    n: "२",
    title: "वेबसाइट खोलिए और स्क्रीन दिखाइए",
    en: "Open the site & share screen",
    detail: "She opens the right official portal for you and asks to see your screen.",
  },
  {
    n: "३",
    title: "निशान देखकर कदम बढ़ाइए",
    en: "Follow the highlights",
    detail: "A floating guide window highlights every click, gives text to copy, and fixes your photos.",
  },
];

export default function Home() {
  return (
    <div className="bg-[#FFF7EC] text-stone-800">
      {/* tricolor top ribbon */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-orange-500" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-green-600" />
      </div>

      {/* header */}
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-orange-500 via-white to-green-600 text-lg shadow">
          🙏
        </span>
        <div>
          <p className="text-lg font-extrabold leading-tight">जनसेवक</p>
          <p className="text-[11px] font-medium tracking-wide text-stone-500">JanSewak · जनता की अपनी सहायक</p>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 md:inline-flex">
          🇮🇳 Made at Build What Moves India 2026
        </span>
        <Link
          href="/assistant"
          className="ml-auto rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-800 md:ml-0"
        >
          🎙️ बात करें
        </Link>
      </header>

      {/* hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 py-10 md:grid-cols-2 md:py-16">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <p className="inline-block rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
              🇮🇳 हर सरकारी वेबसाइट, अब आसान — आज से
            </p>
            <p className="inline-block rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 md:hidden">
              🇮🇳 Made at Build What Moves India 2026
            </p>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            सरकारी काम,
            <br />
            <span className="text-orange-600">अब अपनी भाषा में</span>
            <br />
            बोलकर कीजिए।
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-stone-600">
            JanSewak is your own government-work assistant. Talk to her like family — she finds the right sarkari
            website, watches your screen, and guides you click by click. Train tickets, PF, Aadhaar, pensions,
            complaints — sab kuch.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/assistant"
              className="rounded-full bg-emerald-700 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-800"
            >
              🎙️ अभी बात शुरू करें
            </Link>
            <a href="#how" className="rounded-full border border-stone-300 px-6 py-4 text-sm font-semibold text-stone-700 hover:bg-white">
              कैसे काम करता है?
            </a>
          </div>
          <p className="text-sm text-stone-500">
            निःशुल्क · कोई टाइपिंग नहीं · <b>हर भारतीय भाषा में</b> — बस कहिए और भाषा बदल जाएगी
          </p>
        </div>
        <div className="flex justify-center">
          <div className="rounded-3xl border border-orange-200 bg-white/70 p-6 shadow-xl shadow-orange-200/40">
            <AvatarTalk />
          </div>
        </div>
      </section>

      {/* demo video + pitch deck */}
      <section className="border-y border-orange-200/60 bg-white/60 py-14">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-3xl font-extrabold">
            जनसेवक को काम करते देखिए <span className="block text-lg font-semibold text-stone-500">See her in action</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-stone-600">
            A citizen fills a government form just by talking — screen guidance, highlights, and one-tap copy, live.
          </p>
          <video
            controls
            preload="metadata"
            playsInline
            className="mt-8 w-full rounded-2xl border border-orange-200 bg-black shadow-xl shadow-orange-200/40"
            src="/pitch/demo.mp4"
          />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/pitch/slides.html"
              target="_blank"
              className="rounded-full bg-emerald-700 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-800"
            >
              📊 Pitch deck देखें · Open pitch deck
            </a>
            <Link
              href="/assistant"
              className="rounded-full border border-stone-300 bg-white px-7 py-3.5 text-base font-semibold text-stone-700 hover:bg-stone-50"
            >
              🎙️ खुद आज़माएँ · Try it yourself
            </Link>
          </div>
        </div>
      </section>

      {/* capabilities */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-extrabold">
            जनसेवक क्या-क्या कर सकती है? <span className="block text-lg font-semibold text-stone-500">What she can do</span>
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-orange-200/70 bg-[#FFFDF8] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-3xl">{c.icon}</span>
                <h3 className="mt-3 font-bold">{c.title}</h3>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{c.subtitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{c.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-center text-3xl font-extrabold">
          तीन आसान कदम <span className="block text-lg font-semibold text-stone-500">How it works</span>
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-green-200 bg-white p-6 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-700 text-xl font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">{s.en}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.detail}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-stone-500">
          गाँव हो या शहर — जिसने पहली बार इंटरनेट चलाया हो, वो भी अपना काम खुद कर सकता है। JanSewak makes every
          government website accessible and easy — starting today.
        </p>
      </section>

      {/* portals */}
      <section className="border-y border-orange-200/60 bg-white/60 py-12">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-extrabold">
            इन पोर्टलों पर पूरी जानकारी के साथ मदद
            <span className="block text-base font-semibold text-stone-500">Deep guides for these portals — and any other site via screen guidance</span>
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {PORTALS.map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm"
                title={p.tasks.join(" · ")}
              >
                {p.name} <span className="text-stone-400">· {p.hindiName}</span>
              </span>
            ))}
            <span className="rounded-full border border-dashed border-orange-400 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-800">
              + कोई भी सरकारी वेबसाइट · any govt website
            </span>
          </div>
        </div>
      </section>

      {/* apps coming soon */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="rounded-3xl bg-gradient-to-r from-orange-100 via-white to-green-100 p-8 text-center shadow-inner md:p-12">
          <h2 className="text-2xl font-extrabold">📱 Android और iOS ऐप — जल्द आ रहे हैं</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
            The same JanSewak — voice help, screen guidance and file tools — as mobile apps, so help is in your pocket
            wherever you are.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <span className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-500">
              🤖 Google Play <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">COMING SOON</span>
            </span>
            <span className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-500">
               App Store <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">COMING SOON</span>
            </span>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-orange-200/60 bg-white/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 py-8 text-center text-sm text-stone-500">
          <p className="font-semibold text-stone-700">जनसेवक · JanSewak</p>
          <p>
            🇮🇳 Made at <span className="font-medium">Build What Moves India 2026</span> — making every sarkari website
            usable by every Indian, in every Indian language.
          </p>
          <p className="text-xs">
            JanSewak is an independent assistant and is not affiliated with the Government of India. Always verify you
            are on the official .gov.in portal before entering personal details.
          </p>
        </div>
        <div className="flex h-1.5">
          <div className="flex-1 bg-orange-500" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-green-600" />
        </div>
      </footer>
    </div>
  );
}

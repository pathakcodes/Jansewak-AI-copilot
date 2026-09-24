"use client";

import Link from "next/link";
import AvatarTalk from "@/components/landing/AvatarTalk";
import DemoVideo from "@/components/landing/DemoVideo";
import { PORTALS } from "@/lib/knowledge/portals";
import { LanguageToggle, useUiLanguage } from "@/lib/ui-language";
import "./home.css";

const steps = [
  ["01", "अपना काम बताइए", "Choose a language and start a conversation."],
  [
    "02",
    "जहाँ अटकें, स्क्रीन दिखाइए",
    "Find a field or understand the next step.",
  ],
  ["03", "जाँचकर आगे बढ़िए", "Copy prepared text or resize a photo."],
];
const questions = [
  [
    "What do I need?",
    "A microphone and an internet connection. Screen sharing works best in desktop Chrome or Edge.",
  ],
  [
    "Does JanSewak submit forms for me?",
    "You review and submit the form on the official website. Check important details against the portal.",
  ],
  [
    "What should I keep private?",
    "Never share an OTP, password, PIN or full Aadhaar number. Stop sharing before entering sensitive information.",
  ],
];

export default function Home() {
  const { locale, t } = useUiLanguage();
  return (
    <div className="home" lang={locale}>
      <a className="home-skip" href="#main">
        {t("Skip to content")}
      </a>
      <header className="home-header home-wrap">
        <Link className="home-brand" href="/">
          {t("जनसेवक")}
        </Link>
        <nav aria-label={t("Main navigation")}>
          <a href="#how">{t("How it works")}</a>
          <a href="#portals">{t("Portals")}</a>
        </nav>
        <LanguageToggle />
      </header>
      <main id="main">
        <section className="home-hero home-wrap" aria-labelledby="hero-title">
          <div>
            <h1 id="hero-title">
              {t("सरकारी काम में,")}
              <br />
              <span>{t("आपके साथ।")}</span>
            </h1>
            <p className="home-lead">
              {t(
                "अपनी भाषा में पूछिए। वेबसाइट समझने, फॉर्म भरने और अगला कदम जानने में मदद पाइए।",
              )}
            </p>
            <div className="home-actions">
              <Link className="home-button" href="/assistant" prefetch={false}>
                {t("बात शुरू करें")} <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <div className="home-guide">
            <AvatarTalk />
          </div>
        </section>
        <section
          className="home-how home-wrap"
          id="how"
          aria-labelledby="how-title"
        >
          <h2 id="how-title">{t("अगला कदम साफ़ हो।")}</h2>
          <div className="home-steps">
            {steps.map(([number, title, detail]) => (
              <article key={number}>
                <span className="home-index" aria-hidden="true">
                  {number}
                </span>
                <div>
                  <h3>{t(title)}</h3>
                  <p>{t(detail)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section
          className="home-demo home-wrap"
          id="demo"
          aria-labelledby="demo-title"
        >
          <div className="home-demo-copy">
            <h2 id="demo-title">{t("काम करते देखिए")}</h2>
            <Link
              className="home-text-link"
              href="/demo/income-tax"
              prefetch={false}
            >
              {t("Practice form")} <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <DemoVideo label={t("काम करते देखिए")} />
        </section>
        <section
          className="home-directory home-wrap"
          id="portals"
          aria-labelledby="portal-title"
        >
          <div className="home-section-heading">
            <h2 id="portal-title">{t("सरकारी पोर्टल")}</h2>
          </div>
          <div className="home-portals">
            {PORTALS.filter((p) => p.category !== "Demo").map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="home-portal"
              >
                <span>
                  <strong>{locale === "hi" ? p.hindiName : p.name}</strong>
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </section>
        <section className="home-faq home-wrap" aria-labelledby="faq-title">
          <h2 id="faq-title">{t("शुरू करने से पहले")}</h2>
          <div>
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>{t(question)}</summary>
                <p>{t(answer)}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <div className="home-wrap">
          <Link className="home-brand" href="/">
            {t("जनसेवक")}
          </Link>
          <p>{t("An independent prototype. Not a government service.")}</p>
          <a href="/pitch/slides.html" target="_blank" rel="noreferrer">
            {t("Presentation")} ↗
          </a>
        </div>
      </footer>
    </div>
  );
}

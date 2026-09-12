"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar, { AvatarState } from "@/components/Avatar";
import ActionCard from "@/components/ActionCard";
import LanguagePicker from "@/components/LanguagePicker";
import TranscriptPanel from "@/components/TranscriptPanel";
import { GuidePanel, GuideState, PipPortal } from "@/components/GuidePip";
import ProfileSection from "@/components/ProfileSection";
import { loadProfile, profileToPromptText } from "@/lib/profile";

/** When the agent points at a known field, surface the matching profile
 *  value as a copy chip automatically — no reliance on the model. */
function suggestionsFor(text: string): CopyTextItem[] {
  const p = loadProfile();
  const t = text.toLowerCase();
  const out: CopyTextItem[] = [];
  const add = (id: string, fieldHint: string, value: string) => value && out.push({ id, fieldHint, text: value });
  if (/aadha?r|aadhar|आधार/.test(t)) {
    add("auto-aadhaar", "आधार · Aadhaar", p.aadhaar || "");
  } else if (/name|नाम|naam/.test(t)) {
    add("auto-name-en", "Name (English)", p.fullName);
    add("auto-name-native", "नाम (हिन्दी)", p.nameNative);
  } else if (/\bpan\b|पैन/.test(t)) add("auto-pan", "PAN", p.pan);
  else if (/mobile|मोबाइल|phone|फ़ोन|फोन|संपर्क/.test(t)) add("auto-mobile", "Mobile", p.mobile);
  else if (/email|ईमेल|मेल/.test(t)) add("auto-email", "Email", p.email);
  else if (/address|पता|ठिकाना/.test(t)) add("auto-address", "पता · Address", p.address);
  else if (/\bage\b|उम्र|आयु/.test(t)) add("auto-age", "Age", p.age);
  else if (/gender|लिंग/.test(t)) add("auto-gender", "Gender", p.gender);
  return out;
}
import { JanSewakLive, SessionStatus, TranscriptEntry } from "@/lib/live-client";
import { ScreenShare } from "@/lib/screen";
import { isDocumentPipSupported, openPipWindow } from "@/lib/pip";
import { CopyTextItem, FileToolConfig, Highlight, SuggestedAction } from "@/lib/tools";

export default function AssistantPage() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string | undefined>();
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [copyTexts, setCopyTexts] = useState<CopyTextItem[]>([]);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [instruction, setInstruction] = useState("");
  const [fileToolConfig, setFileToolConfig] = useState<FileToolConfig | null>(null);
  const [language, setLanguage] = useState("Hindi");
  const [micMuted, setMicMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [sharePrompt, setSharePrompt] = useState(false);
  const [guideStream, setGuideStream] = useState<MediaStream | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarSize, setAvatarSize] = useState(300);
  const tileRef = useRef<HTMLDivElement | null>(null);

  // size the agent to fill her half of the screen — like a real video call
  useEffect(() => {
    const measure = () => {
      const w = tileRef.current?.clientWidth ?? 360;
      const h = window.innerHeight;
      setAvatarSize(Math.max(260, Math.min(w - 24, (h - 220) / 1.15, 500)));
    };
    const t = setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const clientRef = useRef<JanSewakLive | null>(null);
  const screenRef = useRef<ScreenShare | null>(null);

  const pushSuggestions = useCallback((items: CopyTextItem[]) => {
    if (items.length === 0) return;
    setCopyTexts((prev) => [...items, ...prev.filter((c) => !items.some((i) => i.id === c.id))].slice(0, 5));
  }, []);

  const endGuide = useCallback(() => {
    screenRef.current?.stop();
    screenRef.current = null;
    clientRef.current?.stopScreenGuidance();
    setGuideStream(null);
    setPipWindow((w) => {
      w?.close();
      return null;
    });
    setHighlight(null);
    setInstruction("");
  }, []);

  const stopSession = useCallback(() => {
    endGuide();
    clientRef.current?.disconnect();
    clientRef.current = null;
    setSpeaking(false);
    setSharePrompt(false);
  }, [endGuide]);

  useEffect(() => () => {
    stopSession();
  }, [stopSession]);

  const startSession = async () => {
    endGuide();
    clientRef.current?.disconnect();
    setTranscript([]);
    setActions([]);
    setCopyTexts([]);
    const client = new JanSewakLive({
      onStatus: (s, detail) => {
        setStatus(s);
        setStatusDetail(detail);
      },
      onTranscript: setTranscript,
      onSpeakingChange: setSpeaking,
      onSuggestAction: (a) => setActions((prev) => [...prev.slice(-3), a]),
      onStartScreenGuide: () => setSharePrompt(true),
      onHighlight: (h) => {
        setHighlight(h);
        if (h?.targetKind === "dropdown") setCopyTexts([]);
        else if (h?.targetKind === "text_field") pushSuggestions(suggestionsFor(h.label));
      },
      onProvideText: (item) => setCopyTexts((prev) => [item, ...prev.filter((c) => c.fieldHint !== item.fieldHint)].slice(0, 5)),
      onSetLanguage: setLanguage,
      onOpenFileTool: setFileToolConfig,
      onInstruction: (text) => {
        setInstruction(text);
      },
      // Lets highlight_region verify a proposed box against the last real
      // frame and reject boxes that land on blank screen (miscalibration).
      checkRegion: (ymin, xmin, ymax, xmax) => screenRef.current?.regionStddev(ymin, xmin, ymax, xmax) ?? null,
      // Audio-thread heartbeat: drives screen capture even when this tab is
      // backgrounded (user is on the government site's tab).
      onMicTick: () => screenRef.current?.capture(),
      onHighlightRetry: () => screenRef.current?.capture(true),
    });
    clientRef.current = client;
    await client.connect(language);
  };

  /** Must run inside a click handler — getDisplayMedia needs a user gesture. */
  const startScreenShare = async () => {
    if (!clientRef.current) return;
    try {
      const share = new ScreenShare();
      share.onEnded = endGuide;
      // Do not announce sharing to Gemini until the first screenshot is on the
      // same ordered Live input stream. Previously this note could arrive
      // first, causing the model to invent a page before it had seen one.
      share.onFirstFrame = () => {
        clientRef.current?.sendText(
          "[system note] Screen sharing is now ON. A screenshot has been sent. Help with the current task using one visible CTA or input field. Highlight its exact label, then speak naturally. If you cannot read the target, ask for a clearer view. Subsequent screenshots alone do not require a response.",
        );
      };
      const stream = await share.start((frame) => clientRef.current?.sendScreenFrame(frame));
      screenRef.current = share;
      setGuideStream(stream);
      setSharePrompt(false);
      // Auto pop-out: the share-picker click still counts as user activation,
      // so the guide opens as an always-on-top PiP window without another tap.
      try {
        const win = await openPipWindow(420, 720);
        if (win) {
          win.addEventListener("pagehide", () => setPipWindow(null));
          setPipWindow(win);
        }
      } catch {
        // No activation left or unsupported — floating panel keeps working.
      }
    } catch {
      // User cancelled the picker; keep the prompt visible.
    }
  };

  /** Also needs a user gesture. */
  const popOutGuide = async () => {
    const win = await openPipWindow(420, 720);
    if (win) {
      win.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(win);
    }
  };

  /** Button clicks are signals too — tell the agent so she continues on her
   *  own (e.g. link opened → immediately steer to screen sharing). */
  const handleAction = (action: SuggestedAction) => {
    if (action.kind === "start_guide") {
      setSharePrompt(true);
      clientRef.current?.sendText(
        "[system note] The user clicked your guide offer — the 'Share screen' button is now on their screen. In one short sentence, ask them to press it. Remember: sharing is NOT on yet.",
      );
    } else if (action.url) {
      window.open(action.url, "_blank", "noopener");
      setSharePrompt(true);
      clientRef.current?.sendText(
        `[system note] The user clicked your button — "${action.label}" (${action.url}) just opened in a new tab of this browser. Don't wait for them to speak: if screen sharing is not on yet, briefly confirm it opened and ask them to press the 'Share screen' button (now visible) so you can guide them there. If sharing is already on, WAIT for a frame that actually shows the new page before giving any step — until then say only that you're waiting for the page. Never describe a page you haven't seen in a frame.`,
      );
    }
  };

  const toggleMic = () => {
    const next = !micMuted;
    setMicMuted(next);
    clientRef.current?.setMicMuted(next);
  };

  const live = status === "live";
  const avatarState: AvatarState =
    status === "connecting" ? "connecting" : !live ? "idle" : speaking ? "speaking" : "listening";

  const guideState: GuideState = {
    stream: guideStream,
    highlight,
    instruction,
    copyTexts,
    fileToolConfig,
    micMuted,
  };

  const guidePanel = (
    <GuidePanel
      guide={guideState}
      avatarState={avatarState}
      getLevel={() => clientRef.current?.playback.getLevel() ?? 0}
      transcript={transcript}
      onCopied={(item) =>
        clientRef.current?.sendText(
          `[system note] The user just copied "${item.fieldHint}" to their clipboard — they are about to paste it. Watch the next frame for the pasted value, then give the NEXT step. Until the paste shows up, stay silent — do not repeat the instruction you already gave.`,
        )
      }
      onToggleMic={toggleMic}
      onEndGuide={endGuide}
      onToggleFileTool={() => setFileToolConfig((c) => (c ? null : {}))}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-[#FFF7EC]">
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-orange-200/60 bg-white/70 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-bold text-stone-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-orange-500 via-white to-green-600">
            🙏
          </span>
          जनसेवक <span className="hidden text-stone-400 sm:inline">· JanSewak</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            👤 <span className="hidden sm:inline">प्रोफ़ाइल</span>
          </button>
          <LanguagePicker value={language} onChange={setLanguage} disabled={live || status === "connecting"} />
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> LIVE
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        {/* left: the agent, video-call style — she fills her half of the screen */}
        <section className="flex flex-col gap-3 lg:w-1/2">
          <div
            ref={tileRef}
            className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-b from-[#FFF6E9] via-[#FFEFDB] to-[#FBE3C8] py-2"
          >
            <Avatar state={avatarState} getLevel={() => clientRef.current?.playback.getLevel() ?? 0} size={avatarSize} />

            {/* call status chip */}
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-stone-700 backdrop-blur">
              {live ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> LIVE · जनसेवक
                </>
              ) : status === "connecting" ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> जुड़ रही हूँ…
                </>
              ) : (
                <>🙏 जनसेवक</>
              )}
            </span>

            {/* call controls, overlaid like a video call */}
            {!live && status !== "connecting" ? (
              <button
                onClick={startSession}
                className="absolute bottom-5 rounded-full bg-emerald-700 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-700/30 transition hover:bg-emerald-800"
              >
                🎙️ बात शुरू करें · Start talking
              </button>
            ) : status === "connecting" ? (
              <p className="absolute bottom-7 animate-pulse text-sm font-medium text-stone-600">जुड़ रही हूँ… connecting…</p>
            ) : (
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
                <button
                  onClick={toggleMic}
                  title={micMuted ? "Mic on करें" : "Mic बंद करें"}
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-lg ${
                    micMuted ? "bg-stone-200 text-stone-700" : "bg-emerald-700 text-white"
                  }`}
                >
                  {micMuted ? "🔇" : "🎙️"}
                </button>
                {!guideStream && (
                  <button
                    onClick={startScreenShare}
                    title="स्क्रीन साझा करें — मैं देखकर guide करूँगी"
                    className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#0B3B8C] px-5 text-sm font-semibold text-white shadow-lg hover:bg-[#0A2F6E]"
                  >
                    🖥️ Share screen
                  </button>
                )}
                <button
                  onClick={stopSession}
                  title="कॉल समाप्त करें"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-lg text-white shadow-lg hover:bg-red-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {status === "error" || status === "closed" ? (
            <div className="w-full rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
              {statusDetail || (status === "closed" ? "Session ended. Reconnect to continue." : "Something went wrong.")}
            </div>
          ) : null}

          {/* screen-share prompt (needs a user click) */}
          {sharePrompt && live && !guideStream && (
            <div className="w-full space-y-2 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 p-4 text-center">
              <p className="text-sm font-medium text-emerald-900">
                मैं आपकी स्क्रीन देखकर कदम-कदम पर मदद करूँगी।
                <br />
                <span className="text-emerald-700">Share your screen so I can guide you on it.</span>
              </p>
              <button
                onClick={startScreenShare}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                🖥️ स्क्रीन साझा करें · Share screen
              </button>
            </div>
          )}

          {/* actions suggested by the agent */}
          {actions.length > 0 && (
            <div className="w-full space-y-2">
              {actions.map((a) => (
                <ActionCard
                  key={a.id}
                  action={a}
                  onOpen={handleAction}
                  onDismiss={(id) => setActions((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}

          {!live && status !== "connecting" && (
            <div className="space-y-2 text-center">
              <p className="max-w-sm text-xs leading-relaxed text-stone-400">
                माइक की अनुमति दें और अपनी भाषा में बोलें — टिकट, पेंशन, आधार, शिकायत… कुछ भी पूछिए।
              </p>
              <p className="text-xs text-stone-400">
                👤 पहले <button onClick={() => setProfileOpen(true)} className="font-semibold text-emerald-700 underline">प्रोफ़ाइल भरें</button> ताकि फॉर्म का text तैयार मिले ·{" "}
                <a href="/demo/income-tax" target="_blank" className="font-semibold text-emerald-700 underline">
                  🧪 Sample form पर आज़माएँ
                </a>
              </p>
            </div>
          )}
        </section>

        {/* right: transcript, with its own call controls */}
        <section className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border border-orange-200/70 bg-white/60">
          <div className="flex items-center justify-between gap-2 border-b border-orange-100 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">बातचीत · Conversation</span>
            <div className="flex items-center gap-1.5">
              {!live && status !== "connecting" ? (
                <button
                  onClick={startSession}
                  className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  🎙️ बात शुरू करें
                </button>
              ) : live ? (
                <>
                  <button
                    onClick={toggleMic}
                    title={micMuted ? "Mic on करें" : "Mic बंद करें"}
                    className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                      micMuted ? "bg-stone-200 text-stone-700" : "bg-emerald-700 text-white"
                    }`}
                  >
                    {micMuted ? "🔇" : "🎙️"}
                  </button>
                  {!guideStream && (
                    <button
                      onClick={startScreenShare}
                      title="स्क्रीन साझा करें"
                      className="rounded-full bg-[#0B3B8C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A2F6E]"
                    >
                      🖥️ Share
                    </button>
                  )}
                  <button
                    onClick={stopSession}
                    title="समाप्त करें"
                    className="rounded-full bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span className="animate-pulse text-xs text-stone-400">connecting…</span>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <TranscriptPanel entries={transcript} />
          </div>
        </section>
      </main>

      <ProfileSection
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={(p) => {
          // A live session picks the change up immediately; new sessions get
          // it via the system instruction.
          const text = profileToPromptText(p);
          if (text && clientRef.current) {
            clientRef.current.sendText(
              `[system note] The user just updated their saved profile:\n${text}\nUse these values in provide_text suggestions from now on. Briefly acknowledge in one short sentence.`,
            );
          }
        }}
      />

      {/* guide: floating panel, or portal into the PiP window */}
      {guideStream &&
        (pipWindow ? (
          <PipPortal pipWindow={pipWindow}>{guidePanel}</PipPortal>
        ) : (
          <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-orange-300 shadow-2xl">
            <div className="flex items-center justify-between bg-orange-100 px-3 py-1.5">
              <span className="text-xs font-semibold text-orange-900">Guide window</span>
              {isDocumentPipSupported() && (
                <button
                  onClick={popOutGuide}
                  className="rounded px-2 py-0.5 text-xs font-medium text-orange-800 hover:bg-orange-200"
                  title="Pop out — stays on top of the government website"
                >
                  ⧉ Pop out (हमेशा ऊपर रहेगा)
                </button>
              )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto">{guidePanel}</div>
          </div>
        ))}
    </div>
  );
}

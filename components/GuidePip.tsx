"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CopyTextItem, FileToolConfig, Highlight } from "@/lib/tools";
import { loadProfile } from "@/lib/profile";
import { TranscriptEntry } from "@/lib/live-client";
import Avatar, { AvatarState } from "./Avatar";
import CopyText from "./CopyText";
import FileTools from "./FileTools";
import ScreenFeed from "./ScreenFeed";

/** Copy chips for every filled profile field — always available in the guide. */
function profileChips(): CopyTextItem[] {
  const p = loadProfile();
  const rows: [string, string][] = [
    ["आधार · Aadhaar", p.aadhaar || ""],
    ["नाम (हिन्दी) · Name", p.nameNative],
    ["Name (English)", p.fullName],
    ["PAN", p.pan],
    ["मोबाइल · Mobile", p.mobile],
    ["ईमेल · Email", p.email],
    ["पता · Address", p.address],
    ["राज्य · State", p.state || ""],
    ["वॉल्ट · Registration number", p.registrationNumber || ""],
    ["उम्र · Age", p.age],
    ["लिंग · Gender", p.gender],
  ];
  return rows.filter(([, v]) => v).map(([fieldHint, text], i) => ({ id: `profile-${i}`, fieldHint, text }));
}

export interface GuideState {
  stream: MediaStream | null;
  highlight: Highlight | null;
  instruction: string;
  copyTexts: CopyTextItem[];
  fileToolConfig: FileToolConfig | null;
  micMuted: boolean;
}

interface GuidePanelProps {
  guide: GuideState;
  avatarState: AvatarState;
  getLevel: () => number;
  transcript: TranscriptEntry[];
  onToggleMic: () => void;
  onEndGuide: () => void;
  onToggleFileTool: () => void;
  /** Copy-chip clicks are signals: the agent proactively continues from them. */
  onCopied?: (item: CopyTextItem) => void;
}

/** The guide UI itself — rendered either inside the PiP window or as a floating panel. */
export function GuidePanel({ guide, avatarState, getLevel, transcript, onToggleMic, onEndGuide, onToggleFileTool, onCopied }: GuidePanelProps) {
  const lastUser = [...transcript].reverse().find((e) => e.role === "user" && !e.hidden && e.text.trim());
  const lastAgent = [...transcript].reverse().find((e) => e.role === "agent" && !e.hidden && e.text.trim());

  return (
    <div className="relative h-full bg-[#FFF7EC]">
      <div className="flex h-full flex-col gap-2.5 overflow-y-auto p-3" style={{ minHeight: 0 }}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-orange-500 via-white to-green-600 text-sm">
            🙏
          </span>
          <p className="text-sm font-bold text-stone-800">जनसेवक Guide</p>
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> LIVE
          </span>
        </div>

        {/* next step */}
        <div className="rounded-lg border border-orange-200 bg-white px-2.5 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">अगला कदम · Next step</p>
          <p className="text-sm leading-snug text-stone-800">
            {guide.instruction || "बोलिए, मैं आपकी स्क्रीन देखकर मदद करूँगी… (speak — I can see your screen)"}
          </p>
        </div>

        {/* the shared screen with her highlights — always visible, never pushed out */}
        <div className="shrink-0">
          <ScreenFeed stream={guide.stream} highlight={guide.highlight} />
        </div>

        {/* only the chips relevant to the field on screen (auto-matched + agent-sent) */}
        {guide.copyTexts.length > 0 && (
          <div className="space-y-1.5">
            {guide.copyTexts.slice(0, 3).map((c) => (
              <CopyText key={c.id} item={c} onCopied={onCopied} />
            ))}
          </div>
        )}

        {/* full profile — tucked away until needed */}
        <details className="rounded-lg border border-stone-200 bg-white/70 p-2">
          <summary className="cursor-pointer select-none text-xs font-semibold text-stone-600">
            👤 सारी जानकारी दिखाएँ · all my details
          </summary>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {profileChips().map((c) => (
              <div key={c.id} className={c.text.length > 18 ? "col-span-2" : ""}>
                <CopyText item={c} onCopied={onCopied} />
              </div>
            ))}
          </div>
        </details>

        {guide.fileToolConfig && <FileTools config={guide.fileToolConfig} />}

        {/* live captions — what you said, what she's saying. Right padding
            keeps the text clear of the avatar sitting bottom-right. */}
        <div className="mt-auto space-y-1 pr-[130px]">
          {lastUser && (
            <div className="w-fit max-w-full rounded-xl rounded-bl-sm bg-emerald-100 px-2.5 py-1.5">
              <p className="text-[10px] font-bold uppercase text-emerald-700">🧑 आप · You</p>
              <p className="text-xs leading-snug text-emerald-950">{lastUser.text}</p>
            </div>
          )}
          {lastAgent && (
            <div className="w-fit max-w-full rounded-xl rounded-bl-sm border border-orange-200 bg-white px-2.5 py-1.5">
              <p className="text-[10px] font-bold uppercase text-orange-700">🙏 जनसेवक{avatarState === "speaking" ? " · बोल रही हूँ…" : ""}</p>
              <p className="text-xs leading-snug text-stone-800">{lastAgent.text}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onToggleMic}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              guide.micMuted ? "bg-stone-200 text-stone-700" : "bg-emerald-700 text-white"
            }`}
          >
            {guide.micMuted ? "🔇 Mic off" : "🎙️ Mic on"}
          </button>
          <button
            onClick={onToggleFileTool}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
            title="Photo/file resize tool"
          >
            📁
          </button>
          <button
            onClick={onEndGuide}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            ✕ End
          </button>
        </div>
      </div>

      {/* she sits big at the bottom-right, above the controls */}
      <div className="pointer-events-none absolute bottom-14 right-0 z-10 drop-shadow-xl">
        <Avatar state={avatarState} getLevel={getLevel} size={150} />
      </div>
    </div>
  );
}

/** Renders children into a Document-PiP window via a React portal. */
export function PipPortal({ pipWindow, children }: { pipWindow: Window; children: React.ReactNode }) {
  const [container] = useState(() => {
    const el = pipWindow.document.createElement("div");
    el.style.height = "100vh";
    return el;
  });

  useEffect(() => {
    pipWindow.document.body.appendChild(container);
    return () => container.remove();
  }, [pipWindow, container]);

  return createPortal(children, container);
}

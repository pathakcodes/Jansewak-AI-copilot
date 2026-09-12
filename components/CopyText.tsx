"use client";

import { useRef, useState } from "react";
import { CopyTextItem } from "@/lib/tools";

export default function CopyText({ item, onCopied }: { item: CopyTextItem; onCopied?: (item: CopyTextItem) => void }) {
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const copy = async () => {
    // Resolve the window that actually hosts this button — inside the
    // Document-PiP window the main tab is unfocused, and its
    // navigator.clipboard rejects writes ("document is not focused").
    const doc = btnRef.current?.ownerDocument ?? document;
    const win = doc.defaultView ?? window;
    let ok = false;
    try {
      await win.navigator.clipboard.writeText(item.text);
      ok = true;
    } catch {
      // Legacy fallback: hidden textarea + execCommand in the host document.
      const ta = doc.createElement("textarea");
      ta.value = item.text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      doc.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        ok = doc.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      onCopied?.(item);
    }
  };

  return (
    <button
      ref={btnRef}
      onClick={copy}
      className={`group flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
        copied ? "border-emerald-400 bg-emerald-50" : "border-amber-300 bg-amber-50 hover:bg-amber-100"
      }`}
      title="Copy to clipboard"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">{item.fieldHint}</p>
        <p className="break-words whitespace-pre-wrap font-medium text-stone-900">{item.text}</p>
      </div>
      <span className={`shrink-0 text-sm font-semibold ${copied ? "text-emerald-700" : "text-amber-700"}`}>
        {copied ? "✓ Copied" : "📋 Copy"}
      </span>
    </button>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { TranscriptEntry } from "@/lib/live-client";

export default function TranscriptPanel({ entries: allEntries }: { entries: TranscriptEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const entries = allEntries.filter((e) => !e.hidden);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-stone-400">
        बातचीत यहाँ दिखेगी · Your conversation will appear here
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full space-y-3 overflow-y-auto p-4">
      {entries.map((e) => (
        <div key={e.id} className={`flex ${e.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
              e.role === "user"
                ? "rounded-br-md bg-emerald-700 text-white"
                : "rounded-bl-md border border-orange-200 bg-orange-50 text-stone-800"
            } ${e.final ? "" : "opacity-80"}`}
          >
            {e.role === "agent" && <span className="mb-0.5 block text-[11px] font-semibold text-orange-700">जनसेवक</span>}
            {e.text}
          </div>
        </div>
      ))}
    </div>
  );
}

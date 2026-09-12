"use client";

import { SuggestedAction } from "@/lib/tools";

interface ActionCardProps {
  action: SuggestedAction;
  onOpen: (action: SuggestedAction) => void;
  onDismiss: (id: string) => void;
}

export default function ActionCard({ action, onOpen, onDismiss }: ActionCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-white p-3 shadow-sm">
      <span className="text-xl" aria-hidden>
        {action.kind === "open_url" ? "🔗" : action.kind === "start_guide" ? "🧭" : "💡"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-800">{action.label}</p>
        {action.detail && <p className="truncate text-xs text-stone-500">{action.detail}</p>}
      </div>
      {(action.url || action.kind === "start_guide") && (
        <button
          onClick={() => onOpen(action)}
          className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          {action.kind === "start_guide" ? "Guide करें" : "खोलें / Open"}
        </button>
      )}
      <button
        onClick={() => onDismiss(action.id)}
        className="shrink-0 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

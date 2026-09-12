"use client";

import { useRef, useState } from "react";
import { FileToolConfig } from "@/lib/tools";

const PRESETS = [
  { label: "Photo ≤ 50KB", kb: 50, format: "jpeg" },
  { label: "Photo ≤ 20KB", kb: 20, format: "jpeg" },
  { label: "Signature ≤ 20KB", kb: 20, format: "jpeg" },
  { label: "Document ≤ 100KB", kb: 100, format: "jpeg" },
];

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress an image under a KB target: binary-search JPEG quality, and if
 * even the lowest quality is too big, scale dimensions down and retry.
 */
async function compressToTarget(file: File, targetKb: number, format: string): Promise<Blob> {
  const img = await loadImage(file);
  const mime = format === "png" ? "image/png" : "image/jpeg";
  let scale = 1;

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const toBlob = (q: number) => new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), mime, q));

    let lo = 0.05,
      hi = 0.95,
      best: Blob | null = null;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      const blob = await toBlob(mid);
      if (blob.size <= targetKb * 1024) {
        best = blob;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    if (best) return best;
    scale *= 0.7; // still too big — shrink and try again
  }
  throw new Error("Could not compress under the limit");
}

export default function FileTools({ config }: { config: FileToolConfig }) {
  const [targetKb, setTargetKb] = useState(config.targetKb ?? 50);
  const [format, setFormat] = useState(config.format ?? "jpeg");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; sizeKb: number; name: string; originalKb: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const blob = await compressToTarget(file, targetKb, format);
      const base = file.name.replace(/\.[^.]+$/, "");
      setResult({
        url: URL.createObjectURL(blob),
        sizeKb: Math.round(blob.size / 1024),
        originalKb: Math.round(file.size / 1024),
        name: `${base}-jansewak.${format === "png" ? "png" : "jpg"}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-sm font-semibold text-stone-800">📁 फोटो/फ़ाइल टूल · File helper</p>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setTargetKb(p.kb);
              setFormat(p.format);
            }}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              targetKb === p.kb ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-stone-300 text-stone-600"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="flex items-center gap-1 text-stone-600">
          Max
          <input
            type="number"
            min={5}
            value={targetKb}
            onChange={(e) => setTargetKb(Number(e.target.value))}
            className="w-16 rounded border border-stone-300 px-1.5 py-1"
          />
          KB
        </label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="rounded border border-stone-300 px-1.5 py-1 text-stone-700"
        >
          <option value="jpeg">JPG</option>
          <option value="png">PNG</option>
        </select>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="ml-auto rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Processing…" : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {result && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-sm">
          <span className="text-emerald-800">
            ✓ {result.originalKb}KB → <b>{result.sizeKb}KB</b>
          </span>
          <a
            href={result.url}
            download={result.name}
            className="ml-auto rounded-lg border border-emerald-600 px-3 py-1 font-medium text-emerald-800 hover:bg-emerald-100"
          >
            ⬇ Download
          </a>
        </div>
      )}
    </div>
  );
}

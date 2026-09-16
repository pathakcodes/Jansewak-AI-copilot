"use client";
import { useUiLanguage } from "@/lib/ui-language";

import { useEffect, useRef } from "react";
import { Highlight } from "@/lib/tools";

interface ScreenFeedProps {
  stream: MediaStream | null;
  highlight: Highlight | null;
}

/** Live screen-share preview with the agent's highlight box drawn on top. */
export default function ScreenFeed({ stream, highlight }: ScreenFeedProps) {
  const { t } = useUiLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const highlightRef = useRef<Highlight | null>(null);

  useEffect(() => {
    highlightRef.current = highlight;
  }, [highlight]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Track the video's rendered size without layout reads inside the rAF loop.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
    });
    ro.observe(video);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let wasDrawing = false;
    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video && canvas.width > 0) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const h = highlightRef.current;
          const active = !!h && performance.now() - h.at < 20000;
          if (active || wasDrawing)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          wasDrawing = active;
          // Highlights fade out after 20s so stale boxes don't mislead.
          if (h && active) {
            const x = (h.xmin / 1000) * canvas.width;
            const y = (h.ymin / 1000) * canvas.height;
            const w = ((h.xmax - h.xmin) / 1000) * canvas.width;
            const hh = ((h.ymax - h.ymin) / 1000) * canvas.height;
            const pulse =
              0.55 + 0.45 * Math.abs(Math.sin(performance.now() / 400));

            // yellow marker style — border + highlighter fill
            ctx.strokeStyle = `rgba(234, 179, 8, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, hh);
            ctx.fillStyle = `rgba(250, 204, 21, ${0.25 * pulse})`;
            ctx.fillRect(x, y, w, hh);

            if (h.label) {
              ctx.font = "600 13px system-ui, sans-serif";
              const tw = ctx.measureText(h.label).width;
              const ly = y > 24 ? y - 8 : y + hh + 18;
              ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
              ctx.beginPath();
              ctx.roundRect(x - 2, ly - 15, tw + 12, 21, 5);
              ctx.fill();
              ctx.fillStyle = "#1c1917";
              ctx.fillText(h.label, x + 4, ly);
            }
          }
        }
      }
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg border border-stone-300 bg-stone-900">
      <video ref={videoRef} muted playsInline className="block w-full" />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
      />
      {!stream && (
        <div className="flex aspect-video items-center justify-center text-sm text-stone-400">
          {t("Screen share बंद है · not sharing")}
        </div>
      )}
    </div>
  );
}

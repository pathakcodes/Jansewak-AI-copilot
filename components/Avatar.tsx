"use client";
import { useUiLanguage } from "@/lib/ui-language";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { AvatarSceneHandle } from "@/lib/avatarHuman";

export type AvatarState = "idle" | "connecting" | "listening" | "speaking";

interface AvatarProps {
  state: AvatarState;
  /** Returns current agent-voice output level, 0..1. Sampled every frame. */
  getLevel?: () => number;
  size?: number;
  framing?: "close" | "portrait";
}

/**
 * JanSewak — a realistic 3D human avatar (rigged GLB with ARKit facial
 * blendshapes). Her lips articulate with the live voice level, she blinks,
 * breathes, and keeps eye contact by tracking the cursor.
 */
export default function Avatar({
  state,
  getLevel,
  size = 280,
  framing = "close",
}: AvatarProps) {
  const { t } = useUiLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const loaded = readyKey === `${size}:${framing}`;
  // latest props readable from the persistent render loop
  const propsRef = useRef({ state, getLevel });
  useEffect(() => {
    propsRef.current = { state, getLevel };
  }, [state, getLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Run the loop on the window that actually displays this avatar. When
    // rendered inside the Document-PiP window, the main tab is usually
    // hidden and its requestAnimationFrame is paused — the PiP window's
    // own rAF keeps ticking.
    const win: Window = canvas.ownerDocument.defaultView ?? window;
    let scene: AvatarSceneHandle | undefined;
    let disposed = false;
    let loading = false;
    let visible = false;
    let raf = 0;
    let lastFrame = 0;
    const tick = (now: number) => {
      raf = 0;
      if (disposed || !visible || canvas.ownerDocument.hidden || !scene) return;
      const { state: s, getLevel: gl } = propsRef.current;
      // Idle motion does not need a full 60fps render loop.
      if (now - lastFrame >= (s === "speaking" ? 1000 / 60 : 1000 / 30)) {
        scene.tick(s, s === "speaking" && gl ? gl() : 0, now);
        lastFrame = now;
      }
      raf = win.requestAnimationFrame(tick);
    };
    const resume = () => {
      if (!raf && visible && !canvas.ownerDocument.hidden && scene)
        raf = win.requestAnimationFrame(tick);
    };
    const load = async () => {
      if (loading || disposed) return;
      loading = true;
      try {
        const { createAvatarScene } = await import("@/lib/avatarHuman");
        if (disposed) return;
        scene = createAvatarScene(
          canvas,
          size,
          size * 1.15,
          () => {
            if (!disposed) setReadyKey(`${size}:${framing}`);
          },
          framing,
        );
        resume();
      } catch (error) {
        // The lightweight portrait remains visible if WebGL is unavailable.
        console.warn("3D avatar unavailable", error);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        void load();
        resume();
      } else {
        win.cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    observer.observe(canvas);
    canvas.ownerDocument.addEventListener("visibilitychange", resume);

    // she keeps soft eye contact — eyes and head follow the cursor
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      if (!visible || !scene) return;
      scene.setPointer(
        (e.clientX - (r.left + r.width / 2)) / (win.innerWidth / 2),
        (e.clientY - (r.top + r.height / 2)) / (win.innerHeight / 2),
      );
    };
    win.document.addEventListener("mousemove", onMove);

    return () => {
      disposed = true;
      observer.disconnect();
      win.cancelAnimationFrame(raf);
      canvas.ownerDocument.removeEventListener("visibilitychange", resume);
      win.document.removeEventListener("mousemove", onMove);
      scene?.dispose();
    };
  }, [size, framing]);

  return (
    <div
      className="relative"
      style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1.15" }}
    >
      {/* warm halo behind her; pulses softly until the model is ready */}
      <div
        className={`absolute inset-0 rounded-full ${loaded ? "" : "animate-pulse"}`}
        style={{
          background:
            "radial-gradient(circle at 50% 42%, #FCEBDD 0%, rgba(252,231,214,0) 68%)",
        }}
      />
      <Image
        src={
          framing === "portrait"
            ? "/avatar-portrait.webp"
            : "/avatar-close.webp"
        }
        alt=""
        aria-hidden="true"
        width={720}
        height={828}
        unoptimized
        loading={framing === "portrait" ? "eager" : "lazy"}
        fetchPriority={framing === "portrait" ? "high" : "auto"}
        className="absolute inset-0 h-full w-full"
        style={{ opacity: loaded ? 0 : 1 }}
      />
      <canvas
        ref={canvasRef}
        className="relative h-full w-full transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0 }}
        aria-label={t("JanSewak assistant avatar")}
        role="img"
      />

      {/* status ring */}
      {state === "listening" && (
        <span className="absolute inset-x-0 -bottom-1 mx-auto w-max rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-medium text-emerald-800">
          {t("सुन रही हूँ… listening")}
        </span>
      )}
    </div>
  );
}

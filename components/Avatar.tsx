"use client";

import { useEffect, useRef, useState } from "react";
import { createAvatarScene } from "@/lib/avatarHuman";

export type AvatarState = "idle" | "connecting" | "listening" | "speaking";

interface AvatarProps {
  state: AvatarState;
  /** Returns current agent-voice output level, 0..1. Sampled every frame. */
  getLevel?: () => number;
  size?: number;
}

/**
 * JanSewak — a realistic 3D human avatar (rigged GLB with ARKit facial
 * blendshapes). Her lips articulate with the live voice level, she blinks,
 * breathes, and keeps eye contact by tracking the cursor.
 */
export default function Avatar({ state, getLevel, size = 280 }: AvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  // latest props readable from the persistent render loop
  const propsRef = useRef({ state, getLevel });
  useEffect(() => {
    propsRef.current = { state, getLevel };
  }, [state, getLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = createAvatarScene(canvas, size, size * 1.15, () => setLoaded(true));

    // Run the loop on the window that actually displays this avatar. When
    // rendered inside the Document-PiP window, the main tab is usually
    // hidden and its requestAnimationFrame is paused — the PiP window's
    // own rAF keeps ticking.
    const win: Window = canvas.ownerDocument.defaultView ?? window;
    let raf = 0;
    const tick = () => {
      const { state: s, getLevel: gl } = propsRef.current;
      scene.tick(s, s === "speaking" && gl ? gl() : 0, performance.now());
      raf = win.requestAnimationFrame(tick);
    };
    raf = win.requestAnimationFrame(tick);

    // she keeps soft eye contact — eyes and head follow the cursor
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      scene.setPointer(
        (e.clientX - (r.left + r.width / 2)) / (win.innerWidth / 2),
        (e.clientY - (r.top + r.height / 2)) / (win.innerHeight / 2),
      );
    };
    win.document.addEventListener("mousemove", onMove);

    return () => {
      win.cancelAnimationFrame(raf);
      win.document.removeEventListener("mousemove", onMove);
      scene.dispose();
    };
  }, [size]);

  return (
    <div className="relative" style={{ width: size, height: size * 1.15 }}>
      {/* warm halo behind her; pulses softly until the model is ready */}
      <div
        className={`absolute inset-0 rounded-full ${loaded ? "" : "animate-pulse"}`}
        style={{ background: "radial-gradient(circle at 50% 42%, #FCEBDD 0%, rgba(252,231,214,0) 68%)" }}
      />
      <canvas
        ref={canvasRef}
        className="relative h-full w-full transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0 }}
        aria-label="JanSewak assistant avatar"
        role="img"
      />

      {/* status ring */}
      {state === "listening" && (
        <span className="absolute inset-x-0 -bottom-1 mx-auto w-max rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-medium text-emerald-800">
          सुन रही हूँ… listening
        </span>
      )}
    </div>
  );
}

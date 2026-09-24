"use client";

import { useEffect, useRef, useState } from "react";

/** Keep the below-fold recording and poster out of the initial request queue. */
export default function DemoVideo({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="home-video" style={{ aspectRatio: "16 / 9" }}>
      {visible && (
        <video
          controls
          preload="none"
          playsInline
          poster="/pitch/demo-poster.jpg"
          aria-label={label}
          src="/pitch/demo.mp4"
        />
      )}
    </div>
  );
}

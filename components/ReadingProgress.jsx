"use client";

import { useEffect, useState } from "react";

// Thin scroll-reading progress bar pinned to the top of the viewport.
export default function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div className="progress-bar" aria-hidden="true">
      <span className="progress-bar--completed" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const Icon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// Header search: an icon that expands into an input and routes to /search?q=…
export default function SearchBox() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  const router = useRouter();

  function go(e) {
    e.preventDefault();
    const term = q.trim();
    if (!term) {
      if (!open) {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      return;
    }
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setOpen(false);
    setQ("");
  }

  return (
    <form className={`search-form${open ? " open" : ""}`} role="search" onSubmit={go}>
      <input
        ref={inputRef}
        type="search"
        name="q"
        placeholder="Search articles"
        aria-label="Search articles"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => { if (!q.trim()) setOpen(false); }}
      />
      <button type="submit" className="search-icon" aria-label="Search">
        <Icon />
      </button>
    </form>
  );
}

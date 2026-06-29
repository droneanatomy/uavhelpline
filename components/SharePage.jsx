"use client";

import { useEffect, useState } from "react";

const icons = {
  x: <path d="M18.9 2.5h3.3l-7.2 8.2 8.5 11.3h-6.7l-5.2-6.9-6 6.9H1.5l7.7-8.8L1 2.5h6.9l4.7 6.3 6.3-6.3zm-1.2 17.6h1.8L7.4 4.3H5.5l12.2 15.8z" />,
  facebook: <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />,
  telegram: <path d="M21.94 4.3 2.5 11.79c-1.06.43-1.05 1.04-.19 1.3l4.99 1.56 1.93 5.92c.24.66.12.92.81.92.54 0 .78-.25 1.08-.54l2.33-2.27 4.85 3.58c.89.49 1.53.24 1.76-.83l3.18-14.98c.32-1.31-.5-1.9-1.31-1.53z" />,
  email: <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 7L4 6.5V18h16V6.5L12 11z" />,
};

export default function SharePage({ title = "", vertical = false, label = "Share this page" }) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { key: "x", label: "Share on X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { key: "facebook", label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: "telegram", label: "Share on Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { key: "email", label: "Share by email", href: `mailto:?subject=${t}&body=${u}` },
  ];

  return (
    <div className={`section-share${vertical ? " section-share--vertical" : ""}`}>
      {label ? <span className="section-share__label">{label}</span> : null}
      <div className="section-share__icons">
        {links.map((l) => (
          <a key={l.key} href={l.href} aria-label={l.label} target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {icons[l.key]}
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}

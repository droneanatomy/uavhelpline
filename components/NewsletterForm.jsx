"use client";

import { useState } from "react";

const INTERESTS = [
  "UAV Professional / Operator",
  "Engineer / Manufacturer",
  "Investor",
  "Researcher / Academic",
  "Government / Regulator",
  "Defence",
  "Enthusiast / Hobbyist",
  "Media / Analyst",
  "Other",
];

// Posts to /api/subscribe, which forwards to Brevo server-side (the Brevo API
// key stays on the server). Name, email, and area of interest are required.
export default function NewsletterForm() {
  const [form, setForm] = useState({ name: "", email: "", industry: "", linkedin: "", about: "" });
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [msg, setMsg] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.industry) return;

    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          industry: form.industry,
          linkedin: form.linkedin.trim(),
          about: form.about.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setState("done");
        setMsg(
          data.pending
            ? "Thanks — sign-ups open shortly. You'll be among the first on the list."
            : data.already
              ? "You're already subscribed — watch your inbox."
              : "You're on the list — watch your inbox."
        );
      } else {
        setState("error");
        setMsg(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setState("error");
      setMsg("Network error — please try again.");
    }
  }

  if (state === "done") {
    return <p className="subscribe-done">{msg}</p>;
  }

  const loading = state === "loading";
  return (
    <form className="subscribe-form" onSubmit={submit}>
      <div className="subscribe-field">
        <label htmlFor="nl-name">Name</label>
        <input id="nl-name" type="text" required value={form.name} onChange={set("name")} disabled={loading} autoComplete="name" />
      </div>
      <div className="subscribe-field">
        <label htmlFor="nl-email">Email</label>
        <input id="nl-email" type="email" required placeholder="you@example.com" value={form.email} onChange={set("email")} disabled={loading} autoComplete="email" />
      </div>
      <div className="subscribe-field">
        <label htmlFor="nl-industry">Area of interest</label>
        <select id="nl-industry" required value={form.industry} onChange={set("industry")} disabled={loading}>
          <option value="" disabled>Select one…</option>
          {INTERESTS.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>
      <div className="subscribe-field">
        <label htmlFor="nl-linkedin">LinkedIn <span className="opt">(optional)</span></label>
        <input id="nl-linkedin" type="url" value={form.linkedin} onChange={set("linkedin")} disabled={loading} placeholder="https://www.linkedin.com/in/…" autoComplete="url" />
      </div>
      <div className="subscribe-field">
        <label htmlFor="nl-about">Tell us about yourself <span className="opt">(optional)</span></label>
        <textarea id="nl-about" rows={3} value={form.about} onChange={set("about")} disabled={loading} placeholder="What you work on, what you're hoping to get from UAVHelpline…" />
      </div>
      <button type="submit" disabled={loading}>{loading ? "Joining…" : "Subscribe"}</button>
      {state === "error" && <p className="subscribe-error">{msg}</p>}
    </form>
  );
}

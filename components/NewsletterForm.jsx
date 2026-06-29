"use client";

import { useState } from "react";

// Posts to /api/subscribe, which forwards to Brevo server-side (the Brevo API
// key stays on the server). Until BREVO_API_KEY is set, the route accepts the
// email gracefully and the form shows a friendly "opening soon" message.
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;

    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
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

  return (
    <form className="subscribe-form" onSubmit={submit}>
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === "loading"}
      />
      <button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Joining…" : "Subscribe"}
      </button>
      {state === "error" && <p className="subscribe-error">{msg}</p>}
    </form>
  );
}

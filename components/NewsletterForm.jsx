"use client";

import { useState } from "react";

// Loops.so no-code form endpoint. Set NEXT_PUBLIC_LOOPS_FORM_ID to your form's
// id and submissions post straight to Loops (CORS-enabled, client-side).
// Until it's set, the form accepts the email gracefully so the page is usable.
const LOOPS_FORM_ID = process.env.NEXT_PUBLIC_LOOPS_FORM_ID;

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;

    // Not connected to Loops yet — accept gracefully (no data sent).
    if (!LOOPS_FORM_ID) {
      setState("done");
      setMsg("Thanks — sign-ups open shortly. You'll be among the first on the list.");
      return;
    }

    setState("loading");
    try {
      const res = await fetch(`https://app.loops.so/api/newsletter-form/${LOOPS_FORM_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email: value }).toString(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setState("done");
        setMsg("You're on the list — watch your inbox.");
      } else {
        setState("error");
        setMsg(data.message || "Something went wrong. Please try again.");
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

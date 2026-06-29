import { NextResponse } from "next/server";

// Newsletter subscribe → Brevo. The Brevo API key is secret, so it stays here
// (server-side) and never reaches the browser. Set BREVO_API_KEY (and optionally
// BREVO_LIST_ID) to go live; until then the route accepts the email gracefully.
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = String(body?.email || "").trim();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  const key = (process.env.BREVO_API_KEY || "").trim();
  if (!key) {
    // Not connected to Brevo yet — accept gracefully, send nothing.
    return NextResponse.json({ ok: true, pending: true });
  }

  const listId = Number(process.env.BREVO_LIST_ID);
  const payload = { email, updateEnabled: true };
  if (Number.isFinite(listId) && listId > 0) payload.listIds = [listId];

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": key,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    // 201 = created, 204 = updated (updateEnabled). Both are success.
    if (res.ok || res.status === 204) {
      return NextResponse.json({ ok: true });
    }

    const data = await res.json().catch(() => ({}));
    // Already subscribed is fine from the user's perspective.
    if (res.status === 400 && data?.code === "duplicate_parameter") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json(
      { ok: false, error: data?.message || "Subscription failed. Please try again." },
      { status: 502 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Network error. Please try again." }, { status: 502 });
  }
}

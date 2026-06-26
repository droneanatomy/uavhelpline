import { NextResponse } from "next/server";
import { runPipeline } from "../../../scripts/lib/pipeline.mjs";
import { isSupabaseConfigured } from "../../../lib/supabase";

// Daily AI flow, triggered by Vercel Cron (see vercel.json). Vercel automatically
// sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is configured —
// we require it so the endpoint can't be run by anyone else.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby cap; raise to 300 on Vercel Pro for long drafts.

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cron writes drafts to the backend; on Vercel the filesystem is read-only,
  // so Supabase must be configured for saves to persist.
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured — cron cannot persist drafts." },
      { status: 503 }
    );
  }

  try {
    const result = await runPipeline({});
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

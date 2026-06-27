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

  // Log start/finish so every run leaves a visible trail in Vercel logs /
  // Observability — even when nothing is drafted (picked:false writes nothing).
  const startedAt = new Date().toISOString();
  console.log(`[cron] start ${startedAt}`);
  try {
    const result = await runPipeline({});
    console.log(
      `[cron] done picked=${result.picked} ` +
        `${result.picked ? `slug=${result.slug}` : `reason="${result.reason}"`} ` +
        `stats=${JSON.stringify(result.stats || {})}`
    );
    return NextResponse.json({ ok: true, ranAt: startedAt, ...result });
  } catch (err) {
    console.error(`[cron] error: ${err?.stack || err}`);
    return NextResponse.json({ ok: false, ranAt: startedAt, error: String(err?.message || err) }, { status: 500 });
  }
}

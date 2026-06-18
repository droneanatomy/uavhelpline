import { NextResponse } from "next/server";
import { isSupabaseConfigured, getUserFromToken } from "../../../lib/supabase";
import { draftPostStream } from "../../../scripts/lib/draft.mjs";
import { finalizeAndSave } from "../../../scripts/lib/save.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby plan cap; raise to 300 on Vercel Pro for long drafts

function bearer(request) {
  const h = request.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

// Manual run: research + draft a typed topic, streaming live progress as SSE.
export async function POST(request) {
  if (isSupabaseConfigured() && !(await getUserFromToken(bearer(request)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Manual generation needs ANTHROPIC_API_KEY set on the server." },
      { status: 400 }
    );
  }

  let topic;
  try {
    topic = (await request.json())?.topic;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: "A topic is required." }, { status: 400 });
  }

  const candidate = { title: topic.trim(), summary: "", url: "", category: "" };
  const today = new Date().toISOString().slice(0, 10);
  const encoder = new TextEncoder();
  const send = (controller, obj) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

  const stream = new ReadableStream({
    async start(controller) {
      try {
        send(controller, { stage: "start", detail: "Starting research…" });
        const draft = await draftPostStream(candidate, {
          onProgress: (p) => send(controller, p),
        });
        send(controller, { stage: "save", detail: "Saving draft…" });
        const { slug } = await finalizeAndSave(draft, candidate, today);
        send(controller, { done: true, slug, safetyReview: draft.safetyReview });
      } catch (err) {
        send(controller, { error: err?.message || "Generation failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

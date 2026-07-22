import { NextResponse } from "next/server";
import { isSupabaseConfigured, getUserFromToken } from "../../../lib/supabase";
import { runPipeline } from "../../../scripts/lib/pipeline.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby plan cap; raise to 300 on Vercel Pro for long pipelines

function bearer(request) {
  const h = request.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

// Run the full daily auto-pick pipeline on demand, streaming live progress as SSE.
export async function POST(request) {
  if (isSupabaseConfigured() && !(await getUserFromToken(bearer(request)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Running the pipeline needs ANTHROPIC_API_KEY set on the server." },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const send = (controller, obj) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // One post per manual run — the 60s function cap can't fit several drafts.
        const result = await runPipeline({ maxPosts: 1, onProgress: (p) => send(controller, p) });
        if (!result.picked) {
          send(controller, { done: true, skipped: true, reason: result.reason });
        } else {
          send(controller, { done: true, slug: result.slug, safetyReview: result.safetyReview });
        }
      } catch (err) {
        send(controller, { error: err?.message || "Pipeline failed." });
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

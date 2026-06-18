// Supabase Edge Function: notify-on-publish
// Triggered by a Database Webhook on the `posts` table (Insert + Update).
// When a post becomes 'published', it pushes a notification to every
// registered device via Expo's push service.
//
// Deploy:  supabase functions deploy notify-on-publish --no-verify-jwt
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record ?? {};
    const oldRecord = payload.old_record ?? {};

    // Only fire when status transitions INTO 'published'.
    const becamePublished =
      record.status === "published" && oldRecord.status !== "published";
    if (!becamePublished) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("token");
    if (error) throw error;

    const messages = (tokens ?? []).map((t: { token: string }) => ({
      to: t.token,
      sound: "default",
      title: record.title ?? "UAVHelpline",
      body: record.tldr ?? "A new story is live on UAVHelpline.",
      data: { slug: record.slug },
    }));

    // Expo accepts up to 100 messages per request.
    let sent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      sent += chunk.length;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    // Return 200 so the webhook does not retry-storm; log for debugging.
    console.error("notify-on-publish error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

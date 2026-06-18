import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  isSupabaseConfigured,
  getServerClient,
  getUserFromToken,
} from "../../../lib/supabase";

export const dynamic = "force-dynamic";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function bearer(request) {
  const h = request.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { slug, action = "publish" } = body || {};
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  // ---- Supabase backend (production) ----
  if (isSupabaseConfigured()) {
    const user = await getUserFromToken(bearer(request));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServerClient();
    if (action === "discard") {
      const { error } = await sb.from("posts").delete().eq("slug", slug);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "discarded", slug });
    }
    if (action === "unpublish") {
      const { error } = await sb.from("posts").update({ status: "draft" }).eq("slug", slug);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "unpublished", slug });
    }
    const { error } = await sb
      .from("posts")
      .update({ status: "published", date: new Date().toISOString().slice(0, 10) })
      .eq("slug", slug);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "published", slug });
  }

  // ---- File backend (local dev) ----
  const files = fs.existsSync(POSTS_DIR)
    ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("."))
    : [];
  let target = null;
  for (const file of files) {
    const full = path.join(POSTS_DIR, file);
    const parsed = matter(fs.readFileSync(full, "utf8"));
    const fileSlug = parsed.data.slug || file.replace(/\.md$/, "");
    if (fileSlug === slug) {
      target = { full, parsed };
      break;
    }
  }
  if (!target) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  if (action === "discard") {
    fs.unlinkSync(target.full);
    return NextResponse.json({ ok: true, action: "discarded", slug });
  }
  if (action === "unpublish") {
    target.parsed.data.status = "draft";
    fs.writeFileSync(target.full, matter.stringify(target.parsed.content, target.parsed.data), "utf8");
    return NextResponse.json({ ok: true, action: "unpublished", slug });
  }
  target.parsed.data.status = "published";
  if (!target.parsed.data.date) {
    target.parsed.data.date = new Date().toISOString().slice(0, 10);
  }
  fs.writeFileSync(target.full, matter.stringify(target.parsed.content, target.parsed.data), "utf8");
  return NextResponse.json({ ok: true, action: "published", slug });
}

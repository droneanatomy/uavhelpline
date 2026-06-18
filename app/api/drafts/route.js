import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getDrafts, getPublished, getBySlug } from "../../../lib/content";
import { slugify, frontmatter } from "../../../scripts/lib/filter.mjs";
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

async function requireEditor(request) {
  // In Supabase mode the admin is private; in file mode there is no auth.
  if (!isSupabaseConfigured()) return true;
  return Boolean(await getUserFromToken(bearer(request)));
}

// Locate a draft's Markdown file by slug (file backend only).
function findFileBySlug(slug) {
  if (!fs.existsSync(POSTS_DIR)) return null;
  for (const file of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("."))) {
    const full = path.join(POSTS_DIR, file);
    const parsed = matter(fs.readFileSync(full, "utf8"));
    const fileSlug = parsed.data.slug || file.replace(/\.md$/, "");
    if (fileSlug === slug) return { full, parsed };
  }
  return null;
}

export async function GET(request) {
  if (!(await requireEditor(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;

  // ?slug=… → the full single post (incl. body) for the edit form (any status).
  const slug = params.get("slug");
  if (slug) {
    const post = await getBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ draft: post });
  }

  // No slug → the summary list for the inbox, by status (default: draft).
  const status = params.get("status") === "published" ? "published" : "draft";
  const posts = status === "published" ? await getPublished() : await getDrafts();
  const drafts = posts.map((d) => ({
    slug: d.slug,
    title: d.title,
    category: d.category,
    date: d.date,
    tldr: d.tldr,
    image: d.image,
    safetyReview: d.safetyReview,
  }));
  return NextResponse.json({ drafts, status });
}

// Create a brand-new hand-written post as a draft. Slug is derived from the title.
export async function POST(request) {
  if (!(await requireEditor(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { title, body } = payload || {};
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }
  const slug = slugify(title);
  if (!slug) {
    return NextResponse.json({ error: "Could not derive a slug from the title." }, { status: 400 });
  }
  if (await getBySlug(slug)) {
    return NextResponse.json({ error: "A post with this slug already exists." }, { status: 409 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const fields = {
    title: title.trim(),
    category: payload.category || "news",
    tldr: payload.tldr || "",
    body,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    metaDescription: payload.metaDescription || "",
    image: payload.image || "/images/placeholder.svg",
  };

  // ---- Supabase backend ----
  if (isSupabaseConfigured()) {
    const sb = getServerClient();
    const { error } = await sb.from("posts").insert({
      slug,
      title: fields.title,
      status: "draft",
      date: today,
      category: fields.category,
      tags: fields.tags,
      tldr: fields.tldr,
      meta_description: fields.metaDescription,
      image: fields.image,
      sources: fields.sources,
      safety_review: false,
      author: "UAVHelpline Editorial",
      body: fields.body,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, slug });
  }

  // ---- File backend ----
  const fm = frontmatter({
    title: fields.title,
    slug,
    status: "draft",
    date: today,
    category: fields.category,
    tags: fields.tags,
    tldr: fields.tldr,
    metaDescription: fields.metaDescription,
    image: fields.image,
    sources: fields.sources,
    safetyReview: false,
  });
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(POSTS_DIR, `${today}-${slug}.md`), `${fm}\n\n${fields.body}\n`, "utf8");
  return NextResponse.json({ ok: true, slug });
}

// Save manual edits to a post (draft OR published). The current status is
// preserved; slug is never changed.
export async function PUT(request) {
  if (!(await requireEditor(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, title, body } = payload || {};
  if (!slug || !title?.trim() || !body?.trim()) {
    return NextResponse.json(
      { error: "slug, title and body are required." },
      { status: 400 }
    );
  }

  const fields = {
    title: title.trim(),
    category: payload.category || "news",
    tldr: payload.tldr || "",
    body,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    metaDescription: payload.metaDescription || "",
    image: payload.image || "/images/placeholder.svg",
  };

  // ---- Supabase backend ----
  if (isSupabaseConfigured()) {
    const sb = getServerClient();
    const { error } = await sb
      .from("posts")
      .update({
        title: fields.title,
        category: fields.category,
        tldr: fields.tldr,
        body: fields.body,
        tags: fields.tags,
        sources: fields.sources,
        meta_description: fields.metaDescription,
        image: fields.image,
      })
      .eq("slug", slug); // any status; status column left untouched
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, slug });
  }

  // ---- File backend ----
  const target = findFileBySlug(slug);
  if (!target) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const data = {
    ...target.parsed.data,
    title: fields.title,
    category: fields.category,
    tags: fields.tags,
    tldr: fields.tldr,
    metaDescription: fields.metaDescription,
    image: fields.image,
    sources: fields.sources,
    // status preserved from existing frontmatter (draft stays draft, published stays published)
  };
  fs.writeFileSync(target.full, matter.stringify(fields.body, data), "utf8");
  return NextResponse.json({ ok: true, slug });
}

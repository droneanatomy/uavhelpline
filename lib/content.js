// Content layer. Dual-mode:
//   • If Supabase is configured (env vars set) → read from the `posts` table.
//   • Otherwise → read Markdown files in content/posts (zero-config local dev).
// All functions are async so the two backends are interchangeable.
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { isSupabaseConfigured, getServerClient, rowToPost } from "./supabase";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function readFilePosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("."))
    .map((file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const body = content.trim();
      const words = body.split(/\s+/).filter(Boolean).length;
      return {
        slug: data.slug || file.replace(/\.md$/, ""),
        title: data.title || "Untitled",
        status: data.status || "draft",
        date: data.date || "",
        category: data.category || "news",
        tags: data.tags || [],
        tldr: data.tldr || "",
        metaDescription: data.metaDescription || "",
        image: data.image || "/images/placeholder.svg",
        sources: data.sources || [],
        safetyReview: data.safetyReview || false,
        author: data.author || "UAVHelpline Editorial",
        minutesRead: Math.max(1, Math.round(words / 200)),
        body,
      };
    });
}

function byDateDesc(a, b) {
  return new Date(b.date) - new Date(a.date);
}

async function readAll() {
  if (isSupabaseConfigured()) {
    const sb = getServerClient();
    const { data, error } = await sb
      .from("posts")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    return (data || []).map(rowToPost);
  }
  return readFilePosts().sort(byDateDesc);
}

export async function getPublished() {
  return (await readAll()).filter((p) => p.status === "published");
}

export async function getDrafts() {
  return (await readAll()).filter((p) => p.status === "draft");
}

export async function getByCategory(category) {
  return (await getPublished()).filter((p) => p.category === category);
}

export async function getBySlug(slug) {
  return (await readAll()).find((p) => p.slug === slug) || null;
}

export async function getLatest(n = 6) {
  return (await getPublished()).slice(0, n);
}

// Lightweight full-text search over published posts. Multi-word queries use AND
// semantics (every term must appear somewhere); results are ranked by where the
// terms hit — title/tags weigh most, body least — then by recency.
export async function searchPosts(query, limit = 50) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const posts = await getPublished();

  const scored = [];
  for (const p of posts) {
    const fields = {
      title: (p.title || "").toLowerCase(),
      tldr: (p.tldr || "").toLowerCase(),
      meta: (p.metaDescription || "").toLowerCase(),
      tags: (p.tags || []).join(" ").toLowerCase(),
      cat: (p.category || "").toLowerCase(),
      body: (p.body || "").toLowerCase(),
    };
    let score = 0;
    let matchedAll = true;
    for (const t of terms) {
      let hit = false;
      if (fields.title.includes(t)) { score += 8; hit = true; }
      if (fields.tags.includes(t)) { score += 4; hit = true; }
      if (fields.tldr.includes(t)) { score += 4; hit = true; }
      if (fields.meta.includes(t)) { score += 3; hit = true; }
      if (fields.cat.includes(t)) { score += 2; hit = true; }
      if (fields.body.includes(t)) { score += 1; hit = true; }
      if (!hit) { matchedAll = false; break; }
    }
    if (matchedAll && score > 0) scored.push({ p, score });
  }

  scored.sort((a, b) => b.score - a.score || new Date(b.p.date) - new Date(a.p.date));
  return scored.slice(0, limit).map((x) => x.p);
}

// Shared draft persistence: hero image + dual-backend save (file / Supabase).
// Used by both the morning CLI and the manual /api/generate route, so the save
// logic lives in exactly one place.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { slugify, frontmatter, canonicalUrl } from "./filter.mjs";
import { generateImage, buildImagePrompt } from "./image.mjs";
import { categoryColor } from "../../lib/categories.js";

// content-type → file extension for generated/uploaded hero images.
const EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const IMAGES_DIR = path.join(ROOT, "public", "images");

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const USE_SUPABASE = Boolean(SB_URL && SB_KEY);

async function sbClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

export function brandedSvg(label, bg = "#242ef7") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${label}">
  <rect width="1200" height="675" fill="${bg}"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1"><path d="M0 168 H1200 M0 336 H1200 M0 504 H1200 M300 0 V675 M600 0 V675 M900 0 V675"/></g>
  <g fill="#ffffff"><circle cx="600" cy="320" r="10"/><rect x="450" y="315" width="120" height="10" rx="5"/><rect x="630" y="315" width="120" height="10" rx="5"/><circle cx="450" cy="320" r="22" fill="none" stroke="#ffffff" stroke-width="6"/><circle cx="750" cy="320" r="22" fill="none" stroke="#ffffff" stroke-width="6"/></g>
  <text x="60" y="612" font-family="monospace" font-size="26" letter-spacing="3" fill="#ffffff">${label}</text>
</svg>`;
}

// Write image bytes to the file system or the Supabase 'images' bucket, return URL.
export async function saveImageBytes(filename, buffer, contentType) {
  if (USE_SUPABASE) {
    const sb = await sbClient();
    const { error } = await sb.storage.from("images").upload(filename, buffer, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`Image upload failed (is the 'images' bucket created?): ${error.message}`);
    const { data } = sb.storage.from("images").getPublicUrl(filename);
    return data.publicUrl;
  }
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
  return `/images/${filename}`;
}

// Branded-SVG fallback hero (no external API, no cost).
export async function saveImage(slug, svg) {
  return saveImageBytes(`auto-${slug}.svg`, Buffer.from(svg), "image/svg+xml");
}

// Build the hero: an AI editorial illustration if a provider key is set,
// otherwise the branded SVG. Never throws — image failures fall back to the SVG.
async function buildHeroImage(draft, slug, category) {
  const gen = await generateImage({ prompt: buildImagePrompt(draft, category) });
  if (gen) {
    const ext = EXT[gen.contentType] || "jpg";
    return saveImageBytes(`auto-${slug}.${ext}`, gen.buffer, gen.contentType);
  }
  return saveImage(slug, brandedSvg("UAVHELPLINE · DRAFT", categoryColor(category)));
}

export async function saveDraft(post, body) {
  if (USE_SUPABASE) {
    const sb = await sbClient();
    const { error } = await sb.from("posts").upsert(
      {
        slug: post.slug,
        title: post.title,
        status: "draft",
        date: post.date,
        category: post.category,
        tags: post.tags,
        tldr: post.tldr,
        meta_description: post.metaDescription,
        image: post.image,
        sources: post.sources,
        safety_review: post.safetyReview,
        author: "UAVHelpline Editorial",
        body,
      },
      { onConflict: "slug" }
    );
    if (error) throw new Error(error.message);
    return `posts/${post.slug} (Supabase)`;
  }
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  const fm = frontmatter({
    title: post.title,
    slug: post.slug,
    status: "draft",
    date: post.date,
    category: post.category,
    tags: post.tags,
    tldr: post.tldr,
    metaDescription: post.metaDescription,
    image: post.image,
    sources: post.sources,
    safetyReview: post.safetyReview,
  });
  const filename = `${post.date}-auto-${post.slug}.md`;
  fs.writeFileSync(path.join(POSTS_DIR, filename), `${fm}\n\n${body}\n`, "utf8");
  return filename;
}

// Canonical URLs of every story already covered, so the engine never re-drafts one.
export async function loadCoveredUrls() {
  const urls = new Set();
  if (USE_SUPABASE) {
    const sb = await sbClient();
    const { data } = await sb.from("posts").select("sources");
    for (const row of data || []) {
      for (const u of row.sources || []) urls.add(canonicalUrl(u));
    }
    return urls;
  }
  if (!fs.existsSync(POSTS_DIR)) return urls;
  for (const file of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("."))) {
    const { data } = matter(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"));
    for (const u of data.sources || []) urls.add(canonicalUrl(u));
  }
  return urls;
}

// Build the post record from a finished draft, write its image + draft, return slug.
// RSS keeps its source beat (candidate.category); manual uses the model's choice.
export async function finalizeAndSave(draft, candidate, today) {
  const category = candidate.category || draft.category || "news";
  const slug = slugify(draft.title);
  const image = await buildHeroImage(draft, slug, category);
  const post = {
    slug,
    title: draft.title,
    date: today,
    category,
    tags: draft.tags,
    tldr: draft.tldr,
    metaDescription: draft.metaDescription,
    image,
    sources: draft.sources,
    safetyReview: draft.safetyReview,
  };
  const saved = await saveDraft(post, draft.body);
  return { slug, saved, post };
}

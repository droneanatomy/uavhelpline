#!/usr/bin/env node
/**
 * Migrate the Markdown posts in content/posts into the Supabase `posts` table.
 * Run once after creating the schema:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 *
 * (or put those in .env.local and use a loader). Safe to re-run — it upserts.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "content", "posts");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const rows = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith(".md") && !f.startsWith("."))
  .map((file) => {
    const { data, content } = matter(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"));
    return {
      slug: data.slug || file.replace(/\.md$/, ""),
      title: data.title || "Untitled",
      status: data.status || "draft",
      date: data.date || null,
      category: data.category || "news",
      tags: data.tags || [],
      tldr: data.tldr || "",
      meta_description: data.metaDescription || "",
      image: data.image || "/images/placeholder.svg",
      sources: data.sources || [],
      safety_review: data.safetyReview || false,
      author: data.author || "UAVHelpline Editorial",
      body: content.trim(),
    };
  });

const { error } = await sb.from("posts").upsert(rows, { onConflict: "slug" });
if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}
console.log(`Seeded ${rows.length} posts into Supabase.`);

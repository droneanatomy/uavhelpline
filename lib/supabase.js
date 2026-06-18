// Server-side Supabase access. Used by the content layer and API routes.
// If the env vars are not set, the app transparently falls back to Markdown
// files, so local development works with zero configuration.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(URL && ANON);
}

// Server client. Uses the service-role key when available (bypasses RLS so the
// editor can read drafts and publish); otherwise the anon key for public reads.
export function getServerClient() {
  if (!URL || !(SERVICE || ANON)) return null;
  return createClient(URL, SERVICE || ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Verify a user's access token (sent by the admin UI) and return the user.
export async function getUserFromToken(token) {
  if (!token || !URL || !ANON) return null;
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return data.user || null;
}

// Map a database row (snake_case) to the shape the app uses (camelCase).
export function rowToPost(row) {
  const body = row.body || "";
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug: row.slug,
    title: row.title || "Untitled",
    status: row.status || "draft",
    date: row.date || "",
    category: row.category || "news",
    tags: row.tags || [],
    tldr: row.tldr || "",
    metaDescription: row.meta_description || "",
    image: row.image || "/images/placeholder.svg",
    sources: row.sources || [],
    safetyReview: row.safety_review || false,
    author: row.author || "UAVHelpline Editorial",
    minutesRead: Math.max(1, Math.round(words / 200)),
    body,
  };
}

// Weekly newsletter — collect the week's published posts and curate an issue.
// Curation is AI (Claude) when ANTHROPIC_API_KEY is set, else a deterministic
// fallback. No web search — it only summarizes already-published, vetted posts.
import { PRIORITY_BRANDS } from "./filter.mjs";
import { extractJson } from "./draft.mjs";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

function rowToPost(r) {
  return {
    slug: r.slug,
    title: r.title || "Untitled",
    date: r.date || "",
    category: r.category || "news",
    tags: r.tags || [],
    tldr: r.tldr || "",
    metaDescription: r.meta_description || "",
    image: r.image || "/images/placeholder.svg",
  };
}

// Published posts from the last `days`, newest first, excluding prior digests.
export async function collectWeek({ days = 7, now = Date.now(), client } = {}) {
  let sb = client;
  if (!sb) {
    const { createClient } = await import("@supabase/supabase-js");
    sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  }
  const since = new Date(now - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("posts")
    .select("*")
    .eq("status", "published")
    .gte("date", since)
    .order("date", { ascending: false });
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return (data || []).map(rowToPost).filter((p) => !(p.tags || []).includes("digest"));
}

export function isPriorityPost(post) {
  const t = `${post.title || ""} ${post.tldr || ""}`;
  return new RegExp(`\\b(${PRIORITY_BRANDS.join("|")})\\b`, "i").test(t);
}

// Deterministic curation: priority brands first, then most recent.
export function fallbackIssue(posts) {
  const sorted = [...posts].sort(
    (a, b) => (isPriorityPost(b) ? 1 : 0) - (isPriorityPost(a) ? 1 : 0) || (a.date < b.date ? 1 : -1)
  );
  const lead = sorted[0] || null;
  const focused = sorted.slice(1, 4);
  const chosen = new Set([lead, ...focused].filter(Boolean).map((p) => p.slug));
  const roundup = posts.filter((p) => !chosen.has(p.slug));
  return {
    subject: lead ? `UAVHelpline Weekly — ${lead.title}` : "UAVHelpline Weekly",
    intro:
      "The week in UAV technology — the developments that matter across defence, commercial, components, autonomy, and regulation, in one fast read.",
    lead: lead ? { ...lead, take: lead.tldr || lead.metaDescription } : null,
    focused: focused.map((p) => ({ ...p, take: p.tldr || p.metaDescription })),
    roundup,
  };
}

const SYSTEM = `You are the editor of UAVHelpline's weekly email newsletter, a credible UAV/drone
intelligence brand. You are given the list of stories published this week. Choose the
single most important as the LEAD and up to three more as FOCUSED picks, then write short,
neutral, technical editorial copy for them.

RULES:
- Priority brands — ${PRIORITY_BRANDS.join(", ")} — are weighted up: prefer their news for
  the lead/focused when present.
- Neutral, analytical, technical tone. No opinion, no politics, no geopolitical framing.
- Paraphrase; do not invent facts beyond the supplied titles/summaries.
- The intro is 1-2 sentences. The lead take is 2-3 sentences. Each focused take is 1-2 sentences.
- The subject line is punchy, <=70 chars, no clickbait.

OUTPUT: respond with ONLY this JSON object and nothing else:
{
  "subject": "email subject",
  "intro": "1-2 sentence intro",
  "leadSlug": "slug-of-lead",
  "leadTake": "2-3 sentences",
  "focused": [ { "slug": "slug", "take": "1-2 sentences" } ]
}`;

function buildUserPrompt(posts) {
  const list = posts
    .map((p) => `- [${p.slug}] (${p.category}, ${p.date}) ${p.title} — ${p.tldr || p.metaDescription}`)
    .join("\n");
  return `This week's published stories:\n${list}\n\nPick the lead + up to 3 focused and write the copy.`;
}

function assembleFromAI(parsed, posts) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const lead = bySlug.get(parsed.leadSlug) || null;
  const focused = [];
  const used = new Set(lead ? [lead.slug] : []);
  for (const f of Array.isArray(parsed.focused) ? parsed.focused : []) {
    const p = bySlug.get(f?.slug);
    if (p && !used.has(p.slug) && focused.length < 3) {
      used.add(p.slug);
      focused.push({ ...p, take: (f.take || p.tldr || "").trim() });
    }
  }
  const roundup = posts.filter((p) => !used.has(p.slug));
  return {
    subject: (parsed.subject || `UAVHelpline Weekly`).trim(),
    intro: (parsed.intro || "").trim(),
    lead: lead ? { ...lead, take: (parsed.leadTake || lead.tldr || "").trim() } : null,
    focused,
    roundup,
  };
}

// Returns the issue object, or null when there are no posts.
export async function curateIssue(
  posts,
  { apiKey = process.env.ANTHROPIC_API_KEY, model = process.env.UAVHELPLINE_DRAFT_MODEL || DEFAULT_MODEL, fetchImpl = fetch } = {}
) {
  if (!posts.length) return null;
  if (!apiKey) return fallbackIssue(posts);

  try {
    const res = await fetchImpl(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: buildUserPrompt(posts) }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const parsed = extractJson(text);
    if (!parsed || !parsed.leadSlug) throw new Error("no parseable curation JSON");
    const issue = assembleFromAI(parsed, posts);
    if (!issue.lead) throw new Error("lead slug not found among posts");
    return issue;
  } catch (err) {
    console.warn(`[newsletter] AI curation failed (${err.message}); using fallback.`);
    return fallbackIssue(posts);
  }
}

// Pure pipeline helpers for the morning engine: relevance, dedup, ranking,
// safety scanning, and output formatting. No I/O here so each is unit-testable.

// ---- Topic filter (the brief's allow / reject rules) ----------------------
export const ALLOW = [
  "uav", "drone", "uas", "counter-uav", "c-uas", "loitering", "isr",
  "payload", "autonomy", "bvlos", "swarm", "flight controller", "lidar",
  "propulsion", "battery", "certification", "regulation", "navigation",
];

export const REJECT = [
  "election", "politics", "geopolitic", "airline", "airport",
  "celebrity", "lifestyle",
];

export function isRelevant(text) {
  const t = (text || "").toLowerCase();
  if (REJECT.some((w) => t.includes(w))) return false;
  return ALLOW.some((w) => t.includes(w));
}

// ---- Dedup ----------------------------------------------------------------
export function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Strip query/hash/trailing slash so the same story on the same URL dedupes.
export function canonicalUrl(u) {
  try {
    const url = new URL(u);
    url.hash = "";
    url.search = "";
    return (url.origin + url.pathname).replace(/\/$/, "");
  } catch {
    return (u || "").trim();
  }
}

// Remove duplicates within the batch and any whose URL was already covered.
// `seenUrls` is a Set of canonical URLs from existing posts; it is mutated so
// callers can reuse it across batches.
export function dedupe(items, seenUrls = new Set()) {
  const seenTitles = new Set();
  const out = [];
  for (const it of items) {
    const nt = normalizeTitle(it.title);
    if (!nt) continue;
    const cu = canonicalUrl(it.url);
    if (cu && seenUrls.has(cu)) continue;
    if (seenTitles.has(nt)) continue;
    seenTitles.add(nt);
    if (cu) seenUrls.add(cu);
    out.push(it);
  }
  return out;
}

// ---- Ranking --------------------------------------------------------------
// Tier dominates (primary/core sources first); recency breaks ties within 72h.
export function score(item, now = Date.now()) {
  const tierWeight = { 1: 3, 2: 2, 3: 1 }[item.tier] || 1;
  let recency = 0;
  if (item.publishedAt) {
    const ageHours = (now - new Date(item.publishedAt).getTime()) / 36e5;
    if (Number.isFinite(ageHours)) recency = Math.max(0, 72 - ageHours) / 72;
  }
  return tierWeight + recency;
}

export function rankAndPick(items, now = Date.now()) {
  return [...items].sort((a, b) => score(b, now) - score(a, now))[0] || null;
}

// ---- Safety firewall (keyword backstop) -----------------------------------
// The LLM prompt is the primary safety control; this is a cheap second net that
// flags drafts for review even on the offline (placeholder) path.
const SAFETY_TERMS = [
  "how to build", "build a bomb", "weaponize", "weaponization",
  "payload arming", "detonat", "warhead", "bypass countermeasure",
  "defeat counter-uav", "jamming instructions",
];

export function scanSafety(text) {
  const t = (text || "").toLowerCase();
  return SAFETY_TERMS.some((w) => t.includes(w));
}

// ---- Output formatting ----------------------------------------------------
export function slugify(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function frontmatter(obj) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      v.forEach((item) => lines.push(`  - ${JSON.stringify(item)}`));
    } else if (typeof v === "string") {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

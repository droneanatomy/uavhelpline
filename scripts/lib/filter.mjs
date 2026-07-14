// Pure pipeline helpers for the morning engine: relevance, dedup, ranking,
// safety scanning, and output formatting. No I/O here so each is unit-testable.

// ---- Topic filter (the brief's allow / reject rules) ----------------------
export const ALLOW = [
  "uav", "drone", "uas", "counter-uav", "c-uas", "loitering", "isr",
  "payload", "autonomy", "bvlos", "swarm", "flight controller", "lidar",
  "propulsion", "battery", "certification", "regulation", "navigation",
  // Drones in war / ongoing conflicts (specific terms — bare "war" would match
  // "software"). The draft guardrail still keeps coverage technical, not political.
  "warfare", "combat", "military", "battlefield", "frontline", "munition",
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

// ---- PASS 1 · Source check ------------------------------------------------
// Keep only items whose source is in the trusted registry. Items already come
// from registry feeds, so this is a guard against anything mis-tagged; if no
// trusted set is supplied we don't over-filter.
export function hostOf(u) {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function sourceCheck(items, trustedNames) {
  if (!trustedNames || !trustedNames.size) return items;
  return items.filter((it) => trustedNames.has(it.source));
}

// Remove already-published URLs and exact-duplicate URLs, but DO keep the same
// story reported by different outlets (different URLs) — clustering needs them.
export function dropCovered(items, seenUrls = new Set()) {
  const seenExact = new Set();
  const out = [];
  for (const it of items) {
    const cu = canonicalUrl(it.url);
    if (cu && seenUrls.has(cu)) continue;
    if (cu && seenExact.has(cu)) continue;
    if (cu) seenExact.add(cu);
    out.push(it);
  }
  return out;
}

// ---- CLUSTER · group items that describe the same story -------------------
const STOPWORDS = new Set(
  ("the a an and or of for to in on with at by from as is are be new first into " +
    "over its their this that has have had will plus amp more most than up down " +
    "after before about now says say after amid via what why how it he she they")
    .split(/\s+/)
);

export function tokens(text) {
  return [
    ...new Set(
      (text || "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    ),
  ];
}

// Overlap relative to the smaller token set — robust to headline length diffs.
export function similarity(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.min(A.size, B.size);
}

// Greedy clustering on title tokens. Each cluster keeps its seed item's tokens
// fixed so matches don't drift as members accumulate.
export function clusterStories(items, threshold = 0.5) {
  const clusters = [];
  for (const it of items) {
    const tk = tokens(it.title);
    let best = null;
    let bestSim = 0;
    for (const c of clusters) {
      const sim = similarity(tk, c.tokens);
      if (sim > bestSim) {
        bestSim = sim;
        best = c;
      }
    }
    if (best && bestSim >= threshold) best.items.push(it);
    else clusters.push({ tokens: tk, items: [it] });
  }
  return clusters;
}

// ---- PASS 2 · Cross-check -------------------------------------------------
// PRIMARY sources are authoritative on their own (the maker/regulator/lab is the
// origin of the claim). Everything else needs ≥2 independent trusted outlets.
export const PRIMARY_TYPES = new Set(["maker", "regulator", "rnd"]);
export function isPrimary(item) {
  return PRIMARY_TYPES.has(item?.type);
}

// Priority brands — never miss their news. A UAV story mentioning any of these
// is eligible on its own (even single-source) and is selected first.
export const PRIORITY_BRANDS = ["dji", "autel", "anduril", "parrot", "skydio"];
const PRIORITY_RE = new RegExp(`\\b(${PRIORITY_BRANDS.join("|")})\\b`, "i");
export function isPriority(item) {
  return PRIORITY_RE.test(`${item?.title || ""} ${item?.summary || ""}`);
}

export function crossCheck(cluster) {
  const names = new Set();
  let hasPrimary = false;
  let hasPriority = false;
  for (const it of cluster.items) {
    names.add(it.source);
    if (isPrimary(it)) hasPrimary = true;
    if (isPriority(it)) hasPriority = true;
  }
  const independent = names.size;
  return {
    eligible: independent >= 2 || hasPrimary || hasPriority,
    independent,
    hasPrimary,
    hasPriority,
  };
}

// ---- SCORE & SELECT -------------------------------------------------------
const TIER_WEIGHT = { 1: 3, 2: 2, 3: 1 };

export function score(item, now = Date.now()) {
  const tierWeight = TIER_WEIGHT[item.tier] || 1;
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

// Confidence = priority-brand bonus (dominant) + independent-source count +
// best source tier + primary bonus + recency. The priority bonus is large enough
// that any priority-brand story outranks every non-priority one.
const PRIORITY_BONUS = 1000;
export function scoreCluster(cluster, now = Date.now()) {
  const { independent, hasPrimary, hasPriority } = crossCheck(cluster);
  const maxTier = Math.max(...cluster.items.map((i) => TIER_WEIGHT[i.tier] || 1));
  const recency = Math.max(0, ...cluster.items.map((i) => score(i, now) - (TIER_WEIGHT[i.tier] || 1)));
  return (hasPriority ? PRIORITY_BONUS : 0) + independent + maxTier + (hasPrimary ? 2 : 0) + recency;
}

// Pick the single best eligible story. Returns the representative item (primary
// first, else highest tier) enriched with the de-duplicated corroboration list,
// or null when nothing clears PASS 2 (held-back stories wait for a 2nd source).
export function selectStory(clusters, now = Date.now()) {
  const eligible = clusters.filter((c) => crossCheck(c).eligible);
  if (!eligible.length) return null;

  const best = eligible
    .map((c) => ({ c, s: scoreCluster(c, now) }))
    .sort((a, b) => b.s - a.s)[0].c;

  const rep = [...best.items].sort((a, b) => {
    const prio = (isPriority(b) ? 1 : 0) - (isPriority(a) ? 1 : 0);
    if (prio) return prio;
    const prim = (isPrimary(b) ? 1 : 0) - (isPrimary(a) ? 1 : 0);
    if (prim) return prim;
    return (TIER_WEIGHT[b.tier] || 1) - (TIER_WEIGHT[a.tier] || 1);
  })[0];

  const seen = new Set();
  const corroboration = [];
  for (const it of best.items) {
    if (seen.has(it.source)) continue;
    seen.add(it.source);
    corroboration.push({ source: it.source, url: it.url, title: it.title, type: it.type, tier: it.tier });
  }
  const cc = crossCheck(best);
  return {
    pick: {
      ...rep,
      corroboration,
      independentSources: cc.independent,
      hasPrimary: cc.hasPrimary,
      hasPriority: cc.hasPriority,
    },
    cluster: best,
  };
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

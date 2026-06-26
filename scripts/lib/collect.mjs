// COLLECT — fetch and normalize items from the trusted RSS sources.
// Each feed is fetched independently with a timeout and its own try/catch, so a
// single dead or malformed feed can never fail the whole run.
import Parser from "rss-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCES = path.join(__dirname, "..", "sources.json");

const parser = new Parser({ timeout: 10000 });

export function loadSources(file = DEFAULT_SOURCES) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw).sources || [];
  } catch {
    return [];
  }
}

// Run `fn` over `items` with at most `limit` in flight at once.
export async function mapLimit(items, limit, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await fn(items[idx], idx);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

// Map one rss-parser item onto the engine's normalized shape.
export function normalizeItem(item, source) {
  return {
    title: (item.title || "").trim(),
    summary: (item.contentSnippet || item.summary || item.content || "").trim(),
    url: item.link || item.guid || "",
    source: source.name,
    category: source.category,
    type: source.type || "news",
    tier: source.tier,
    publishedAt: item.isoDate || item.pubDate || null,
  };
}

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.feed);
    return (feed.items || []).map((item) => normalizeItem(item, source));
  } catch (err) {
    console.warn(`[collect] feed failed: ${source.name} — ${err.message}`);
    return [];
  }
}

// Keep an item unless it carries a date older than the recency window. Items
// without a usable date are kept (and ranked last) rather than silently lost.
export function withinRecency(item, recencyDays, now = Date.now()) {
  if (!item.publishedAt) return true;
  const t = new Date(item.publishedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return t >= now - recencyDays * 24 * 60 * 60 * 1000;
}

export async function collect({
  recencyDays = 3,
  sourcesFile = DEFAULT_SOURCES,
  concurrency = 6,
  now = Date.now(),
} = {}) {
  const sources = loadSources(sourcesFile).filter((s) => s.feed);
  const perFeed = await mapLimit(sources, concurrency, fetchFeed);
  const items = perFeed.flat();
  const recent = items.filter((it) => withinRecency(it, recencyDays, now));
  return { sourcesCount: sources.length, total: items.length, recent };
}

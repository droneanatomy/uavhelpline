import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isRelevant,
  normalizeTitle,
  canonicalUrl,
  dedupe,
  score,
  rankAndPick,
  scanSafety,
  slugify,
  frontmatter,
  sourceCheck,
  dropCovered,
  clusterStories,
  crossCheck,
  isPrimary,
  selectStory,
} from "./filter.mjs";

test("isRelevant keeps UAV topics and rejects politics", () => {
  assert.equal(isRelevant("New BVLOS drone payload sensor"), true);
  assert.equal(isRelevant("Local election results and council vote"), false);
  // reject wins even when an allow word is present
  assert.equal(isRelevant("Drone policy debated at the airport"), false);
  assert.equal(isRelevant("A story about gardening"), false);
});

test("normalizeTitle strips case and punctuation", () => {
  assert.equal(normalizeTitle("DJI's Matrice 400: Launch!"), "dji s matrice 400 launch");
});

test("canonicalUrl drops query, hash and trailing slash", () => {
  assert.equal(
    canonicalUrl("https://x.com/post/?utm=1#top"),
    "https://x.com/post"
  );
  assert.equal(canonicalUrl("not a url"), "not a url");
});

test("dedupe removes same-title, same-url, and already-covered items", () => {
  const covered = new Set([canonicalUrl("https://a.com/old")]);
  const items = [
    { title: "Story One", url: "https://a.com/1" },
    { title: "story one!", url: "https://a.com/2" }, // dup title
    { title: "Story Two", url: "https://a.com/1" }, // dup url of first
    { title: "Old Story", url: "https://a.com/old?ref=x" }, // already covered
    { title: "Story Three", url: "https://a.com/3" },
  ];
  const out = dedupe(items, covered);
  assert.deepEqual(out.map((x) => x.title), ["Story One", "Story Three"]);
});

test("ranking favours tier then recency, and picks the top", () => {
  const now = Date.now();
  const hour = 36e5;
  const t1old = { tier: 1, publishedAt: new Date(now - 60 * hour).toISOString() };
  const t2new = { tier: 2, publishedAt: new Date(now - 1 * hour).toISOString() };
  assert.ok(score(t1old, now) > score(t2new, now)); // tier dominates
  const pick = rankAndPick([t2new, t1old], now);
  assert.equal(pick, t1old);
  assert.equal(rankAndPick([], now), null);
});

test("scanSafety flags weaponization language only", () => {
  assert.equal(scanSafety("how to build a warhead payload"), true);
  assert.equal(scanSafety("a routine inspection drone flight"), false);
});

test("sourceCheck keeps only trusted-registry sources", () => {
  const items = [{ source: "DroneDJ" }, { source: "Random Blog" }];
  const trusted = new Set(["DroneDJ", "sUAS News"]);
  const kept = sourceCheck(items, trusted);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].source, "DroneDJ");
  // No trusted set supplied → don't over-filter.
  assert.equal(sourceCheck(items, new Set()).length, 2);
});

test("dropCovered removes published + exact-dup URLs, keeps cross-outlet dupes", () => {
  const covered = new Set(["https://x/old"]);
  const items = [
    { url: "https://x/old", source: "A" },     // already published
    { url: "https://a/story", source: "A" },   // unique
    { url: "https://a/story", source: "A" },   // exact dup
    { url: "https://b/story", source: "B" },   // same story, other outlet — keep
  ];
  const out = dropCovered(items, covered);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((i) => i.source), ["A", "B"]);
});

test("clusterStories groups same-story headlines and splits unrelated ones", () => {
  const items = [
    { title: "Skydio launches new BVLOS autonomy drone", url: "https://a/1", source: "A" },
    { title: "Skydio unveils new BVLOS autonomy drone", url: "https://b/1", source: "B" },
    { title: "EASA updates European certification rules", url: "https://c/1", source: "C" },
  ];
  const clusters = clusterStories(items);
  assert.equal(clusters.length, 2);
  const big = clusters.find((c) => c.items.length === 2);
  assert.ok(big, "the two Skydio items cluster together");
});

test("crossCheck + isPrimary: 2 independent OR a primary source is eligible", () => {
  const twoIndependent = { items: [{ source: "A", type: "news" }, { source: "B", type: "news" }] };
  assert.equal(crossCheck(twoIndependent).eligible, true);

  const oneNews = { items: [{ source: "A", type: "news" }] };
  assert.equal(crossCheck(oneNews).eligible, false);

  const onePrimary = { items: [{ source: "DJI Newsroom", type: "maker" }] };
  assert.equal(crossCheck(onePrimary).eligible, true);
  assert.equal(isPrimary({ type: "regulator" }), true);
  assert.equal(isPrimary({ type: "news" }), false);
});

test("selectStory ranks eligible clusters and attaches corroboration", () => {
  const now = Date.UTC(2026, 0, 1);
  const recent = new Date(now - 3600 * 1000).toISOString();
  const clusters = [
    // eligible: 2 independent sources
    { items: [
      { title: "Story X", source: "A", type: "news", tier: 2, url: "https://a/x", publishedAt: recent },
      { title: "Story X", source: "B", type: "news", tier: 3, url: "https://b/x", publishedAt: recent },
    ] },
    // ineligible: single non-primary source
    { items: [{ title: "Story Y", source: "C", type: "news", tier: 1, url: "https://c/y", publishedAt: recent }] },
  ];
  const sel = selectStory(clusters, now);
  assert.ok(sel);
  assert.equal(sel.pick.title, "Story X");
  assert.equal(sel.pick.independentSources, 2);
  assert.equal(sel.pick.corroboration.length, 2);

  assert.equal(selectStory([{ items: [{ source: "C", type: "news", tier: 1 }] }], now), null);
});

test("slugify and frontmatter produce expected output", () => {
  assert.equal(slugify("DJI Matrice 400 — Launch!"), "dji-matrice-400-launch");
  const fm = frontmatter({ title: "Hi", tags: ["a", "b"], safetyReview: false });
  assert.match(fm, /^---/);
  assert.match(fm, /title: "Hi"/);
  assert.match(fm, /- "a"/);
  assert.match(fm, /safetyReview: false/);
});

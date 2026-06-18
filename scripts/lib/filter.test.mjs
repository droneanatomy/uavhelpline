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

test("slugify and frontmatter produce expected output", () => {
  assert.equal(slugify("DJI Matrice 400 — Launch!"), "dji-matrice-400-launch");
  const fm = frontmatter({ title: "Hi", tags: ["a", "b"], safetyReview: false });
  assert.match(fm, /^---/);
  assert.match(fm, /title: "Hi"/);
  assert.match(fm, /- "a"/);
  assert.match(fm, /safetyReview: false/);
});

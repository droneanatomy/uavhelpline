import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractJson,
  joinTextBlocks,
  normalizeDraft,
  draftPost,
  progressFromEvent,
} from "./draft.mjs";

const CANDIDATE = {
  title: "New endurance milestone for survey drone",
  summary: "A fixed-wing UAV demonstrates longer endurance.",
  url: "https://example.com/story",
  category: "components",
};

test("extractJson pulls the object out of surrounding text", () => {
  assert.deepEqual(extractJson('prose {"a":1} more'), { a: 1 });
  assert.equal(extractJson("no json here"), null);
  assert.equal(extractJson('{bad json}'), null);
});

test("joinTextBlocks keeps only text blocks", () => {
  const content = [
    { type: "server_tool_use", name: "web_search" },
    { type: "text", text: "hello" },
    { type: "web_search_tool_result" },
    { type: "text", text: "world" },
  ];
  assert.equal(joinTextBlocks(content), "hello\nworld");
});

test("normalizeDraft coerces fields and guarantees the original source", () => {
  const d = normalizeDraft(
    { tldr: "Two sentences. Really.", body: "Body text", tags: ["a"], sources: ["https://other.com"] },
    CANDIDATE
  );
  assert.equal(d.title, CANDIDATE.title); // falls back to candidate title
  assert.ok(d.sources.includes(CANDIDATE.url)); // original always cited
  assert.equal(d.draftPath, "anthropic");
});

test("normalizeDraft caps sources, keeps the original, dedupes", () => {
  const many = ["https://a.com/1", "https://a.com/1", "https://b.com", "https://c.com", "https://d.com", "https://e.com", "https://f.com"];
  const d = normalizeDraft({ body: "x", sources: many }, CANDIDATE);
  assert.ok(d.sources.length <= 5, `expected <=5, got ${d.sources.length}`);
  assert.ok(d.sources.includes(CANDIDATE.url)); // original feed source retained (unshifted first)
  assert.equal(new Set(d.sources).size, d.sources.length); // no dupes
});

test("normalizeDraft strips leaked <cite> markup but keeps the text", () => {
  const d = normalizeDraft(
    { tldr: 'See <cite index="2-1">the spec</cite>.', body: 'Body <cite index="3-4">claim</cite> here.' },
    CANDIDATE
  );
  assert.equal(d.tldr, "See the spec.");
  assert.equal(d.body, "Body claim here.");
});

test("normalizeDraft validates category, falling back to the candidate", () => {
  // valid model category is used
  assert.equal(normalizeDraft({ body: "x", category: "regulations" }, CANDIDATE).category, "regulations");
  // invalid model category falls back to the candidate's beat
  assert.equal(normalizeDraft({ body: "x", category: "bogus" }, CANDIDATE).category, "components");
  // manual topic (no candidate beat) + invalid → "news"
  assert.equal(normalizeDraft({ body: "x" }, { ...CANDIDATE, category: "" }).category, "news");
});

test("normalizeDraft carries imagePrompt, falling back to the title", () => {
  assert.equal(
    normalizeDraft({ body: "x", imagePrompt: "abstract swarm" }, CANDIDATE).imagePrompt,
    "abstract swarm"
  );
  assert.equal(normalizeDraft({ body: "x" }, CANDIDATE).imagePrompt, CANDIDATE.title);
});

test("progressFromEvent maps stream events to live stages", () => {
  assert.deepEqual(
    progressFromEvent({ type: "content_block_start", content_block: { type: "server_tool_use" } }),
    { stage: "search", detail: "Searching the web…" }
  );
  assert.equal(
    progressFromEvent({ type: "content_block_start", content_block: { type: "web_search_tool_result", content: [1, 2, 3] } }).detail,
    "Reviewing 3 sources…"
  );
  assert.equal(
    progressFromEvent({ type: "content_block_start", content_block: { type: "text" } }).stage,
    "write"
  );
  assert.equal(progressFromEvent({ type: "content_block_delta" }), null);
  assert.equal(progressFromEvent(null), null);
});

test("normalizeDraft raises safetyReview via keyword backstop", () => {
  const d = normalizeDraft(
    { body: "details on warhead assembly here", safetyReview: false },
    CANDIDATE
  );
  assert.equal(d.safetyReview, true);
});

test("draftPost without a key returns a labeled placeholder", async () => {
  const d = await draftPost(CANDIDATE, { apiKey: "" });
  assert.equal(d.draftPath, "placeholder");
  assert.match(d.body, /Technical Breakdown/);
  assert.deepEqual(d.sources, [CANDIDATE.url]);
});

test("draftPost with a key calls the API and parses the result", async () => {
  let sentBody;
  const fakeFetch = async (url, opts) => {
    sentBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({
        content: [
          { type: "text", text: '{"title":"T","tldr":"A. B.","body":"## Technical Breakdown\\nx","tags":["uav"],"metaDescription":"m","sources":["https://example.com/story"],"safetyReview":false}' },
        ],
      }),
    };
  };
  const d = await draftPost(CANDIDATE, { apiKey: "k", fetchImpl: fakeFetch });
  assert.equal(d.draftPath, "anthropic");
  assert.equal(d.title, "T");
  // the web_search server tool must be attached to the request
  assert.equal(sentBody.tools[0].name, "web_search");
});

test("draftPost throws a clear error on a non-OK API response", async () => {
  const fakeFetch = async () => ({ ok: false, status: 429, text: async () => "rate limited" });
  await assert.rejects(
    () => draftPost(CANDIDATE, { apiKey: "k", fetchImpl: fakeFetch }),
    /Anthropic API 429/
  );
});

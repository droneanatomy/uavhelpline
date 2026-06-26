import { test } from "node:test";
import assert from "node:assert/strict";
import { runPipeline } from "./pipeline.mjs";

const noCovered = async () => new Set();
// Empty registry → PASS 1 source-check passes everything (focus other tests on cross-check).
const openSources = () => [];

test("runPipeline skips when no items are collected", async () => {
  const res = await runPipeline({
    deps: {
      collect: async () => ({ sourcesCount: 5, total: 0, recent: [] }),
      loadSources: openSources,
      loadCoveredUrls: noCovered,
    },
  });
  assert.equal(res.picked, false);
  assert.match(res.reason, /cross-check/i);
});

test("runPipeline skips when all items are irrelevant", async () => {
  const recent = [{ title: "Local election results", summary: "politics", url: "https://x/1", source: "A", type: "news", tier: 1 }];
  const res = await runPipeline({
    deps: {
      collect: async () => ({ sourcesCount: 5, total: 1, recent }),
      loadSources: openSources,
      loadCoveredUrls: noCovered,
    },
  });
  assert.equal(res.picked, false);
});

test("PASS 2: a single non-primary source is held back", async () => {
  const recent = [
    { title: "New BVLOS drone payload sensor", summary: "uav", url: "https://a/2", source: "DroneDJ", type: "news", tier: 1 },
  ];
  const res = await runPipeline({
    dryRun: true,
    deps: {
      collect: async () => ({ sourcesCount: 5, total: 1, recent }),
      loadSources: openSources,
      loadCoveredUrls: noCovered,
    },
  });
  assert.equal(res.picked, false, "one non-primary source must not be eligible");
});

test("PASS 2: two independent trusted sources clear cross-check", async () => {
  const recent = [
    { title: "Skydio launches new BVLOS autonomy drone", summary: "uav autonomy", url: "https://a/1", source: "DroneDJ", type: "news", tier: 1 },
    { title: "Skydio unveils new BVLOS autonomy drone", summary: "uav autonomy", url: "https://b/1", source: "sUAS News", type: "news", tier: 1 },
  ];
  let draftCalled = false;
  const res = await runPipeline({
    dryRun: true,
    deps: {
      collect: async () => ({ sourcesCount: 5, total: 2, recent }),
      loadSources: openSources,
      loadCoveredUrls: noCovered,
      draftPostStream: async () => { draftCalled = true; return {}; },
    },
  });
  assert.equal(res.picked, true);
  assert.equal(res.dryRun, true);
  assert.equal(res.independentSources, 2);
  assert.equal(res.corroboration.length, 2);
  assert.equal(draftCalled, false, "dry run must not draft");
  assert.ok(res.slug);
});

test("PASS 2: a lone PRIMARY source is eligible on its own", async () => {
  const recent = [
    { title: "DJI announces new heavy-lift drone platform", summary: "uav payload", url: "https://dji/x", source: "DJI Newsroom", type: "maker", tier: 2 },
  ];
  const res = await runPipeline({
    dryRun: true,
    deps: {
      collect: async () => ({ sourcesCount: 5, total: 1, recent }),
      loadSources: openSources,
      loadCoveredUrls: noCovered,
    },
  });
  assert.equal(res.picked, true);
  assert.equal(res.hasPrimary, true);
});

test("runPipeline drafts and saves, passing corroboration to the draft", async () => {
  const recent = [
    { title: "Skydio autonomy update for defense customers", summary: "uav autonomy", url: "https://a/3", source: "DroneDJ", category: "ai-autonomy", type: "news", tier: 1 },
    { title: "Skydio autonomy update lands defense deal", summary: "uav autonomy", url: "https://b/3", source: "Breaking Defense", category: "ai-autonomy", type: "defence", tier: 2 },
  ];
  const stages = [];
  let seenCorroboration = null;
  const res = await runPipeline({
    onProgress: (p) => stages.push(p.stage),
    deps: {
      collect: async () => ({ sourcesCount: 5, total: 2, recent }),
      loadSources: openSources,
      loadCoveredUrls: noCovered,
      draftPostStream: async (pick) => {
        seenCorroboration = pick.corroboration;
        return { title: pick.title, body: "b", sources: pick.corroboration.map((c) => c.url), safetyReview: false, draftPath: "anthropic" };
      },
      finalizeAndSave: async () => ({ slug: "skydio-autonomy-update", saved: "posts/skydio (test)" }),
    },
  });
  assert.equal(res.picked, true);
  assert.equal(res.slug, "skydio-autonomy-update");
  assert.ok(Array.isArray(seenCorroboration) && seenCorroboration.length === 2, "draft receives corroboration");
  assert.ok(["collect", "filter", "cluster", "pick", "save"].every((s) => stages.includes(s)));
});

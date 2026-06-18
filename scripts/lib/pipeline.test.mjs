import { test } from "node:test";
import assert from "node:assert/strict";
import { runPipeline } from "./pipeline.mjs";

const noCovered = async () => new Set();

test("runPipeline skips when no items are collected", async () => {
  const res = await runPipeline({
    deps: { collect: async () => ({ sourcesCount: 5, total: 0, recent: [] }), loadCoveredUrls: noCovered },
  });
  assert.equal(res.picked, false);
  assert.match(res.reason, /No fresh/i);
});

test("runPipeline skips when all items are irrelevant", async () => {
  const recent = [{ title: "Local election results", summary: "politics", url: "https://x/1", tier: 1 }];
  const res = await runPipeline({
    deps: { collect: async () => ({ sourcesCount: 5, total: 1, recent }), loadCoveredUrls: noCovered },
  });
  assert.equal(res.picked, false);
});

test("runPipeline picks a relevant item and short-circuits on dryRun", async () => {
  const recent = [{ title: "New BVLOS drone payload sensor", summary: "uav", url: "https://x/2", tier: 1 }];
  let draftCalled = false;
  const res = await runPipeline({
    dryRun: true,
    deps: {
      collect: async () => ({ sourcesCount: 5, total: 1, recent }),
      loadCoveredUrls: noCovered,
      draftPostStream: async () => { draftCalled = true; return {}; },
    },
  });
  assert.equal(res.picked, true);
  assert.equal(res.dryRun, true);
  assert.equal(draftCalled, false, "dry run must not draft");
  assert.ok(res.slug);
});

test("runPipeline drafts and saves the pick (stubbed draft/finalize)", async () => {
  const recent = [{ title: "Skydio autonomy update", summary: "uav autonomy", url: "https://x/3", category: "ai-autonomy", tier: 1 }];
  const stages = [];
  const res = await runPipeline({
    onProgress: (p) => stages.push(p.stage),
    deps: {
      collect: async () => ({ sourcesCount: 5, total: 1, recent }),
      loadCoveredUrls: noCovered,
      draftPostStream: async (pick) => ({ title: pick.title, body: "b", sources: ["https://x/3"], safetyReview: false, draftPath: "anthropic" }),
      finalizeAndSave: async (draft) => ({ slug: "skydio-autonomy-update", saved: "posts/skydio (test)" }),
    },
  });
  assert.equal(res.picked, true);
  assert.equal(res.slug, "skydio-autonomy-update");
  assert.ok(stages.includes("collect") && stages.includes("pick") && stages.includes("save"));
});

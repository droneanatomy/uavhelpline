import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeItem, withinRecency, mapLimit } from "./collect.mjs";

const SOURCE = { name: "DroneDJ", category: "commercial-drones", tier: 1 };

test("normalizeItem maps rss fields onto the engine shape", () => {
  const it = normalizeItem(
    { title: "  Hi  ", contentSnippet: "summary", link: "https://x.com/a", isoDate: "2026-06-14T00:00:00Z" },
    SOURCE
  );
  assert.deepEqual(it, {
    title: "Hi",
    summary: "summary",
    url: "https://x.com/a",
    source: "DroneDJ",
    category: "commercial-drones",
    tier: 1,
    publishedAt: "2026-06-14T00:00:00Z",
  });
});

test("withinRecency drops only items with a date past the window", () => {
  const now = new Date("2026-06-15T00:00:00Z").getTime();
  assert.equal(withinRecency({ publishedAt: "2026-06-14T00:00:00Z" }, 3, now), true);
  assert.equal(withinRecency({ publishedAt: "2026-06-01T00:00:00Z" }, 3, now), false);
  // unknown / unparseable dates are kept (ranked last), never silently lost
  assert.equal(withinRecency({ publishedAt: null }, 3, now), true);
  assert.equal(withinRecency({ publishedAt: "garbage" }, 3, now), true);
});

test("mapLimit runs all items and respects the concurrency cap", async () => {
  let inFlight = 0;
  let peak = 0;
  const fn = async (n) => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return n * 2;
  };
  const out = await mapLimit([1, 2, 3, 4, 5], 2, fn);
  assert.deepEqual(out, [2, 4, 6, 8, 10]);
  assert.ok(peak <= 2);
});

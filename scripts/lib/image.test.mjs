import { test } from "node:test";
import assert from "node:assert/strict";
import { buildImagePrompt, generateImage, STYLE_SUFFIX } from "./image.mjs";

test("STYLE_SUFFIX carries the non-photoreal safety guardrails", () => {
  assert.match(STYLE_SUFFIX, /NOT photorealistic/i);
  assert.match(STYLE_SUFFIX, /no real .*logos/i);
  assert.match(STYLE_SUFFIX, /editorial/i);
});

test("buildImagePrompt uses the brief and appends the style suffix", () => {
  const p = buildImagePrompt({ imagePrompt: "A swarm of small drones over farmland" });
  assert.match(p, /swarm of small drones over farmland/);
  assert.ok(p.endsWith(STYLE_SUFFIX)); // no category → ends with the shared suffix
  // falls back to title when no imagePrompt
  assert.match(buildImagePrompt({ title: "BVLOS rules" }), /^BVLOS rules\. /);
});

test("buildImagePrompt layers the per-category style after the suffix", () => {
  const p = buildImagePrompt({ imagePrompt: "circuit board" }, "components");
  assert.match(p, /circuit board/);
  assert.match(p, /NOT photorealistic/i); // shared suffix still present
  assert.match(p, /exploded-diagram/i); // components beat modifier appended
  // unknown category → no beat modifier, still valid
  assert.ok(buildImagePrompt({ title: "x" }, "bogus").endsWith(STYLE_SUFFIX));
});

test("generateImage returns null with no key (off by default)", async () => {
  delete process.env.FAL_KEY;
  assert.equal(await generateImage({ prompt: "x", provider: "fal" }), null);
});

test("generateImage returns null for an unknown provider", async () => {
  assert.equal(await generateImage({ prompt: "x", provider: "nope" }), null);
});

test("generateImage returns image bytes via the fal backend (stubbed)", async () => {
  process.env.FAL_KEY = "test-key";
  let sentAuth;
  const fakeFetch = async (url, opts) => {
    if (url.startsWith("https://fal.run/")) {
      sentAuth = opts.headers.authorization;
      return { ok: true, json: async () => ({ images: [{ url: "https://cdn.fal/img.jpg" }] }) };
    }
    // image fetch
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      headers: { get: () => "image/jpeg" },
    };
  };
  const out = await generateImage({ prompt: "drone art", provider: "fal", fetchImpl: fakeFetch });
  assert.equal(sentAuth, "Key test-key");
  assert.equal(out.contentType, "image/jpeg");
  assert.ok(Buffer.isBuffer(out.buffer) && out.buffer.length === 3);
  delete process.env.FAL_KEY;
});

test("generateImage decodes the gemini inline image part (stubbed)", async () => {
  process.env.GEMINI_API_KEY = "g-key";
  const b64 = Buffer.from([9, 8, 7]).toString("base64");
  let sentKey;
  const fakeFetch = async (url, opts) => {
    sentKey = opts.headers["x-goog-api-key"];
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: b64 } }] } }],
      }),
    };
  };
  const out = await generateImage({ prompt: "art", provider: "gemini", fetchImpl: fakeFetch });
  assert.equal(sentKey, "g-key");
  assert.equal(out.contentType, "image/png");
  assert.deepEqual([...out.buffer], [9, 8, 7]);
  delete process.env.GEMINI_API_KEY;
});

test("pollinations needs no key and returns image bytes (stubbed)", async () => {
  let calledUrl;
  const fakeFetch = async (url) => {
    calledUrl = url;
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array(200).fill(1).buffer,
      headers: { get: () => "image/jpeg" },
    };
  };
  // no env key set — pollinations must still run (default provider)
  const out = await generateImage({ prompt: "drone art", provider: "pollinations", fetchImpl: fakeFetch });
  assert.match(calledUrl, /^https:\/\/image\.pollinations\.ai\/prompt\/drone%20art/);
  assert.match(calledUrl, /width=1200&height=675/);
  assert.equal(out.contentType, "image/jpeg");
  assert.ok(out.buffer.length === 200);
});

test("pollinations rejects a non-image response (→ null fallback)", async () => {
  const fakeFetch = async () => ({ ok: true, headers: { get: () => "text/html" }, text: async () => "<html>" });
  assert.equal(await generateImage({ prompt: "x", provider: "pollinations", fetchImpl: fakeFetch }), null);
});

test("generateImage decodes the cloudflare base64 image (stubbed)", async () => {
  process.env.CLOUDFLARE_API_TOKEN = "cf-token";
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct123";
  const b64 = Buffer.from([4, 5, 6]).toString("base64");
  let calledUrl, sentAuth;
  const fakeFetch = async (url, opts) => {
    calledUrl = url;
    sentAuth = opts.headers.authorization;
    return { ok: true, json: async () => ({ result: { image: b64 }, success: true }) };
  };
  const out = await generateImage({ prompt: "art", provider: "cloudflare", fetchImpl: fakeFetch });
  assert.match(calledUrl, /accounts\/acct123\/ai\/run\/@cf\/black-forest-labs\/flux-1-schnell/);
  assert.equal(sentAuth, "Bearer cf-token");
  assert.deepEqual([...out.buffer], [4, 5, 6]);
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
});

test("generateImage returns null when the API errors", async () => {
  process.env.FAL_KEY = "test-key";
  const fakeFetch = async () => ({ ok: false, status: 500, text: async () => "boom" });
  assert.equal(await generateImage({ prompt: "x", provider: "fal", fetchImpl: fakeFetch }), null);
  delete process.env.FAL_KEY;
});

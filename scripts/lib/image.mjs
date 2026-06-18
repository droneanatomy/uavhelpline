// Pluggable editorial-illustration generation. OFF by default: returns null when
// no provider key is set, the provider is unknown, or the API errors — so the
// caller falls back to the branded SVG. Same plain-fetch, no-dependency style as
// draft.mjs.

// House style + safety guardrails appended to EVERY prompt. This is the single
// enforcement point that keeps output non-photoreal and free of real
// faces/logos/text — essential for a credibility-first news platform.
export const STYLE_SUFFIX =
  "Style: editorial magazine illustration — clean modern flat-vector look with " +
  "subtle texture, a restrained cohesive palette, conceptual and abstract, with a " +
  "technical/diagrammatic feel suited to a UAV and drone intelligence publication. " +
  "Strictly NOT photorealistic and not a photograph. No real people's faces, no " +
  "real company logos or trademarks, no legible text or watermarks, and no " +
  "realistic depiction of specific real events or violence. Premium and trustworthy.";

const DEFAULT_PROVIDER = "pollinations"; // free, no key — works out of the box
const FAL_MODEL = process.env.UAVHELPLINE_FAL_MODEL || "fal-ai/flux/schnell";
const POLLINATIONS_MODEL = process.env.UAVHELPLINE_POLLINATIONS_MODEL || "flux";
const CF_MODEL = process.env.UAVHELPLINE_CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
// Image generation on the Gemini API requires a billing-enabled project (the
// free-tier daily image allowance is typically 0). Override the model via
// UAVHELPLINE_GEMINI_IMAGE_MODEL.
const GEMINI_MODEL = process.env.UAVHELPLINE_GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

// Per-beat composition/palette modifiers, layered on top of STYLE_SUFFIX so each
// section looks distinct while staying non-photoreal editorial illustration.
export const CATEGORY_STYLE = {
  news: "Composition: clean and reportorial with a sense of timeliness; cool cobalt-blue palette.",
  analysis: "Composition: abstract and conceptual with data-visualization motifs — trend lines, nodes, charts; magenta accent.",
  "defence-tech": "Composition: restrained, technical, schematic/blueprint feel; deep midnight-blue palette. Convey engineering and capability — never violence, gore, or casualties.",
  "commercial-drones": "Composition: bright, polished product-design aesthetic — a clean studio-style illustration of a GENERIC, representative drone (never a specific real product or brand).",
  components: "Composition: macro / exploded-diagram view of electronics — circuit traces, sensors, connectors; warm orange accent.",
  "ai-autonomy": "Composition: networked and neural motifs — glowing data links, perception fields, swarm geometry; cobalt-blue palette.",
  regulations: "Composition: institutional and abstract — airspace grids, flight corridors, boundary lines; orange accent.",
};

export function buildImagePrompt(draft, category) {
  const base = String(draft?.imagePrompt || draft?.title || "Abstract UAV technology concept").trim();
  const beat = CATEGORY_STYLE[category] || "";
  return `${base}. ${STYLE_SUFFIX}${beat ? " " + beat : ""}`;
}

// fal.ai synchronous HTTP call → returns { buffer, contentType }.
async function generateFal({ prompt, apiKey, fetchImpl }) {
  const res = await fetchImpl(`https://fal.run/${FAL_MODEL}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Key ${apiKey}` },
    body: JSON.stringify({ prompt, image_size: "landscape_16_9", num_images: 1 }),
  });
  if (!res.ok) {
    const detail = await res.text?.().catch(() => "");
    throw new Error(`fal.ai ${res.status}: ${String(detail || "").slice(0, 200)}`);
  }
  const data = await res.json();
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error("fal.ai returned no image url");
  const imgRes = await fetchImpl(url);
  if (!imgRes.ok) throw new Error(`image fetch ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const contentType = imgRes.headers?.get?.("content-type") || "image/jpeg";
  return { buffer, contentType };
}

// Google Gemini API — gemini-2.5-flash-image via generateContent. The image
// comes back as an inline base64 part. → { buffer, contentType }.
async function generateGemini({ prompt, apiKey, fetchImpl }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt} Widescreen 16:9 banner composition.` }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (!res.ok) {
    const detail = await res.text?.().catch(() => "");
    throw new Error(`gemini ${res.status}: ${String(detail || "").slice(0, 200)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p?.inlineData?.data);
  if (!img) throw new Error("gemini returned no image part");
  return {
    buffer: Buffer.from(img.inlineData.data, "base64"),
    contentType: img.inlineData.mimeType || "image/png",
  };
}

// Pollinations.ai — free. Anonymous works from residential IPs; server/datacenter
// IPs are rate-gated (402), so set POLLINATIONS_TOKEN (free, from auth.pollinations.ai)
// to lift the per-IP queue limit. GET the image bytes directly.
async function generatePollinations({ prompt, fetchImpl }) {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1200&height=675&model=${POLLINATIONS_MODEL}&nologo=true`;
  const headers = {};
  if (process.env.POLLINATIONS_TOKEN) {
    headers.authorization = `Bearer ${process.env.POLLINATIONS_TOKEN}`;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal, headers });
    if (!res.ok) {
      const detail = await res.text?.().catch(() => "");
      throw new Error(`pollinations ${res.status}: ${String(detail || "").slice(0, 120)}`);
    }
    const contentType = res.headers?.get?.("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`pollinations returned ${contentType || "non-image"}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) throw new Error("pollinations returned an empty image");
    return { buffer, contentType };
  } finally {
    clearTimeout(timer);
  }
}

// Cloudflare Workers AI — FLUX.1-schnell. Reliable from datacenter IPs (works on
// Vercel). Returns the image as base64 in result.image. → { buffer, contentType }.
async function generateCloudflare({ prompt, apiKey, fetchImpl }) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!account) throw new Error("CLOUDFLARE_ACCOUNT_ID not set");
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CF_MODEL}`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ prompt, steps: 8 }),
  });
  if (!res.ok) {
    const detail = await res.text?.().catch(() => "");
    throw new Error(`cloudflare ${res.status}: ${String(detail || "").slice(0, 200)}`);
  }
  const data = await res.json();
  const b64 = data?.result?.image;
  if (!b64) {
    throw new Error(`cloudflare returned no image: ${JSON.stringify(data?.errors || data).slice(0, 150)}`);
  }
  return { buffer: Buffer.from(b64, "base64"), contentType: "image/jpeg" };
}

const PROVIDERS = {
  // key() returns a sentinel for keyless providers so generateImage doesn't short-circuit.
  pollinations: { key: () => "public", run: generatePollinations },
  cloudflare: { key: () => process.env.CLOUDFLARE_API_TOKEN, run: generateCloudflare },
  fal: { key: () => process.env.FAL_KEY, run: generateFal },
  gemini: { key: () => process.env.GEMINI_API_KEY, run: generateGemini },
};

// Returns { buffer, contentType } or null (→ caller falls back to the branded SVG).
export async function generateImage({
  prompt,
  provider = process.env.UAVHELPLINE_IMAGE_PROVIDER || DEFAULT_PROVIDER,
  fetchImpl = fetch,
} = {}) {
  const p = PROVIDERS[provider];
  if (!p) {
    console.warn(`[image] unknown provider "${provider}"; falling back to SVG.`);
    return null;
  }
  const apiKey = p.key();
  if (!apiKey) return null; // off by default
  try {
    return await p.run({ prompt, apiKey, fetchImpl });
  } catch (err) {
    console.warn(`[image] generation failed (${provider}); falling back to SVG. ${err.message}`);
    return null;
  }
}

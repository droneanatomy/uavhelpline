// RESEARCH + DRAFT — pluggable.
//   • ANTHROPIC_API_KEY set  → Claude researches the picked story on the web,
//     confirms facts, and writes a sourced draft in the UAVHelpline structure.
//   • no key                 → a clearly-labeled placeholder draft, so the
//     whole pipeline still runs and is testable offline.
import { scanSafety } from "./filter.mjs";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

// The brief's beats. Kept as a literal here so this module has no app imports.
export const BEATS = [
  "news", "analysis", "defence-tech", "commercial-drones",
  "components", "ai-autonomy", "regulations",
];

const SYSTEM_PROMPT = `You are the research-and-drafting engine for UAVHelpline, a credible UAV/drone
news and intelligence platform in the analytical style of The Ken.

EDITORIAL SCOPE (hard guardrail): write ONLY about the technology, engineering,
products, components, certifications, and industry developments. Do NOT take
political or geopolitical positions, and do NOT frame stories around trade bans,
sanctions, elections, or politicians. If a source is political, extract only the
technical facts and ignore the politics. Neutral, analytical, evidence-first.

YOUR JOB, in order:
1. RESEARCH: use the web_search tool to expand and corroborate the supplied story.
   Find primary sources (manufacturer, regulator, research lab) and technical detail.
2. CONFIRM — FACTS ONLY: every claim in your draft must trace to a source you found.
   Cross-check the supplied item against independent sources. If a fact cannot be
   corroborated, omit it. Never speculate, never offer opinion or geopolitical
   commentary, and never editorialize on trade bans, sanctions, elections, or
   politicians — report only the technical and industry facts. Neutral, analytical,
   technical tone. Paraphrase — never copy source text. If a central claim cannot
   be confirmed, keep it but mark it inline as "_[Unconfirmed: ...]_" so a human
   editor can check it.
3. SAFETY FIREWALL: never include weapon construction, weaponization, attack
   procedures, or countermeasure-bypass detail. When source material actually
   contains such detail, summarize it at a high level, write "[Redacted for
   safety]" in its place, and set "safetyReview" to true. Apply this ONLY when
   real dangerous detail was present — do NOT add safety disclaimers, "not
   applicable" notes, or [Redacted for safety] markers to benign civil or
   commercial topics, and leave "safetyReview" false when you redacted nothing.
4. DRAFT in this exact structure (Markdown body): a Main Story narrative, then a
   "## Technical Breakdown" section (Platform/UAV class, weight, payload, sensors,
   propulsion, endurance, range, autonomy level — whichever apply), then a
   "## Industry Impact" section (implications for manufacturers, operators,
   regulators, investors, integrators).

Write the body as clean Markdown only — no HTML and no inline <cite> citation
markup. In "sources", list ONLY the 3-5 most authoritative sources you actually
relied on for facts — primary first (manufacturer, regulator, research lab,
standards body, or the original reporting). EXCLUDE marketplaces, retailers,
price/spec aggregators, and SEO content-farm pages even if you opened them.
Quality over quantity: a few primary sources build more trust than a long list.

OUTPUT: respond with ONLY a single JSON object as your final message, no prose around it:
{
  "title": "headline",
  "tldr": "exactly two concise sentences",
  "body": "Markdown body (Main Story + ## Technical Breakdown + ## Industry Impact)",
  "category": "one of: news, analysis, defence-tech, commercial-drones, components, ai-autonomy, regulations",
  "imagePrompt": "1-2 sentence brief for an ABSTRACT editorial illustration of this story (conceptual, non-photoreal; no real faces, logos, or text)",
  "tags": ["3-6 lowercase tags"],
  "metaDescription": "<=150 char SEO description",
  "sources": ["3-5 most authoritative URLs actually relied on, primary first; no marketplaces/aggregators"],
  "safetyReview": false
}`;

export function buildUserPrompt(candidate) {
  const beatLine = candidate.category
    ? `Beat: ${candidate.category} (keep this beat).`
    : `Beat: choose the single most appropriate from: ${BEATS.join(", ")}.`;
  const corro = Array.isArray(candidate.corroboration)
    ? candidate.corroboration.filter((c) => c && c.url)
    : [];
  const corroBlock = corro.length
    ? [
        "",
        "This story was cross-checked and corroborated by these trusted sources.",
        "Confirm the facts against them and CITE EVERY ONE in your sources list:",
        ...corro.map((c) => `- ${c.source}${c.type ? ` (${c.type})` : ""}: ${c.url}`),
      ]
    : [];
  return [
    "Draft a UAVHelpline post on this topic. Research it on the web first, confirm the facts, then write.",
    "",
    `Topic / title: ${candidate.title}`,
    candidate.summary ? `Source summary: ${candidate.summary}` : "",
    candidate.url ? `Original URL: ${candidate.url}` : "",
    beatLine,
    ...corroBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

// Pull the final JSON object out of the model's text output. Tolerates a
// ```json ... ``` code fence and any prose around the object.
export function extractJson(text) {
  if (!text) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Concatenate the text blocks from an Anthropic Messages response. (web_search
// is a server-side tool, so search/result blocks are interleaved; we want text.)
export function joinTextBlocks(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Defensive cleanup: strip any <cite ...> markup the web-search model may leak
// into prose, keeping the inner text. Citations live in the sources array.
export function stripCiteTags(s) {
  return String(s || "").replace(/<\/?cite[^>]*>/gi, "");
}

// Coerce/validate the model output into the post shape the engine expects.
export function normalizeDraft(parsed, candidate) {
  const body = stripCiteTags(parsed?.body).trim();
  const modelSources = Array.isArray(parsed?.sources) ? parsed.sources.filter(Boolean) : [];
  // Corroborating sources from cross-check are trusted and must all be cited;
  // seed them (plus the original URL) ahead of whatever the model returned.
  const corroUrls = Array.isArray(candidate.corroboration)
    ? candidate.corroboration.map((c) => c && c.url).filter(Boolean)
    : [];
  const seeded = [...new Set([candidate.url, ...corroUrls].filter(Boolean))];
  let sources = [...new Set([...seeded, ...modelSources])];
  // Curation backstop: cap the list, but never drop a corroborating source.
  const envMax = Math.max(1, Number(process.env.UAVHELPLINE_MAX_SOURCES || 5));
  sources = sources.slice(0, Math.max(envMax, seeded.length));
  const tags = Array.isArray(parsed?.tags) && parsed.tags.length
    ? parsed.tags.slice(0, 6)
    : ["auto-draft", candidate.category].filter(Boolean);
  const category = BEATS.includes(parsed?.category)
    ? parsed.category
    : candidate.category || "news";
  return {
    title: stripCiteTags(parsed?.title || candidate.title).trim(),
    tldr: stripCiteTags(parsed?.tldr || candidate.summary).trim(),
    body,
    category,
    imagePrompt: stripCiteTags(parsed?.imagePrompt || parsed?.title || candidate.title).trim(),
    tags,
    metaDescription: String(parsed?.metaDescription || candidate.summary).slice(0, 150),
    sources,
    // Trust the model's flag, but OR in the keyword backstop over the final text.
    safetyReview: Boolean(parsed?.safetyReview) || scanSafety(`${parsed?.tldr || ""} ${body}`),
    draftPath: "anthropic",
  };
}

function placeholderDraft(candidate) {
  const tldr = `${candidate.summary} This is an auto-generated placeholder draft awaiting editorial review.`;
  const body = `Auto-drafted from monitored sources for editorial review. Set ANTHROPIC_API_KEY to have Claude research and write this section in the UAVHelpline voice.

## Technical Breakdown

- Platform / UAV class: _to be completed from sources_
- Payload / sensors: _to be completed_
- Propulsion / endurance / range: _to be completed_
- Autonomy level: _to be completed_

## Industry Impact

Implications for manufacturers, operators, regulators, investors, and integrators go here.`;
  return {
    title: candidate.title,
    tldr,
    body,
    category: candidate.category || "news",
    imagePrompt: candidate.title,
    tags: ["auto-draft", candidate.category].filter(Boolean),
    metaDescription: candidate.summary.slice(0, 150),
    sources: candidate.url ? [candidate.url] : [],
    safetyReview: scanSafety(`${candidate.title} ${candidate.summary}`),
    draftPath: "placeholder",
  };
}

export async function draftPost(
  candidate,
  {
    apiKey = process.env.ANTHROPIC_API_KEY,
    model = process.env.UAVHELPLINE_DRAFT_MODEL || DEFAULT_MODEL,
    fetchImpl = fetch,
    maxSearches = 5,
  } = {}
) {
  if (!apiKey) return placeholderDraft(candidate);

  const res = await fetchImpl(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
      messages: [{ role: "user", content: buildUserPrompt(candidate) }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const rawText = joinTextBlocks(data.content);
  const parsed = extractJson(rawText);
  if (!parsed || !parsed.body) {
    throw new Error(
      `Draft model returned no parseable JSON body (stop_reason=${data.stop_reason}). ` +
        `Raw starts: ${rawText.slice(0, 200)}`
    );
  }
  return normalizeDraft(parsed, candidate);
}

// Map one streamed Anthropic event onto a live progress step (or null to ignore).
export function progressFromEvent(evt) {
  if (!evt || evt.type !== "content_block_start") return null;
  const t = evt.content_block?.type;
  if (t === "server_tool_use") return { stage: "search", detail: "Searching the web…" };
  if (t === "web_search_tool_result") {
    const n = Array.isArray(evt.content_block?.content) ? evt.content_block.content.length : 0;
    return { stage: "search", detail: n ? `Reviewing ${n} sources…` : "Reviewing sources…" };
  }
  if (t === "text") return { stage: "write", detail: "Writing the draft…" };
  return null;
}

// Yield parsed Anthropic SSE events from a streaming response body.
async function* iterateSSE(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = chunk
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!data || data === "[DONE]") continue;
      try {
        yield JSON.parse(data);
      } catch {
        /* ignore keep-alives / partial frames */
      }
    }
  }
}

// Streaming variant: same research+draft, but reports live progress via
// onProgress({stage, detail}) as the web search and writing actually happen.
export async function draftPostStream(
  candidate,
  {
    onProgress = () => {},
    apiKey = process.env.ANTHROPIC_API_KEY,
    model = process.env.UAVHELPLINE_DRAFT_MODEL || DEFAULT_MODEL,
    fetchImpl = fetch,
    maxSearches = 5,
  } = {}
) {
  if (!apiKey) {
    onProgress({ stage: "write", detail: "Writing placeholder (no API key)…" });
    return placeholderDraft(candidate);
  }

  const res = await fetchImpl(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      stream: true,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
      messages: [{ role: "user", content: buildUserPrompt(candidate) }],
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text?.().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${String(detail || "").slice(0, 300)}`);
  }

  let text = "";
  let stopReason = null;
  const blockType = {}; // content-block index → type

  for await (const evt of iterateSSE(res.body)) {
    if (evt.type === "content_block_start") {
      blockType[evt.index] = evt.content_block?.type;
      const p = progressFromEvent(evt);
      if (p) onProgress(p);
    } else if (evt.type === "content_block_delta") {
      if (evt.delta?.type === "text_delta" && blockType[evt.index] === "text") {
        text += evt.delta.text;
      }
    } else if (evt.type === "message_delta") {
      stopReason = evt.delta?.stop_reason ?? stopReason;
    }
  }

  const parsed = extractJson(text);
  if (!parsed || !parsed.body) {
    throw new Error(
      `Draft model returned no parseable JSON body (stop_reason=${stopReason}). ` +
        `Raw starts: ${text.slice(0, 200)}`
    );
  }
  return normalizeDraft(parsed, candidate);
}

// The daily auto-pick pipeline, shared by the morning CLI and the /api/run-pipeline
// route: collect -> filter -> dedup -> rank -> pick -> research+draft -> image -> save.
// onProgress({stage, detail}) reports each phase; deps allow injection for tests.
import { collect } from "./collect.mjs";
import { isRelevant, dedupe, rankAndPick, slugify } from "./filter.mjs";
import { draftPostStream } from "./draft.mjs";
import { finalizeAndSave, loadCoveredUrls } from "./save.mjs";

export async function runPipeline({
  onProgress = () => {},
  recencyDays = Number(process.env.UAVHELPLINE_RECENCY_DAYS || 3),
  today = new Date().toISOString().slice(0, 10),
  dryRun = false,
  deps = {},
} = {}) {
  const collectFn = deps.collect || collect;
  const coveredFn = deps.loadCoveredUrls || loadCoveredUrls;
  const draftFn = deps.draftPostStream || draftPostStream;
  const finalizeFn = deps.finalizeAndSave || finalizeAndSave;

  // 1. COLLECT
  onProgress({ stage: "collect", detail: "Scanning trusted feeds…" });
  const { sourcesCount, total, recent } = await collectFn({ recencyDays });
  onProgress({ stage: "collect", detail: `${recent.length} recent items from ${sourcesCount} feeds.` });

  // 2. FILTER -> DEDUP -> RANK -> PICK
  const kept = recent.filter((c) => isRelevant(`${c.title} ${c.summary}`));
  const covered = await coveredFn();
  const fresh = dedupe(kept, covered);
  const pick = rankAndPick(fresh);
  if (!pick) {
    return { picked: false, reason: "No fresh, relevant story to draft today." };
  }
  onProgress({ stage: "pick", detail: `Picked: ${pick.title}` });

  if (dryRun) {
    return { picked: true, dryRun: true, slug: slugify(pick.title), pick };
  }

  // 3. RESEARCH + DRAFT, then 4. IMAGE + SAVE
  const draft = await draftFn(pick, { onProgress });
  onProgress({ stage: "save", detail: "Saving draft…" });
  const { slug, saved } = await finalizeFn(draft, pick, today);

  return {
    picked: true,
    slug,
    saved,
    title: draft.title,
    draftPath: draft.draftPath,
    sources: draft.sources,
    safetyReview: draft.safetyReview,
  };
}

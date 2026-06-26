// The daily auto-pick pipeline, shared by the morning CLI and the /api/run-pipeline
// route. Verification flow:
//   COLLECT → TOPIC FILTER → PASS 1 source check → drop covered → CLUSTER →
//   PASS 2 cross-check + SCORE & SELECT → DRAFT ONE (cite every corroborator) → SAVE.
// onProgress({stage, detail}) reports each phase; deps allow injection for tests.
import { collect, loadSources } from "./collect.mjs";
import {
  isRelevant,
  sourceCheck,
  dropCovered,
  clusterStories,
  selectStory,
  slugify,
} from "./filter.mjs";
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
  const loadSourcesFn = deps.loadSources || loadSources;
  const coveredFn = deps.loadCoveredUrls || loadCoveredUrls;
  const draftFn = deps.draftPostStream || draftPostStream;
  const finalizeFn = deps.finalizeAndSave || finalizeAndSave;

  // 1. COLLECT — items tagged with source/category/type/tier.
  onProgress({ stage: "collect", detail: "Scanning trusted feeds…" });
  const { sourcesCount, recent } = await collectFn({ recencyDays });
  onProgress({ stage: "collect", detail: `${recent.length} recent items from ${sourcesCount} feeds.` });

  // 2. TOPIC FILTER — UAV-relevant only (drops politics/airline/etc).
  const onTopic = recent.filter((c) => isRelevant(`${c.title} ${c.summary}`));
  onProgress({ stage: "filter", detail: `${onTopic.length} UAV-relevant items.` });

  // 3. PASS 1 · SOURCE CHECK — keep only trusted-registry sources.
  const trusted = new Set((loadSourcesFn() || []).map((s) => s.name));
  const checked = sourceCheck(onTopic, trusted);

  // Drop already-published + exact-dup URLs (keep cross-outlet story dupes).
  const covered = await coveredFn();
  const fresh = dropCovered(checked, covered);

  // 4. CLUSTER — group items describing the same story.
  const clusters = clusterStories(fresh);
  onProgress({ stage: "cluster", detail: `${clusters.length} distinct stories.` });

  // 5. PASS 2 · CROSS-CHECK + 6. SCORE & SELECT — single best eligible story.
  const selection = selectStory(clusters);
  if (!selection) {
    return {
      picked: false,
      reason:
        "No story cleared cross-check today — nothing corroborated by ≥2 independent trusted sources or a primary source.",
    };
  }
  const { pick } = selection;
  const basis = pick.hasPrimary
    ? "primary source"
    : `${pick.independentSources} independent sources`;
  onProgress({ stage: "pick", detail: `Selected (${basis}): ${pick.title}` });

  if (dryRun) {
    return {
      picked: true,
      dryRun: true,
      slug: slugify(pick.title),
      pick,
      corroboration: pick.corroboration,
      independentSources: pick.independentSources,
      hasPrimary: pick.hasPrimary,
    };
  }

  // 7. DRAFT ONE (cites every corroborating source), then 8. IMAGE + SAVE.
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
    corroboration: pick.corroboration,
    independentSources: pick.independentSources,
    hasPrimary: pick.hasPrimary,
    safetyReview: draft.safetyReview,
  };
}

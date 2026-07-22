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
  crossCheck,
  selectStories,
  slugify,
} from "./filter.mjs";
import { draftPostStream } from "./draft.mjs";
import { finalizeAndSave, loadCoveredUrls } from "./save.mjs";

export async function runPipeline({
  onProgress = () => {},
  recencyDays = Number(process.env.UAVHELPLINE_RECENCY_DAYS || 3),
  today = new Date().toISOString().slice(0, 10),
  dryRun = false,
  // Publish several stories in a day when several are genuinely important.
  maxPosts = Number(process.env.UAVHELPLINE_MAX_POSTS_PER_RUN || 3),
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

  // Diagnostics — surfaced on every return so cron/CLI runs are debuggable
  // (e.g. how many feeds resolved, how many cleared each stage).
  const stats = {
    feeds: sourcesCount,
    recent: recent.length,
    onTopic: onTopic.length,
    trusted: checked.length,
    fresh: fresh.length,
    clusters: clusters.length,
    eligible: clusters.filter((c) => crossCheck(c).eligible).length,
  };

  // 5. PASS 2 · CROSS-CHECK + 6. SCORE & SELECT — up to `maxPosts` stories.
  const selections = selectStories(clusters, { max: Math.max(1, maxPosts) });
  if (!selections.length) {
    return {
      picked: false,
      stats,
      reason:
        "No story cleared cross-check today — nothing corroborated by ≥2 independent trusted sources, a primary source, or a newsworthy priority-brand announcement.",
    };
  }

  const basisOf = (p) =>
    p.hasPriority && p.significant
      ? "priority brand"
      : p.hasPrimary
        ? "primary source"
        : `${p.independentSources} independent sources`;

  if (dryRun) {
    selections.forEach(({ pick }) =>
      onProgress({ stage: "pick", detail: `Selected (${basisOf(pick)}): ${pick.title}` })
    );
    const first = selections[0].pick;
    return {
      picked: true,
      dryRun: true,
      stats,
      count: selections.length,
      posts: selections.map(({ pick }) => ({ slug: slugify(pick.title), title: pick.title, pick })),
      slug: slugify(first.title),
      pick: first,
      corroboration: first.corroboration,
      independentSources: first.independentSources,
      hasPrimary: first.hasPrimary,
      hasPriority: first.hasPriority,
    };
  }

  // 7. DRAFT EACH (citing every corroborating source), then 8. IMAGE + SAVE.
  const posts = [];
  for (const { pick } of selections) {
    onProgress({ stage: "pick", detail: `Selected (${basisOf(pick)}): ${pick.title}` });
    const draft = await draftFn(pick, { onProgress });
    onProgress({ stage: "save", detail: "Saving draft…" });
    const { slug, saved } = await finalizeFn(draft, pick, today);
    posts.push({
      slug,
      saved,
      title: draft.title,
      draftPath: draft.draftPath,
      sources: draft.sources,
      corroboration: pick.corroboration,
      independentSources: pick.independentSources,
      hasPrimary: pick.hasPrimary,
      safetyReview: draft.safetyReview,
    });
  }

  // Top-level fields mirror the first post so existing callers keep working.
  return { picked: true, stats, count: posts.length, posts, ...posts[0] };
}

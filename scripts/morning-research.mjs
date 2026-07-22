#!/usr/bin/env node
/**
 * UAVHelpline — Morning Research Worker
 * ------------------------------------
 * Daily loop: collect -> filter -> dedup -> rank -> pick ONE -> research+draft
 * -> image -> save as DRAFT. Nothing is published; the draft lands in /admin
 * for human review. The pipeline itself lives in scripts/lib/pipeline.mjs and
 * is shared with the /api/run-pipeline route (the "Run today's pipeline" button).
 *
 * RUN:  npm run morning            (writes a draft)
 *       npm run morning:dry        (collect/filter/pick only, writes nothing)
 *
 * Backends and image generation are automatic, driven by env vars.
 */
import { runPipeline } from "./lib/pipeline.mjs";
import { USE_SUPABASE } from "./lib/save.mjs";

async function main() {
  const dryRun = process.argv.slice(2).includes("--dry-run");
  const today = new Date().toISOString().slice(0, 10);
  const log = (p) => console.log(`[${p.stage}] ${p.detail}`);

  const result = await runPipeline({ onProgress: log, dryRun });

  if (!result.picked) {
    console.log(`[${today}] ${result.reason}`);
    return;
  }
  if (result.dryRun) {
    console.log(`[dry-run] would draft ${result.count} post(s):`);
    result.posts.forEach((p, i) => console.log(`  ${i + 1}. ${p.slug}`));
    console.log(`[dry-run] No files written.`);
    return;
  }
  console.log(`[${today}] Drafted ${result.count} post(s):`);
  for (const p of result.posts) {
    console.log(`  - ${p.saved} (path: ${p.draftPath}, ${p.sources.length} sources, safetyReview=${p.safetyReview})`);
  }
  console.log(`[${today}] Backend: ${USE_SUPABASE ? "Supabase" : "local files"}. Review at /admin.`);
}

main().catch((err) => {
  console.error("Morning worker failed:", err);
  process.exit(1);
});

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
    console.log(`[dry-run] would draft slug "${result.slug}". No files written.`);
    return;
  }
  console.log(`[${today}] Drafted: ${result.saved} (path: ${result.draftPath}, ${result.sources.length} sources, safetyReview=${result.safetyReview}).`);
  console.log(`[${today}] Backend: ${USE_SUPABASE ? "Supabase" : "local files"}. Review at /admin.`);
}

main().catch((err) => {
  console.error("Morning worker failed:", err);
  process.exit(1);
});

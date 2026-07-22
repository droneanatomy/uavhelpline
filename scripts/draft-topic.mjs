// Manual drafting: turn one or more headlines into UAVHelpline drafts.
//
// The morning run only drafts what its feeds surfaced. This is the escape hatch
// for a story you want covered directly — it uses the same system prompt, the
// same web research, the same safety firewall and the same save path, so a
// manual draft is indistinguishable from a pipeline one in /admin.
//
//   npm run draft -- "FBI seized 600 drones over World Cup venues"
//   npm run draft -- --category=defence-tech --dry-run "Headline here"
//
// Use "Headline :: extra context the drafter should start from" to pass a
// summary along with the title.
import { draftPost } from "./lib/draft.mjs";
import { finalizeAndSave } from "./lib/save.mjs";
import { scanSafety } from "./lib/filter.mjs";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const categoryArg = argv.find((a) => a.startsWith("--category="));
const category = categoryArg ? categoryArg.split("=")[1] : "";
const topics = argv.filter((a) => !a.startsWith("--"));

if (!topics.length) {
  console.error('Usage: npm run draft -- "Headline" ["Another headline"]');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const results = [];

for (const [i, raw] of topics.entries()) {
  const [title, summary] = raw.split("::").map((s) => s.trim());
  console.log(`\n[${i + 1}/${topics.length}] drafting: ${title}`);

  const candidate = { title, summary: summary || "", category };
  let draft;
  try {
    draft = await draftPost(candidate);
  } catch (err) {
    console.error(`  ! draft failed: ${err.message}`);
    continue;
  }

  // Second net: the model sets safetyReview, but flag it ourselves too so a
  // conflict story never publishes without a human look.
  if (scanSafety(`${draft.title} ${draft.body}`)) draft.safetyReview = true;

  console.log(`  title:    ${draft.title}`);
  console.log(`  beat:     ${category || draft.category}`);
  console.log(`  sources:  ${(draft.sources || []).length}`);
  if (draft.safetyReview) console.log("  ⚠ flagged for safety review");

  if (dryRun) {
    console.log(`  --- body preview ---\n${draft.body.slice(0, 600)}…`);
    continue;
  }

  const { slug, saved } = await finalizeAndSave(draft, candidate, today);
  console.log(`  saved:    ${saved}`);
  results.push(slug);
}

console.log(`\nDone. ${results.length} draft(s) saved${dryRun ? " (dry run — nothing written)" : ""}.`);
for (const s of results) console.log(`  /admin → ${s}`);

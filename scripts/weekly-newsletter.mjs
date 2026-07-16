#!/usr/bin/env node
/**
 * UAVHelpline — Weekly Newsletter
 * -------------------------------
 * collect the week's published posts -> AI-curate (lead + focused + roundup) ->
 * save an on-site digest DRAFT -> render a branded email -> create a Brevo DRAFT
 * campaign for the owner to review and send.
 *
 * RUN:  npm run weekly            (writes digest draft + Brevo draft campaign)
 *       npm run weekly:dry        (build only; writes scripts/weekly-preview.html)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { collectWeek, curateIssue } from "./lib/newsletter.mjs";
import { renderEmailHtml } from "./lib/email-template.mjs";
import { createDraftCampaign } from "./lib/brevo.mjs";
import { saveDraft } from "./lib/save.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://uavhelpline.vercel.app").replace(/\/$/, "");
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function digestBody(issue) {
  const parts = [issue.intro, ""];
  if (issue.lead) {
    parts.push(`## Lead story`, `**[${issue.lead.title}](/articles/${issue.lead.slug})** — ${issue.lead.take}`, "");
  }
  if (issue.focused.length) {
    parts.push(`## In focus`);
    for (const p of issue.focused) parts.push(`- **[${p.title}](/articles/${p.slug})** — ${p.take}`);
    parts.push("");
  }
  if (issue.roundup.length) {
    parts.push(`## The rest of the week`);
    for (const p of issue.roundup) parts.push(`- [${p.title}](/articles/${p.slug})`);
  }
  return parts.join("\n");
}

async function main() {
  const dryRun = process.argv.slice(2).includes("--dry-run");
  const today = new Date().toISOString().slice(0, 10);

  const posts = await collectWeek();
  console.log(`[weekly] ${posts.length} published posts in the last 7 days.`);
  if (!posts.length) {
    console.log(`[weekly] Nothing to send this week — skipping.`);
    return;
  }

  const issue = await curateIssue(posts);
  console.log(`[weekly] Lead: ${issue.lead?.title || "(none)"} · Focused: ${issue.focused.length} · Roundup: ${issue.roundup.length}`);
  console.log(`[weekly] Subject: ${issue.subject}`);

  const slug = `weekly-digest-${today}`;
  const webUrl = `${SITE_URL}/articles/${slug}`;
  const html = renderEmailHtml(issue, { siteUrl: SITE_URL, webUrl });

  if (dryRun) {
    const out = path.join(__dirname, "weekly-preview.html");
    fs.writeFileSync(out, html, "utf8");
    console.log(`[weekly] DRY RUN — wrote ${out}. No digest saved, no campaign created.`);
    return;
  }

  // 1) On-site digest DRAFT (review + publish in /admin alongside sending).
  const digestPost = {
    slug,
    title: `Weekly Digest — ${prettyDate(today)}`,
    date: today,
    category: "news",
    tags: ["digest"],
    tldr: issue.intro,
    metaDescription: issue.intro.slice(0, 150),
    image: issue.lead?.image || "/images/placeholder.svg",
    sources: [],
    safetyReview: false,
  };
  const saved = await saveDraft(digestPost, digestBody(issue));
  console.log(`[weekly] Saved digest draft: ${saved}`);

  // 2) Brevo DRAFT campaign.
  const apiKey = (process.env.BREVO_API_KEY || "").trim();
  if (!apiKey) {
    console.log(`[weekly] BREVO_API_KEY not set — skipped campaign. Digest draft is ready in /admin.`);
    return;
  }
  try {
    const { id } = await createDraftCampaign({
      name: `UAVHelpline Weekly — ${today}`,
      subject: issue.subject,
      html,
      sender: { name: process.env.BREVO_SENDER_NAME || "UAVHelpline", email: (process.env.BREVO_SENDER_EMAIL || "").trim() },
      listId: process.env.BREVO_LIST_ID,
      apiKey,
    });
    console.log(`[weekly] Created Brevo DRAFT campaign #${id}. Review and send from the Brevo dashboard.`);
  } catch (err) {
    console.error(`[weekly] Brevo campaign failed: ${err.message}`);
    console.log(`[weekly] The digest draft was still saved to /admin.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Weekly newsletter failed:", err);
  process.exit(1);
});

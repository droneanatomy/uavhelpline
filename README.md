# UAVHelpline — Website + Daily Draft Engine

A Next.js platform for UAVHelpline: a clean editorial site, eight industry
sections, an article template in the UAVHelpline structure, and a private
`/admin` "draft inbox" where each morning's auto-drafted post appears with its
image and a **Publish** button.

## Quick start

```bash
cd uavhelpline-site
npm install
npm run dev          # http://localhost:3000
```

Key pages:

- `/` — homepage (lead story, Latest, section rails)
- `/section/news` … `/section/regulations` — the eight sections
- `/articles/<slug>` — a published article
- `/admin` — the private draft inbox (read → Publish / Discard)

## The daily loop

```bash
npm run morning      # collect -> filter -> dedup -> rank -> research+draft -> image -> save as DRAFT
npm run morning:dry  # same, but stops after the pick and writes nothing (safe to run anytime)
```

This runs `scripts/morning-research.mjs`, which collects from the trusted RSS
sources, picks the single strongest fresh story, drafts it, generates a hero
image, and saves a **draft** post — then exits. Open `/admin`, review it, and
click **Publish**.

The pipeline's four points, and where each stands:

1. **Collect** — *wired*: fetches the RSS sources in `scripts/sources.json` via
   `rss-parser` (`scripts/lib/collect.mjs`), filters to the last few days, then
   applies the brief's allow/reject rules, dedupes (incl. against already-covered
   stories), and ranks by source tier + recency.
2. **Draft** — *wired, off by default* (`scripts/lib/draft.mjs`): set
   `ANTHROPIC_API_KEY` and Claude researches the story on the web, confirms the
   facts, and writes it in the UAVHelpline structure (paraphrase, cite every
   source, apply the safety firewall). With no key it writes a labeled
   placeholder so the pipeline still runs.
3. **Image** — branded SVG, tinted to the story's beat colour; swap for an image
   API later. (`saveImage` already handles file + Supabase storage.)
4. **Runtime** — still manual (`npm run morning`); point a scheduled task *or* a
   Vercel Cron at the same `main()` for production. Logic is identical.

Config (see `.env.example`): `ANTHROPIC_API_KEY`, `UAVHELPLINE_DRAFT_MODEL`
(default `claude-opus-4-8`), `UAVHELPLINE_RECENCY_DAYS` (default `3`).

## Generate a draft on demand

Beyond the daily auto-pick, the **`/admin` composer** lets you type any topic and
run the same research+draft pipeline on it. It streams live progress (searching
sources → reviewing → writing) via `POST /api/generate` and `draftPostStream`
(`scripts/lib/draft.mjs`), then drops the finished draft into the inbox for the
usual edit/preview/publish flow. Needs `ANTHROPIC_API_KEY` on the server. The
image + save step is shared with the morning CLI in `scripts/lib/save.mjs`.

Run the unit tests for the pipeline with `npm test`.

## How content works

Posts are Markdown files in `content/posts/` with frontmatter (see any sample).
`status: draft` shows only in `/admin`; `status: published` goes live.
`lib/content.js` is the single place to swap the file store for PostgreSQL in
production — the rest of the app is unchanged.

## Two runtime options for "every morning" (decide later)

- **Option 1 — Scheduled task here:** a daily task drafts the post for review. No servers/keys to start. Best for proving quality first.
- **Option 2 — Vercel Cron:** the same pipeline runs server-side against a database. Fully autonomous; needs deployment + API keys.

## Going to production

1. Add login protection to `/admin`.
2. Move content to PostgreSQL (Supabase/Neon) and images to S3.
3. Wire real web-search research + AI image generation into the worker.
4. Deploy to Vercel, front with Cloudflare, add Typesense search + Sentry.

See `../UAVHelpline-System-Architecture.md` for the full design.
```

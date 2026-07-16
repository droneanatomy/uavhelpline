# Weekly Newsletter — Design Spec

_Status: approved 2026-06-30_

## Goal
Produce a good-looking weekly UAVHelpline email newsletter that rounds up the
week's published stories, with an AI-curated lead + focused picks, plus an
on-site web version. Delivered as a **Brevo draft campaign** the owner reviews
and sends.

## Decisions (from brainstorming)
- **Workflow:** auto-draft, human sends. Script builds everything and creates a
  Brevo **draft** campaign; owner reviews in Brevo and hits Send.
- **Structure:** editor's intro → 1 **Lead** (hero image + 2–3 sentence take) →
  **3 Focused** (thumbnail + 1–2 line take) → "The rest of the week" roundup
  (every other published headline).
- **Curation:** AI-curated. One Anthropic call (no web search) reads the week's
  posts, picks lead + focused (priority brands DJI/Autel/Anduril/Parrot/Skydio
  weighted up), and writes intro + takes + subject.
- **Web version:** yes — saved as a Supabase post `weekly-digest-YYYY-MM-DD`,
  tag `digest`, **status `draft`** (owner publishes in /admin alongside sending).
- **Cadence:** Friday ~16:00 IST (= 10:30 UTC), covers the last 7 days. Weekly
  Windows Task, same date-guard pattern as the daily job.
- **Sender:** `info.uavhelpline@gmail.com` (must be a **verified sender** in
  Brevo), name "UAVHelpline".

## Architecture
Local Node script (not Vercel) — reuses Supabase + Anthropic + Brevo, runs from
the owner's machine like the daily pipeline.

### Components (isolated, testable)
- `scripts/lib/newsletter.mjs` — `collectWeek({days=7})` reads published posts in
  window from the content layer; `curateIssue(posts, {deps})` calls Anthropic and
  returns a validated **issue object**:
  `{ subject, intro, lead:{...post, take}, focused:[{...post, take}×≤3], roundup:[post…] }`.
  Pure fallback (no API key): deterministic pick by priority+recency, templated
  intro, posts' own TL;DRs as takes.
- `scripts/lib/email-template.mjs` — `renderEmailHtml(issue, {siteUrl, webUrl})`
  and `renderEmailText(issue)`. Pure functions, no I/O. Table-based, inline-CSS,
  email-safe. Brand: cobalt (#242ef7) masthead + white logo, hero, focused
  cards, roundup list; footer with **View in browser** + Brevo `{{ unsubscribe }}`.
- `scripts/lib/brevo.mjs` — `createDraftCampaign({name, subject, html, sender,
  listId, apiKey})` → `POST /v3/emailCampaigns` (draft; not scheduled/sent).
- `scripts/weekly-newsletter.mjs` — entry point: collectWeek → curateIssue →
  save web digest (draft, via existing `saveDraft`) → render → create Brevo draft.
  Supports `--dry-run` (build + print, no writes).
- `scripts/run-weekly.cmd` — Task Scheduler wrapper; date-guard on `last-weekly.txt`;
  logs to `scripts/weekly.log`.

### Data flow
Supabase (published, last 7d) → curate (Claude) → issue object →
(a) `saveDraft` web digest to Supabase (`weekly-digest-YYYY-MM-DD`, tag `digest`,
draft); (b) `renderEmailHtml` → Brevo draft campaign. Owner publishes the digest
post + sends the campaign.

### Env
- Reuse: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ANTHROPIC_API_KEY`, `UAVHELPLINE_DRAFT_MODEL`, `BREVO_API_KEY`, `BREVO_LIST_ID`,
  `NEXT_PUBLIC_SITE_URL`.
- New: `BREVO_SENDER_EMAIL` (=info.uavhelpline@gmail.com), `BREVO_SENDER_NAME`
  (=UAVHelpline). Document in `.env.example`.

## Edge cases
- **Quiet week** (<4 posts): still builds; focused scales down to what's
  available; roundup may be empty.
- **Zero posts:** skip — no campaign, log "no posts this week".
- **No BREVO_API_KEY:** build + save web digest, skip campaign, log.
- **No ANTHROPIC_API_KEY:** deterministic fallback curation.
- **Brevo/API error:** log detail, non-zero exit; weekly guard lets it retry.

## Testing
Unit tests (node:test) for: `collectWeek` window filter; `curateIssue` fallback
selection + priority weighting (injected deps, no network); `renderEmailHtml`
contains lead/focused/roundup + unsubscribe + escapes HTML. `brevo.mjs` payload
shape via injected fetch.

## Out of scope (YAGNI)
Segmentation, A/B, open-tracking dashboards, multi-language, per-subscriber
personalization, auto-send.

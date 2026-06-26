# Deploying UAVHelpline to Vercel

The site is a standard Next.js 14 App Router app. Vercel auto-detects it
(Build: `next build`, Output: `.next`). No `vercel.json` is required.

## 1. Push to a Git repo

```bash
cd uavhelpline-site
git init
git add .
git commit -m "UAVHelpline site"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

> If you keep the Expo app (`uavhelpline-app/`) in the same repo, set the Vercel
> project **Root Directory** to `uavhelpline-site`. If you push only this folder
> (as above), leave Root Directory as the default.

## 2. Import the project on Vercel

vercel.com → **Add New → Project** → import the repo → **Deploy**.

## 3. Environment Variables (Project → Settings → Environment Variables)

Add these for the **Production** (and Preview) environments. Values come from
your local `.env.local`.

| Variable | Required | Used for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Public content reads (build + runtime) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public content reads + admin login |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side writes (drafts/publish/upload) — **secret** |
| `CRON_SECRET` | ✅ for cron | Authenticates the daily `/api/cron` AI run — **secret** |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical origin for sitemap/robots/OG (e.g. `https://uavhelpline.com`) |
| `NEXT_PUBLIC_GA_ID` | optional | Google Analytics 4 Measurement ID (`G-XXXXXXXXXX`) |
| `ANTHROPIC_API_KEY` | optional | `/admin` Generate + Run pipeline + cron drafting |
| `UAVHELPLINE_DRAFT_MODEL` | optional | Defaults to `claude-sonnet-4-6` |
| `UAVHELPLINE_RECENCY_DAYS` | optional | RSS recency window |
| `UAVHELPLINE_MAX_SOURCES` | optional | Source citation cap (default 5) |
| `UAVHELPLINE_IMAGE_PROVIDER` | optional | `cloudflare` for AI hero images |
| `CLOUDFLARE_API_TOKEN` | optional | Cloudflare Workers AI image gen |
| `CLOUDFLARE_ACCOUNT_ID` | optional | Cloudflare Workers AI image gen |

If the Supabase vars are omitted, the site falls back to reading Markdown files
in `content/posts/` and the admin write APIs are disabled.

## Daily AI flow (Vercel Cron)

`vercel.json` registers a cron that hits `GET /api/cron` once a day
(`0 11 * * *` = 11:00 UTC — adjust the schedule there). On each run it executes
the full verification pipeline (collect → topic filter → source check → cluster →
cross-check → select → draft) and saves a **draft** to Supabase for review.

- Set **`CRON_SECRET`** in the Vercel env. Vercel automatically sends it as
  `Authorization: Bearer <CRON_SECRET>`; the route rejects anything else, so the
  endpoint can't be triggered by the public.
- Requires Supabase (drafts can't be written to the read-only serverless FS) and
  `ANTHROPIC_API_KEY` for real drafting (without it, a labeled placeholder draft
  is saved).
- **Plan note:** `/api/cron`, `/api/generate`, `/api/run-pipeline` set
  `maxDuration = 60` (Hobby cap). Long web-research drafts can approach that;
  on **Pro** raise these to `300`. Hobby also limits crons to once per day.
- **Analytics:** `<Analytics />` (Vercel Web Analytics) needs no key — enable it
  under Project → Analytics. GA loads only when `NEXT_PUBLIC_GA_ID` is set.

## Notes

- **Live publishing:** the homepage, article, and section pages use ISR
  (`export const revalidate = 60`), so posts published in `/admin` appear on the
  live site within ~60 seconds — no redeploy needed.
- **Admin auth:** every write route (`/api/drafts`, `/api/publish`,
  `/api/generate`, `/api/run-pipeline`, `/api/upload`) requires a Supabase
  session bearer token, so `/admin` is gated by Supabase Auth.
- **Function timeout:** `/api/generate` and `/api/run-pipeline` set
  `maxDuration = 60` (Vercel Hobby cap). On **Pro** you can raise these to `300`
  for longer research/draft runs. Day-to-day content is better generated with
  `npm run morning` locally or a scheduled job.
- **Secrets:** `.env.local` is git-ignored — never commit it. Set all secrets in
  the Vercel dashboard instead.

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
| `ANTHROPIC_API_KEY` | optional | `/admin` "Generate" + "Run pipeline" drafting |
| `UAVHELPLINE_DRAFT_MODEL` | optional | Defaults to `claude-sonnet-4-6` |
| `UAVHELPLINE_RECENCY_DAYS` | optional | RSS recency window |
| `UAVHELPLINE_MAX_SOURCES` | optional | Source citation cap (default 5) |
| `UAVHELPLINE_IMAGE_PROVIDER` | optional | `cloudflare` for AI hero images |
| `CLOUDFLARE_API_TOKEN` | optional | Cloudflare Workers AI image gen |
| `CLOUDFLARE_ACCOUNT_ID` | optional | Cloudflare Workers AI image gen |

If the Supabase vars are omitted, the site falls back to reading Markdown files
in `content/posts/` and the admin write APIs are disabled.

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

# UAVHelpline — Backend Setup (Supabase)

The site works two ways automatically:

- **No keys set** → it reads Markdown files in `content/posts`. Great for local dev; the publish button writes to disk.
- **Supabase keys set** → it reads/writes the `posts` database table, the admin requires login, and publishing works in production.

You don't change any code to switch — just add the keys. Here's the one-time setup.

---

## 1. Create a free Supabase project

1. Go to **https://supabase.com**, sign up, and click **New project**.
2. Pick a name (e.g. `uavhelpline`) and a database password (save it somewhere).
3. Wait ~2 minutes for it to provision.

## 2. Create the database table

1. In the project, open **SQL Editor → New query**.
2. Open the file `supabase/schema.sql` from this project, copy all of it, paste it in, and click **Run**.
3. This creates the `posts` table, the security rules, and an `images` storage bucket.

## 3. Get your keys

In the project, go to **Project Settings → API** and copy three values:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key (under "Project API keys", click reveal) → `SUPABASE_SERVICE_ROLE_KEY`
  *(This one is secret — it only ever lives on the server, never in the browser.)*

## 4. Add the keys locally

1. In the `uavhelpline-site` folder, copy `.env.example` to `.env.local`.
2. Paste the three values in.
3. Restart the dev server (`npm run dev`).

## 5. Load your existing articles into the database

```
npm run seed
```

This copies the sample Markdown posts into the `posts` table. (Safe to re-run.)

## 6. Create your editor login

In Supabase, go to **Authentication → Users → Add user**, and create one with your
email and a password. That's the login you'll use at `/admin`.

Now visit `/admin` — it will ask you to sign in, then show the draft inbox.

---

## Going live (Vercel)

1. Push the `uavhelpline-site` folder to a GitHub repo.
2. On **https://vercel.com**, import the repo.
3. In the Vercel project's **Settings → Environment Variables**, add the same three
   keys from step 3.
4. Deploy. Your site is live, the admin is login-protected, and publishing works.

## The morning automation in production

The daily script (`npm run morning`) also detects the keys: with Supabase set, it
**inserts the draft into the database and uploads its image to the storage bucket**
instead of writing local files — so it works on a server. Point a Vercel Cron (or
the scheduled task in your assistant) at it to run every morning.

---

## What each piece does

| Need | Handled by |
|---|---|
| Store articles & drafts | Supabase Postgres (`posts` table) |
| Admin login | Supabase Auth |
| Hero image storage | Supabase Storage (`images` bucket) |
| Publish button in production | `/api/publish` → database update (auth-checked) |
| Daily drafts | `scripts/morning-research.mjs` → database insert |

All four backend needs are covered by the one Supabase project.

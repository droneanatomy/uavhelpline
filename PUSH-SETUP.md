# UAVHelpline — Push Notifications Setup

Goal: the moment a post is published, every app user gets a notification.

How it works: the app saves each device's push token to Supabase. A **database
webhook** watches the `posts` table; when a post becomes `published`, it calls an
**Edge Function** that sends the notification to all devices via **Expo Push**.

You publish once → the webhook does the rest. Nothing extra to click.

```
Publish a post  →  posts row status = 'published'
                 →  Database Webhook fires
                 →  Edge Function reads device tokens
                 →  Expo Push  →  every phone gets the alert
```

---

## One-time setup

### 1. Token table
In Supabase → **SQL Editor**, run `supabase/push-notifications.sql`.

### 2. Deploy the Edge Function
Install the Supabase CLI, then from the `uavhelpline-site` folder:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy notify-on-publish --no-verify-jwt
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function
automatically — no secrets to set.)

### 3. Create the database webhook
In Supabase → **Database → Webhooks → Create**:

- Table: `posts`
- Events: **Insert** and **Update**
- Type: **Supabase Edge Functions** → select `notify-on-publish`

Save. That's the trigger.

### 4. Point the app at a real project (for push tokens)
Push needs a built app with credentials (Expo Go can't receive production push).
In the `uavhelpline-app` folder:

```bash
npm install            # picks up expo-notifications/device/constants
npx expo install --fix # align native versions
eas init               # creates the EAS project + writes projectId into app.json
eas build --platform android   # and ios
```

EAS sets up **FCM** (Android) and **APNs** (iOS) credentials for you during the
build. Once users install that build, their devices register automatically.

---

## Test it

1. Install an EAS dev/preview build on a phone and open the app once (it registers
   the token and asks permission).
2. In `/admin`, publish any draft.
3. The phone gets the notification within seconds; tapping it opens that article.

---

## Notes

- The app code is already wired: `src/lib/push.js` registers the token and saves it;
  `App.js` opens the tapped article. It no-ops safely on simulators or before
  `eas init`, so the app keeps running with or without push configured.
- Tokens stay private — only the Edge Function (service role) can read them.
- Want a daily "Weekly Digest is out" nudge too? Point a scheduled job at the same
  function or send a manual push; the plumbing is identical.

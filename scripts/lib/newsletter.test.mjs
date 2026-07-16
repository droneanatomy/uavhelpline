import { test } from "node:test";
import assert from "node:assert/strict";
import { collectWeek, fallbackIssue, isPriorityPost, curateIssue } from "./newsletter.mjs";
import { renderEmailHtml, esc } from "./email-template.mjs";
import { createDraftCampaign } from "./brevo.mjs";

const POSTS = [
  { slug: "a", title: "New BVLOS ruling", category: "regulations", date: "2026-07-03", tldr: "A ruling.", image: "/i/a.jpg" },
  { slug: "b", title: "DJI unveils the EV50 cargo drone", category: "commercial-drones", date: "2026-07-01", tldr: "DJI eVTOL.", image: "/i/b.jpg" },
  { slug: "c", title: "Sensor roundup", category: "components", date: "2026-07-02", tldr: "Sensors.", image: "/i/c.jpg" },
  { slug: "d", title: "Autonomy stack update", category: "ai-autonomy", date: "2026-06-30", tldr: "Autonomy.", image: "/i/d.jpg" },
  { slug: "e", title: "Old-ish item", category: "news", date: "2026-06-29", tldr: "Misc.", image: "/i/e.jpg" },
];

test("isPriorityPost matches priority brands", () => {
  assert.equal(isPriorityPost({ title: "DJI unveils the EV50" }), true);
  assert.equal(isPriorityPost({ title: "New BVLOS ruling" }), false);
});

test("fallbackIssue leads with a priority brand and fills focused + roundup", () => {
  const issue = fallbackIssue(POSTS);
  assert.equal(issue.lead.slug, "b", "DJI story should lead");
  assert.equal(issue.focused.length, 3);
  // lead + 3 focused chosen, remaining go to roundup
  assert.equal(issue.roundup.length, POSTS.length - 4);
  assert.ok(issue.lead.take, "lead has a take");
});

test("curateIssue falls back deterministically when no API key", async () => {
  const issue = await curateIssue(POSTS, { apiKey: "" });
  assert.equal(issue.lead.slug, "b");
});

test("curateIssue returns null for an empty week", async () => {
  assert.equal(await curateIssue([], { apiKey: "" }), null);
});

test("collectWeek filters window, drops digests, maps rows (injected client)", async () => {
  let gteArg = null;
  const fakeClient = {
    from() { return this; },
    select() { return this; },
    eq() { return this; },
    gte(_col, val) { gteArg = val; return this; },
    order() {
      return Promise.resolve({
        data: [
          { slug: "x", title: "Kept", status: "published", date: "2026-07-03", tags: [], meta_description: "m" },
          { slug: "old-digest", title: "Prev digest", status: "published", date: "2026-07-02", tags: ["digest"] },
        ],
        error: null,
      });
    },
  };
  const now = Date.UTC(2026, 6, 4);
  const posts = await collectWeek({ client: fakeClient, now });
  assert.equal(gteArg, "2026-06-27", "7-day window boundary");
  assert.equal(posts.length, 1, "digest excluded");
  assert.equal(posts[0].slug, "x");
});

test("renderEmailHtml includes lead, focused, roundup, unsubscribe; escapes HTML", () => {
  const issue = fallbackIssue([
    ...POSTS,
    { slug: "xss", title: 'Bad <script>"&', category: "news", date: "2026-07-04", tldr: "x", image: "/i/x.jpg" },
  ]);
  const html = renderEmailHtml(issue, { siteUrl: "https://uavhelpline.com", webUrl: "https://uavhelpline.com/articles/weekly-digest-2026-07-04" });
  assert.match(html, /In focus/);
  assert.match(html, /The rest of the week/);
  assert.match(html, /\{\{ unsubscribe \}\}/);
  assert.match(html, /View in browser/);
  assert.match(html, /https:\/\/uavhelpline\.com\/articles\//);
  // no raw <script> from titles
  assert.ok(!html.includes("<script>"));
  assert.equal(esc('a<b>"&'), "a&lt;b&gt;&quot;&amp;");
});

test("createDraftCampaign posts the expected Brevo payload (injected fetch)", async () => {
  let captured = null;
  const fakeFetch = async (url, opts) => {
    captured = { url, body: JSON.parse(opts.body), headers: opts.headers };
    return { ok: true, json: async () => ({ id: 42 }) };
  };
  const { id } = await createDraftCampaign(
    { name: "n", subject: "s", html: "<b>x</b>", sender: { name: "UAVHelpline", email: "info@x.com" }, listId: "7", apiKey: "k" },
    { fetchImpl: fakeFetch }
  );
  assert.equal(id, 42);
  assert.equal(captured.url, "https://api.brevo.com/v3/emailCampaigns");
  assert.equal(captured.headers["api-key"], "k");
  assert.deepEqual(captured.body.recipients.listIds, [7]);
  assert.equal(captured.body.sender.email, "info@x.com");
  assert.equal(captured.body.htmlContent, "<b>x</b>");
});

test("createDraftCampaign throws (not leaking) on Brevo error", async () => {
  const fakeFetch = async () => ({ ok: false, status: 400, json: async () => ({ code: "x", message: "IP blocked" }) });
  await assert.rejects(
    () => createDraftCampaign({ name: "n", subject: "s", html: "x", sender: { email: "a@b.com" }, listId: "1", apiKey: "k" }, { fetchImpl: fakeFetch }),
    /Brevo 400/
  );
});

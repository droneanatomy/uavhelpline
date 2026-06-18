"use client";

import { useEffect, useState, useCallback } from "react";
import { categoryLabel, CATEGORIES } from "../../lib/categories";
import { browserConfigured, getBrowserClient } from "../../lib/supabaseBrowser";

const inputStyle = {
  padding: "9px 12px",
  border: "1px solid var(--line)",
  borderRadius: 4,
  fontFamily: "var(--display)",
  width: "100%",
};

// tags/sources convert between the stored array and the form's text field.
const toTags = (s) => s.split(",").map((t) => t.trim()).filter(Boolean);
const toSources = (s) => s.split("\n").map((t) => t.trim()).filter(Boolean);

// Shared post editor — used both for editing an existing post and creating a new one.
function PostEditor({ form, setField, uploading, uploadImage, saving, onSave, onCancel, saveLabel = "Save draft" }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="cat">Title</span>
        <input style={inputStyle} value={form.title} onChange={(e) => setField("title", e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 4, flex: "1 1 200px" }}>
          <span className="cat">Category</span>
          <select style={inputStyle} value={form.category} onChange={(e) => setField("category", e.target.value)}>
            {CATEGORIES.filter((c) => c.slug !== "database").map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, flex: "1 1 200px" }}>
          <span className="cat">Image path / URL</span>
          <input style={inputStyle} value={form.image} onChange={(e) => setField("image", e.target.value)} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {form.image && (
          <img src={form.image} alt="hero preview"
            style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", background: "#f3f4f6" }} />
        )}
        <label className="btn" style={{ cursor: "pointer", margin: 0 }}>
          {uploading ? "Uploading…" : "Upload new image"}
          <input type="file" accept="image/*" disabled={uploading} style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; uploadImage(f); }} />
        </label>
      </div>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="cat">TL;DR</span>
        <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.tldr} onChange={(e) => setField("tldr", e.target.value)} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="cat">Body (Markdown)</span>
        <textarea style={{ ...inputStyle, minHeight: 260, fontFamily: "var(--mono, monospace)" }} value={form.body} onChange={(e) => setField("body", e.target.value)} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="cat">Tags (comma-separated)</span>
        <input style={inputStyle} value={form.tagsText} onChange={(e) => setField("tagsText", e.target.value)} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="cat">Sources (one URL per line)</span>
        <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: "var(--mono, monospace)" }} value={form.sourcesText} onChange={(e) => setField("sourcesText", e.target.value)} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="cat">Meta description (≤150 chars)</span>
        <input style={inputStyle} maxLength={150} value={form.metaDescription} onChange={(e) => setField("metaDescription", e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : saveLabel}
        </button>
        <button className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const usingAuth = browserConfigured();
  const [token, setToken] = useState(null);
  const [checking, setChecking] = useState(usingAuth);
  const [drafts, setDrafts] = useState([]);
  const [tab, setTab] = useState("draft"); // "draft" | "published"
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState("");

  // inline editor state
  const [editing, setEditing] = useState(null); // slug being edited
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(null);
  const [creating, setCreating] = useState(false);

  // manual generation (composer)
  const [genTopic, setGenTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genLog, setGenLog] = useState([]);

  // login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const authHeaders = useCallback(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/drafts?status=${tab}`, { cache: "no-store", headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setDrafts(data.drafts || []);
    }
    setLoading(false);
  }, [authHeaders, tab]);

  // Restore session on mount (auth mode only)
  useEffect(() => {
    if (!usingAuth) {
      load();
      return;
    }
    const sb = getBrowserClient();
    sb.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token || null);
      setChecking(false);
    });
  }, [usingAuth, load]);

  // Load drafts once we have a token
  useEffect(() => {
    if (usingAuth && token) load();
  }, [usingAuth, token, load]);

  async function signIn(e) {
    e.preventDefault();
    setLoginErr("");
    const sb = getBrowserClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginErr(error.message);
      return;
    }
    setToken(data.session?.access_token || null);
  }

  async function signOut() {
    const sb = getBrowserClient();
    await sb.auth.signOut();
    setToken(null);
    setDrafts([]);
  }

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  const ACT_MSG = {
    publish: "Published — it's live on the site.",
    discard: tab === "published" ? "Post deleted." : "Draft discarded.",
    unpublish: "Unpublished — moved back to Drafts.",
  };

  // Confirm destructive actions on live content.
  const CONFIRM = {
    discard: tab === "published" ? "Delete this published post permanently?" : null,
    unpublish: "Unpublish this post (remove it from the live site)?",
  };

  async function act(slug, action) {
    if (CONFIRM[action] && !window.confirm(CONFIRM[action])) return;
    setBusy(slug + action);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ slug, action }),
    });
    const data = await res.json();
    setBusy(null);
    if (data.ok) {
      flash(ACT_MSG[action] || "Done.");
      setDrafts((d) => d.filter((x) => x.slug !== slug)); // leaves the current tab's list
      if (editing === slug) setEditing(null);
    } else {
      flash(data.error || "Something went wrong.");
    }
  }

  // ---- Inline editor ----
  async function openEdit(slug) {
    if (editing === slug) {
      setEditing(null);
      return;
    }
    setCreating(false);
    setEditing(slug);
    setForm(null);
    setEditLoading(true);
    const res = await fetch(`/api/drafts?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
      headers: authHeaders(),
    });
    setEditLoading(false);
    if (!res.ok) {
      flash("Could not load the draft.");
      setEditing(null);
      return;
    }
    const { draft } = await res.json();
    setForm({
      slug: draft.slug,
      title: draft.title || "",
      category: draft.category || "news",
      tldr: draft.tldr || "",
      body: draft.body || "",
      metaDescription: draft.metaDescription || "",
      image: draft.image || "",
      tagsText: (draft.tags || []).join(", "),
      sourcesText: (draft.sources || []).join("\n"),
    });
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadImage(file) {
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("slug", form.slug || form.title || "new");
    const res = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (data.ok && data.url) {
      setField("image", data.url);
      flash("Image uploaded.");
    } else {
      flash(data.error || "Image upload failed.");
    }
  }

  async function saveEdit() {
    if (!form.title.trim() || !form.body.trim()) {
      flash("Title and body are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        slug: form.slug,
        title: form.title,
        category: form.category,
        tldr: form.tldr,
        body: form.body,
        metaDescription: form.metaDescription,
        image: form.image,
        tags: toTags(form.tagsText),
        sources: toSources(form.sourcesText),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      // reflect the changes in the row summary, then collapse
      setDrafts((ds) =>
        ds.map((d) =>
          d.slug === form.slug
            ? { ...d, title: form.title, tldr: form.tldr, category: form.category, image: form.image || d.image }
            : d
        )
      );
      setEditing(null);
      flash(tab === "published" ? "Post updated — change is live." : "Draft saved.");
    } else {
      flash(data.error || "Save failed.");
    }
  }

  // ---- Create a new post by hand ----
  function startCreate() {
    setEditing(null);
    setForm({ slug: "", title: "", category: "news", tldr: "", body: "", metaDescription: "", image: "/images/placeholder.svg", tagsText: "", sourcesText: "" });
    setCreating(true);
  }
  function cancelCreate() {
    setCreating(false);
    setForm(null);
  }
  async function createPost() {
    if (!form.title.trim() || !form.body.trim()) {
      flash("Title and body are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        title: form.title,
        category: form.category,
        tldr: form.tldr,
        body: form.body,
        metaDescription: form.metaDescription,
        image: form.image,
        tags: toTags(form.tagsText),
        sources: toSources(form.sourcesText),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      setCreating(false);
      setForm(null);
      flash("Post created — it's in Drafts.");
      if (tab !== "draft") setTab("draft"); // effect reloads on tab change
      else await load();
    } else {
      flash(data.error || "Create failed.");
    }
  }

  // ---- Streamed jobs (topic generation + full pipeline) share one SSE reader ----
  // POSTs to `url`, reads the SSE progress stream into genLog, returns the final
  // {done, slug, skipped, reason} message (or {} on failure).
  async function streamJob(url, body, firstLine) {
    setGenerating(true);
    setGenLog([firstLine]);
    let result = {};
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...authHeaders() },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({}));
        flash(e.error || "Request failed.");
        return result;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const line = chunk.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let msg;
          try {
            msg = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (msg.error) flash(msg.error);
          else if (msg.done) result = msg;
          else if (msg.detail) setGenLog((prev) => (prev[prev.length - 1] === msg.detail ? prev : [...prev, msg.detail]));
        }
      }
    } catch (err) {
      flash("Request failed: " + (err?.message || "network error"));
    } finally {
      setGenerating(false);
    }
    return result;
  }

  // Topic composer: research + draft a typed topic.
  async function generate() {
    const topic = genTopic.trim();
    if (!topic || generating) return;
    const result = await streamJob("/api/generate", { topic }, "Starting research…");
    setGenLog([]);
    if (result.done && !result.skipped) {
      setGenTopic("");
      flash("Draft generated — review it below.");
      await load();
    }
  }

  // Full auto-pick pipeline (same as the morning engine).
  async function runDailyPipeline() {
    if (generating) return;
    const result = await streamJob("/api/run-pipeline", null, "Scanning feeds…");
    setGenLog([]);
    if (!result.done) return;
    if (result.skipped) {
      flash(result.reason || "No fresh story to draft today.");
    } else {
      flash("Pipeline ran — new draft below.");
      await load();
    }
  }

  // ---- Login screen (auth mode, not signed in) ----
  if (usingAuth && checking) {
    return <div className="container admin-wrap"><p className="empty">Checking session…</p></div>;
  }
  if (usingAuth && !token) {
    return (
      <div className="container admin-wrap" style={{ maxWidth: 380 }}>
        <h1 style={{ fontFamily: "var(--display)", letterSpacing: "-0.02em" }}>Editor sign in</h1>
        <p className="admin-sub">Sign in to review and publish drafts.</p>
        {loginErr && <div className="toast" style={{ background: "#fef2f2", color: "#991b1b" }}>{loginErr}</div>}
        <form onSubmit={signIn} style={{ display: "grid", gap: 12 }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "11px 14px", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "var(--display)" }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "11px 14px", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "var(--display)" }} />
          <button type="submit" className="btn btn-primary">Sign in</button>
        </form>
      </div>
    );
  }

  // ---- Draft inbox ----
  return (
    <div className="container admin-wrap">
      <div className="admin-head">
        <h1>Editor</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
          {usingAuth && <button className="btn" onClick={signOut}>Sign out</button>}
        </div>
      </div>

      {/* Drafts / Published tabs + New post */}
      <div style={{ display: "flex", gap: 8, margin: "0 0 6px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["draft", "published"].map((t) => (
            <button
              key={t}
              className={tab === t ? "btn btn-primary" : "btn"}
              onClick={() => { if (tab !== t) { setEditing(null); setTab(t); } }}
              disabled={loading}
            >
              {t === "draft" ? "Drafts" : "Published"}
            </button>
          ))}
        </div>
        <button className="btn" onClick={startCreate} disabled={creating} title="Write a new post by hand">
          + New post
        </button>
      </div>
      <p className="admin-sub">
        {tab === "draft"
          ? "Each morning's auto-drafted post lands here. Read it, edit if needed, then publish — or discard."
          : "Live posts. Edit to correct, unpublish to pull back to drafts, or delete."}
      </p>

      {/* Manual run: type a topic, Claude researches + drafts it live */}
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, margin: "0 0 22px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span className="cat">Generate a draft</span>
          <button
            className="btn"
            onClick={runDailyPipeline}
            disabled={generating}
            title="Auto-pick today's top story from the feeds and draft it"
            style={{ fontSize: 11, padding: "7px 12px" }}
          >
            {generating ? "Working…" : "↻ Run today's pipeline"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            value={genTopic}
            onChange={(e) => setGenTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
            disabled={generating}
            placeholder="Describe a topic to research and draft — e.g. “Skydio X10 autonomy update” or “2026 BVLOS rule changes”"
            rows={2}
            style={{ ...inputStyle, resize: "vertical", minHeight: 46, border: "1px solid var(--line)", borderRadius: 8 }}
          />
          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={generating || !genTopic.trim()}
            title="Research & draft (⌘/Ctrl + Enter)"
            style={{ borderRadius: 999, width: 44, height: 44, padding: 0, fontSize: 18, flex: "0 0 auto" }}
          >
            {generating ? "…" : "↑"}
          </button>
        </div>
        {generating || genLog.length > 0 ? (
          <div style={{ marginTop: 12, display: "grid", gap: 5 }}>
            {genLog.map((d, i) => {
              const active = generating && i === genLog.length - 1;
              return (
                <div key={i} style={{ fontSize: 13, color: active ? "#111" : "#6b7280", fontFamily: "var(--display)" }}>
                  <span style={{ marginRight: 8 }}>{active ? "◐" : "●"}</span>{d}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af", fontFamily: "var(--display)" }}>
            Claude researches the web, confirms facts, and drafts it for your review. Requires the server API key.
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      {creating && form && (
        <div style={{ border: "1px solid var(--cobalt)", borderRadius: 6, padding: 16, margin: "0 0 22px", background: "#fafbff" }}>
          <div className="cat" style={{ marginBottom: 12 }}>New post</div>
          <PostEditor
            form={form}
            setField={setField}
            uploading={uploading}
            uploadImage={uploadImage}
            saving={saving}
            onSave={createPost}
            onCancel={cancelCreate}
            saveLabel="Create draft"
          />
        </div>
      )}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : drafts.length === 0 ? (
        <p className="empty">{tab === "draft" ? "No drafts waiting. You're all caught up. ✦" : "No published posts yet."}</p>
      ) : (
        drafts.map((d) => (
          <div key={d.slug}>
            <div className="draft-row">
              <img src={d.image} alt={d.title} />
              <div>
                <div className="cat">
                  {categoryLabel(d.category)}
                  {d.safetyReview && <span className="flag-pill">safety review</span>}
                </div>
                <h3>{d.title}</h3>
                <p>{d.tldr}</p>
              </div>
              <div className="btn-row">
                <a className="btn" href={tab === "published" ? `/articles/${d.slug}` : `/articles/${d.slug}?preview=1`} target="_blank" rel="noopener noreferrer">
                  {tab === "published" ? "View" : "Preview"}
                </a>
                <button className="btn" onClick={() => openEdit(d.slug)}>
                  {editing === d.slug ? "Close" : "Edit"}
                </button>
                {tab === "draft" ? (
                  <>
                    <button className="btn btn-primary" onClick={() => act(d.slug, "publish")} disabled={busy === d.slug + "publish"}>
                      {busy === d.slug + "publish" ? "Publishing…" : "Publish"}
                    </button>
                    <button className="btn" onClick={() => act(d.slug, "discard")} disabled={busy === d.slug + "discard"}>Discard</button>
                  </>
                ) : (
                  <>
                    <button className="btn" onClick={() => act(d.slug, "unpublish")} disabled={busy === d.slug + "unpublish"}>
                      {busy === d.slug + "unpublish" ? "Unpublishing…" : "Unpublish"}
                    </button>
                    <button className="btn" onClick={() => act(d.slug, "discard")} disabled={busy === d.slug + "discard"}>Delete</button>
                  </>
                )}
              </div>
            </div>

            {editing === d.slug && (
              <div style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 16, margin: "0 0 18px", background: "#fafafa" }}>
                {editLoading || !form ? (
                  <p className="empty">Loading draft…</p>
                ) : (
                  <PostEditor
                    form={form}
                    setField={setField}
                    uploading={uploading}
                    uploadImage={uploadImage}
                    saving={saving}
                    onSave={saveEdit}
                    onCancel={() => setEditing(null)}
                    saveLabel={tab === "published" ? "Save changes" : "Save draft"}
                  />
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

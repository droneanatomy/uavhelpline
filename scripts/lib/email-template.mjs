// Pure rendering: issue object -> branded, email-safe HTML (+ plain text).
// Table layout, inline CSS, ~600px, brand cobalt/navy. No I/O.

const COBALT = "#242ef7";
const MIDNIGHT = "#0b2566";
const INK = "#111111";
const INK_SOFT = "#555555";
const LINE = "#e2e2e2";

export function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function abs(url, siteUrl) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function articleUrl(slug, siteUrl) {
  return `${siteUrl}/articles/${slug}`;
}

// A single focused story row (thumbnail + text).
function focusedRow(p, siteUrl) {
  const href = articleUrl(p.slug, siteUrl);
  const img = abs(p.image, siteUrl);
  return `
  <tr>
    <td style="padding:0 0 22px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="180" valign="top" style="padding-right:16px;">
            <a href="${esc(href)}" target="_blank"><img src="${esc(img)}" width="180" alt="" style="display:block;width:180px;height:auto;border-radius:2px;border:0;" /></a>
          </td>
          <td valign="top">
            <div style="font:600 11px/1.2 'Courier New',monospace;letter-spacing:.06em;text-transform:uppercase;color:${COBALT};margin:0 0 6px;">${esc(p.category)}</div>
            <a href="${esc(href)}" target="_blank" style="font:700 17px/1.25 Arial,Helvetica,sans-serif;color:${INK};text-decoration:none;">${esc(p.title)}</a>
            <div style="font:400 14px/1.5 Georgia,serif;color:${INK_SOFT};margin:8px 0 0;">${esc(p.take)}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function renderEmailHtml(issue, { siteUrl = "", webUrl = "" } = {}) {
  const logo = `${siteUrl}/uavhelpline-logo-white.png`;
  const lead = issue.lead;
  const leadImg = lead ? abs(lead.image, siteUrl) : "";
  const leadHref = lead ? articleUrl(lead.slug, siteUrl) : "#";

  const focusedHtml = (issue.focused || []).map((p) => focusedRow(p, siteUrl)).join("");
  const roundupHtml = (issue.roundup || [])
    .map(
      (p) => `
      <tr><td style="padding:9px 0;border-top:1px solid ${LINE};">
        <a href="${esc(articleUrl(p.slug, siteUrl))}" target="_blank" style="font:600 15px/1.35 Arial,Helvetica,sans-serif;color:${INK};text-decoration:none;">${esc(p.title)}</a>
        <span style="font:400 11px/1.2 'Courier New',monospace;text-transform:uppercase;letter-spacing:.05em;color:${INK_SOFT};"> &nbsp;·&nbsp; ${esc(p.category)}</span>
      </td></tr>`
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(issue.subject)}</title></head>
<body style="margin:0;padding:0;background:#f2f3f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f3f5;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:4px;overflow:hidden;">
    <!-- masthead -->
    <tr><td style="background:${COBALT};padding:22px 28px;" align="center">
      <img src="${esc(logo)}" height="30" alt="UAVHelpline" style="display:block;height:30px;border:0;">
    </td></tr>
    <tr><td style="height:4px;background:${MIDNIGHT};font-size:0;line-height:0;">&nbsp;</td></tr>

    <tr><td style="padding:28px 28px 6px;">
      <div style="font:600 12px/1.3 'Courier New',monospace;letter-spacing:.08em;text-transform:uppercase;color:${COBALT};">UAVHelpline Weekly</div>
      <div style="font:400 15px/1.6 Georgia,serif;color:${INK_SOFT};margin:12px 0 0;">${esc(issue.intro)}</div>
    </td></tr>

    ${
      lead
        ? `<!-- lead -->
    <tr><td style="padding:22px 28px 8px;">
      <a href="${esc(leadHref)}" target="_blank"><img src="${esc(leadImg)}" width="544" alt="" style="display:block;width:100%;height:auto;border-radius:3px;border:0;"></a>
      <div style="font:600 11px/1.2 'Courier New',monospace;letter-spacing:.06em;text-transform:uppercase;color:${COBALT};margin:16px 0 6px;">${esc(lead.category)}</div>
      <a href="${esc(leadHref)}" target="_blank" style="font:800 25px/1.2 Arial,Helvetica,sans-serif;color:${INK};text-decoration:none;letter-spacing:-.01em;">${esc(lead.title)}</a>
      <div style="font:400 16px/1.55 Georgia,serif;color:${INK};margin:12px 0 0;">${esc(lead.take)}</div>
      <div style="margin:14px 0 0;"><a href="${esc(leadHref)}" target="_blank" style="font:600 12px/1 'Courier New',monospace;letter-spacing:.08em;text-transform:uppercase;color:#ffffff;background:${COBALT};padding:11px 20px;border-radius:3px;text-decoration:none;display:inline-block;">Read the story</a></div>
    </td></tr>`
        : ""
    }

    ${
      focusedHtml
        ? `<!-- focused -->
    <tr><td style="padding:26px 28px 0;">
      <div style="font:700 13px/1 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.06em;color:${INK};border-bottom:2px solid ${COBALT};padding-bottom:10px;margin-bottom:20px;">In focus</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${focusedHtml}</table>
    </td></tr>`
        : ""
    }

    ${
      roundupHtml
        ? `<!-- roundup -->
    <tr><td style="padding:8px 28px 4px;">
      <div style="font:700 13px/1 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.06em;color:${INK};border-bottom:2px solid ${COBALT};padding-bottom:10px;margin-bottom:8px;">The rest of the week</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${roundupHtml}</table>
    </td></tr>`
        : ""
    }

    <!-- footer -->
    <tr><td style="padding:28px;background:${COBALT};" align="center">
      <img src="${esc(logo)}" height="22" alt="UAVHelpline" style="display:block;height:22px;border:0;margin:0 auto 12px;">
      <div style="font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#dfe3ff;">Independent, evidence-first intelligence on the global drone industry.</div>
      <div style="font:400 12px/1.8 Arial,Helvetica,sans-serif;color:#dfe3ff;margin-top:10px;">
        ${webUrl ? `<a href="${esc(webUrl)}" target="_blank" style="color:#ffffff;text-decoration:underline;">View in browser</a> &nbsp;·&nbsp; ` : ""}
        <a href="{{ unsubscribe }}" style="color:#ffffff;text-decoration:underline;">Unsubscribe</a>
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export function renderEmailText(issue, { siteUrl = "" } = {}) {
  const lines = ["UAVHELPLINE WEEKLY", "", issue.intro, ""];
  if (issue.lead) {
    lines.push(`LEAD: ${issue.lead.title}`, issue.lead.take, `${siteUrl}/articles/${issue.lead.slug}`, "");
  }
  if ((issue.focused || []).length) {
    lines.push("IN FOCUS");
    for (const p of issue.focused) lines.push(`- ${p.title} — ${p.take}  ${siteUrl}/articles/${p.slug}`);
    lines.push("");
  }
  if ((issue.roundup || []).length) {
    lines.push("THE REST OF THE WEEK");
    for (const p of issue.roundup) lines.push(`- ${p.title}  ${siteUrl}/articles/${p.slug}`);
  }
  return lines.join("\n");
}

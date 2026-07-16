// Minimal Brevo client — create an email campaign as a DRAFT (not sent).
// The owner reviews and sends it from the Brevo dashboard.
const BREVO_CAMPAIGNS = "https://api.brevo.com/v3/emailCampaigns";

export async function createDraftCampaign(
  { name, subject, html, sender, listId, apiKey },
  { fetchImpl = fetch } = {}
) {
  if (!apiKey) throw new Error("BREVO_API_KEY not set");
  if (!sender?.email) throw new Error("sender email not set");
  if (!listId) throw new Error("BREVO_LIST_ID not set");

  const res = await fetchImpl(BREVO_CAMPAIGNS, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      name,
      subject,
      sender: { name: sender.name || "UAVHelpline", email: sender.email },
      htmlContent: html,
      recipients: { listIds: [Number(listId)] },
      // No scheduledAt / no send call → stays a draft.
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Developer-facing detail to logs; caller decides how to surface it.
    throw new Error(`Brevo ${res.status} ${data?.code || ""}: ${data?.message || ""}`.trim());
  }
  return { id: data.id };
}

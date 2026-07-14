import SetHeaderMeta from "../../components/SetHeaderMeta";
import SharePage from "../../components/SharePage";

export const metadata = {
  title: "Privacy Policy — UAVHelpline",
  description: "How UAVHelpline handles analytics, newsletter sign-ups, and your data.",
};

const UPDATED = "June 29, 2026";

export default function PrivacyPage() {
  return (
    <div className="section-page">
      <SetHeaderMeta section="Privacy Policy" sectionHref="/privacy" />
      <div className="section-layout">
        <aside className="section-aside">
          <h1>Privacy Policy</h1>
          <p>How we handle analytics, newsletter sign-ups, and your data.</p>
          <SharePage title="UAVHelpline Privacy Policy" />
        </aside>

        <div className="section-main">
          <div className="prose">
            <p>
              <em>Last updated: {UPDATED}</em>
            </p>
            <p>
              UAVHelpline ("we", "us") is an independent UAV and drone news
              platform. This policy explains what we collect when you visit the
              site, why, and the choices you have. We aim to collect as little as
              possible and we never sell your data.
            </p>

            <h2>Information we collect</h2>
            <p>
              <strong>Usage &amp; analytics.</strong> Like most websites, we
              collect anonymous or pseudonymous usage data — pages viewed,
              referrer, approximate location (derived from IP, not stored as a
              precise address), device type, and browser. This helps us
              understand what readers find useful.
            </p>
            <p>
              <strong>Newsletter.</strong> If you subscribe, we collect the email
              address you provide so we can send you the newsletter. You can
              unsubscribe at any time using the link in every email.
            </p>
            <p>
              <strong>Editorial accounts.</strong> The private editor area is for
              our team only and is protected by authenticated logins. It does not
              apply to ordinary visitors.
            </p>
            <p>
              We do not knowingly collect names, payment details, or sensitive
              personal information from readers, and the site has no public
              comments or user accounts.
            </p>

            <h2>How we use it</h2>
            <p>
              To operate and improve the site, measure which coverage resonates,
              keep the service secure and reliable, and — only if you opt in —
              send you the newsletter.
            </p>

            <h2>Cookies &amp; analytics</h2>
            <p>
              We use <strong>Vercel Web Analytics</strong> (privacy-friendly,
              aggregate traffic measurement) and <strong>Google Analytics</strong>,
              which may set cookies or similar identifiers to measure usage. You
              can block cookies in your browser settings or use a tracker-blocking
              extension without losing access to any content.
            </p>

            <h2>Third-party services</h2>
            <p>
              We rely on a few processors who handle data on our behalf under
              their own privacy terms: <strong>Vercel</strong> (hosting and
              analytics), <strong>Google Analytics</strong> (usage measurement),
              <strong> Brevo</strong> (newsletter email delivery), and{" "}
              <strong>Supabase</strong> (our content database). Outbound links to
              other sites are governed by those sites' own policies.
            </p>

            <h2>Data retention</h2>
            <p>
              Analytics data is retained in aggregate by our providers per their
              defaults. Newsletter emails are kept until you unsubscribe or ask us
              to remove them.
            </p>

            <h2>Your choices</h2>
            <p>
              You can unsubscribe from the newsletter at any time, block cookies
              in your browser, and request that we delete any email address you've
              given us. Depending on where you live, you may have additional
              rights to access or erase your data — contact us and we'll help.
            </p>

            <h2>Children</h2>
            <p>
              The site is intended for a general, professional audience and is not
              directed at children under 13.
            </p>

            <h2>Changes</h2>
            <p>
              We may update this policy as the site evolves; we'll revise the date
              above when we do.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about this policy or your data? Email us at{" "}
              <a href="mailto:info.uavhelpline@gmail.com">info.uavhelpline@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

function Icon({ label, path }) {
  return (
    <a className="f-social__link" href="#" aria-label={label}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {path}
      </svg>
    </a>
  );
}

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container f-inner">
        <Link href="/" className="f-mark" aria-label="UAVHelpline home">
          uãvhëlplíne
        </Link>

        <div className="f-social" aria-label="Social media">
          <Icon
            label="LinkedIn"
            path={<path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18.34V10.4H5.67v7.94h2.67zM7 9.24a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zm11.34 9.1v-4.36c0-2.33-1.24-3.41-2.9-3.41a2.5 2.5 0 0 0-2.27 1.25v-1.07h-2.67c.04.75 0 7.94 0 7.94h2.67v-4.43c0-.24.02-.48.09-.65.19-.48.62-.97 1.35-.97.96 0 1.34.72 1.34 1.78v4.27h2.67z" />}
          />
          <Icon
            label="X"
            path={<path d="M18.9 2.5h3.3l-7.2 8.2 8.5 11.3h-6.7l-5.2-6.9-6 6.9H1.5l7.7-8.8L1 2.5h6.9l4.7 6.3 6.3-6.3zm-1.2 17.6h1.8L7.4 4.3H5.5l12.2 15.8z" />}
          />
          <Icon
            label="Instagram"
            path={<path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5 0-4.74.07-.9.04-1.38.19-1.7.32-.43.16-.74.36-1.06.68-.32.32-.52.63-.68 1.06-.13.32-.28.8-.32 1.7C3.43 8.5 3.42 8.85 3.42 12s0 3.5.08 4.74c.04.9.19 1.38.32 1.7.16.43.36.74.68 1.06.32.32.63.52 1.06.68.32.13.8.28 1.7.32 1.24.07 1.59.08 4.74.08s3.5 0 4.74-.08c.9-.04 1.38-.19 1.7-.32.43-.16.74-.36 1.06-.68.32-.32.52-.63.68-1.06.13-.32.28-.8.32-1.7.07-1.24.08-1.59.08-4.74s0-3.5-.08-4.74c-.04-.9-.19-1.38-.32-1.7a2.85 2.85 0 0 0-.68-1.06 2.85 2.85 0 0 0-1.06-.68c-.32-.13-.8-.28-1.7-.32C15.5 4 15.15 4 12 4zm0 3.06a4.94 4.94 0 1 1 0 9.88 4.94 4.94 0 0 1 0-9.88zm0 8.15a3.21 3.21 0 1 0 0-6.42 3.21 3.21 0 0 0 0 6.42zm6.3-8.35a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z" />}
          />
          <Icon
            label="RSS"
            path={<path d="M5 3c9.4 0 16 6.6 16 16h-3C18 11.3 12.7 6 5 6V3zm0 6c5.5 0 10 4.5 10 10h-3c0-3.9-3.1-7-7-7V9zm1.5 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" />}
          />
          <Icon
            label="YouTube"
            path={<path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.77-1.77C19.33 5.13 12 5.13 12 5.13s-7.33 0-8.83.4A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.77 1.77c1.5.4 8.83.4 8.83.4s7.33 0 8.83-.4a2.5 2.5 0 0 0 1.77-1.77C23 15.2 23 12 23 12zM9.75 15.02V8.98L15 12l-5.25 3.02z" />}
          />
        </div>

        <nav className="f-nav" aria-label="Footer">
          <Link href="/section/database">About</Link>
          <Link href="#">Privacy Policy</Link>
          <Link href="/section/news">Sections</Link>
          <Link href="#newsletter">Newsletter</Link>
          <Link href="#newsletter">Become a member</Link>
          <Link href="#">Contact</Link>
        </nav>

        <p className="f-tagline">
          Independent, evidence-first intelligence on the global drone industry —
          technology, engineering, and regulation, never politics.
        </p>

        <div className="f-copy">© {year} UAVHelpline</div>
      </div>
    </footer>
  );
}

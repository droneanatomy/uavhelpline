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
          <img src="/uavhelpline-logo-white.png" alt="UAVHelpline" />
        </Link>

        <nav className="f-nav" aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/section/news">Sections</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/newsletter">Newsletter</Link>
          {/* <Link href="#newsletter">Become a member</Link>  */}
          <a href="mailto:contact@uavhelpline.com">Contact</a>
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

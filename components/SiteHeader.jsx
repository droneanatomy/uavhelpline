import Link from "next/link";
import { CATEGORIES } from "../lib/categories";

const label = (slug) => CATEGORIES.find((c) => c.slug === slug)?.label || slug;
const LEFT_BEATS = ["defence-tech", "commercial-drones"];
const RIGHT_BEATS = ["ai-autonomy", "regulations"];
const ALL_BEATS = [...LEFT_BEATS, ...RIGHT_BEATS];

function Beats({ side, beats }) {
  return (
    <nav className={`masthead-categories ${side}`} aria-label="categories and beats">
      <ul className="masthead-categories__links">
        {beats.map((slug) => (
          <li className="menu__item" key={slug}>
            <Link href={`/section/${slug}`}>{label(slug)}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function SiteHeader() {
  return (
    <header className="masthead">
      <div className="masthead-content">
        <ul className="masthead-links">
          <li><Link href="/section/database">About</Link></li>
          <li><Link href="/section/news">Latest</Link></li>
          <li><Link href="/articles/weekly-digest-2026-06-05">Newsletter</Link></li>
        </ul>

        <div className="masthead-branding">
          <Link href="/" className="masthead-branding__logo" aria-label="UAVHelpline home">
            uãvhëlplíne
          </Link>
        </div>

        <div className="masthead-navigation">
          <div className="masthead-navigation__cta">
            <Link href="/admin" className="button">
              <span>Sign In</span>
            </Link>
          </div>
          <button className="search-icon" aria-label="Search" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          {/* <button className="masthead-navigation__open" aria-label="Toggle menu" type="button" aria-expanded="false">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button> */}
        </div>
      </div>

      <Beats side="mobile" beats={ALL_BEATS} />
      <Beats side="left" beats={LEFT_BEATS} />
      <Beats side="right" beats={RIGHT_BEATS} />
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES } from "../lib/categories";
import { useHeaderMeta } from "./HeaderMeta";
import ReadingProgress from "./ReadingProgress";
import SearchBox from "./SearchBox";

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

function Logo() {
  return (
    <div className="masthead-branding">
      <Link href="/" className="masthead-branding__logo" aria-label="UAVHelpline home">
        <img src="/uavhelpline-logo.png" alt="UAVHelpline" />
      </Link>
    </div>
  );
}

function Nav() {
  return (
    <div className="masthead-navigation">
      <div className="masthead-navigation__cta">
        <Link href="/newsletter" className="button">
          <span>Sign In</span>
        </Link>
      </div>
      <SearchBox />
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const { meta } = useHeaderMeta();
  const isHome = pathname === "/";
  const isArticle = Boolean(pathname && pathname.startsWith("/articles/"));

  // On article pages, swap the eyebrow from section → headline once the title
  // has scrolled out of view (RoW behavior).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 220);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  // Home keeps the full centered masthead with category beats.
  if (isHome) {
    return (
      <header className="masthead">
        <div className="masthead-content">
          <ul className="masthead-links">
            <li><Link href="/about">About</Link></li>
            <li><Link href="/section/news">Latest</Link></li>
            <li><Link href="/newsletter">Newsletter</Link></li>
          </ul>
          <Logo />
          <Nav />
        </div>
        <Beats side="mobile" beats={ALL_BEATS} />
        <Beats side="left" beats={LEFT_BEATS} />
        <Beats side="right" beats={RIGHT_BEATS} />
      </header>
    );
  }

  // Non-home: compact sticky header — logo left, eyebrow center, nav right.
  const section = meta?.section;
  const sectionHref = meta?.sectionHref;
  const headline = meta?.headline;
  const showHeadline = isArticle && scrolled && Boolean(headline);

  return (
    <>
      {isArticle && <ReadingProgress />}
      <header className="masthead masthead--article">
        <div className="masthead-content">
          <Logo />
          <div className="masthead-eyebrow">
            {section &&
              (sectionHref ? (
                <Link className="eyebrow-section" href={sectionHref}>{section}</Link>
              ) : (
                <span className="eyebrow-section">{section}</span>
              ))}
            {showHeadline && (
              <>
                <span className="eyebrow-sep" aria-hidden="true">/</span>
                <span className="eyebrow-headline">{headline}</span>
              </>
            )}
          </div>
          <Nav />
        </div>
      </header>
    </>
  );
}

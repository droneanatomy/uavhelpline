import Link from "next/link";
import { getPublished } from "../lib/content";
import { categoryLabel, categoryColor, CATEGORIES } from "../lib/categories";
import ArticleCard from "../components/ArticleCard";
import NewsletterSignup from "../components/NewsletterSignup";
import MemberCard from "../components/MemberCard";

// Regenerate at most once per minute so newly published posts appear live.
export const revalidate = 60;

export default async function HomePage() {
  const all = await getPublished();
  const digest = all.find((p) => p.tags?.includes("digest")) || null;
  const pool = all.filter((p) => p.slug !== digest?.slug);

  const lead = pool[0];
  const secondary = pool[1];
  const tertiary = pool[2];
  const belowLead = pool.slice(3, 5);
  const latest = pool.slice(5, 11);

  // Collection rows by beat (only rows that have stories)
  const rows = ["defence-tech", "commercial-drones", "ai-autonomy", "regulations"]
    .map((slug) => ({
      cat: CATEGORIES.find((c) => c.slug === slug),
      posts: all.filter((p) => p.category === slug).slice(0, 3),
    }))
    .filter((r) => r.posts.length > 0);

  return (
    <div className="container">
      {lead && (
        <section className="home-top">
          {/* Left rail — Latest Stories */}
          <aside className="latest">
            <h2>Latest Stories</h2>
            {latest.map((p) => (
              <div className="latest-item" key={p.slug}>
                <Link href={`/articles/${p.slug}`}>{p.title}</Link>
              </div>
            ))}
            <Link href="/section/news" className="more">
              Explore latest →
            </Link>
          </aside>

          {/* Center — lead story */}
          <div className="feature-lead">
            <Link href={`/articles/${lead.slug}`}>
              <img src={lead.image} alt={lead.title} />
            </Link>
            <Link
              href={`/section/${lead.category}`}
              className="kick"
              style={{ color: categoryColor(lead.category) }}
            >
              {categoryLabel(lead.category)}
            </Link>
            <h1>
              <Link href={`/articles/${lead.slug}`}>{lead.title}</Link>
            </h1>
            <p className="dek">{lead.tldr || lead.metaDescription}</p>
            <div className="by">
              By {lead.author} · {lead.minutesRead} min read
            </div>

            {belowLead.length > 0 && (
              <div className="lead-more">
                {belowLead.map((p) => (
                  <ArticleCard key={p.slug} post={p} />
                ))}
              </div>
            )}
          </div>

          {/* Right rail — secondary story + newsletter */}
          <aside className="home-right">
            {secondary && (
              <div className="side-story">
                <Link href={`/articles/${secondary.slug}`}>
                  <img src={secondary.image} alt={secondary.title} />
                </Link>
                <Link
                  href={`/section/${secondary.category}`}
                  className="kick"
                  style={{ color: categoryColor(secondary.category) }}
                >
                  {categoryLabel(secondary.category)}
                </Link>
                <h3>
                  <Link href={`/articles/${secondary.slug}`}>{secondary.title}</Link>
                </h3>
              </div>
            )}
            {tertiary && (
              <div className="side-story">
                <Link href={`/articles/${tertiary.slug}`}>
                  <img src={tertiary.image} alt={tertiary.title} />
                </Link>
                <Link
                  href={`/section/${tertiary.category}`}
                  className="kick"
                  style={{ color: categoryColor(tertiary.category) }}
                >
                  {categoryLabel(tertiary.category)}
                </Link>
                <h3>
                  <Link href={`/articles/${tertiary.slug}`}>{tertiary.title}</Link>
                </h3>
              </div>
            )}
            <MemberCard />
          </aside>
        </section>
      )}
      
      <NewsletterSignup />

      {rows.map((row) => (
        <section className="crow" key={row.cat.slug}>
          <div className="crow-head">
            <h2>
              <Link href={`/section/${row.cat.slug}`}>
                {row.cat.label} <span className="arrow">›</span>
              </Link>
            </h2>
          </div>
          <div className="crow-cards">
            {row.posts.map((p) => (
              <ArticleCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      ))}

      {digest && (
        <section className="crow">
          <div className="crow-head">
            <h2>
              <Link href={`/articles/${digest.slug}`}>
                Weekly Digest <span className="arrow">›</span>
              </Link>
            </h2>
            <span className="sub">The week's developments, distilled</span>
          </div>
          <div className="crow-cards">
            <ArticleCard post={digest} />
          </div>
        </section>
      )}
    </div>
  );
}

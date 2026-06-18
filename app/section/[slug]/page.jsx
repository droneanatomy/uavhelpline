import Link from "next/link";
import { notFound } from "next/navigation";
import { getByCategory } from "../../../lib/content";
import { CATEGORIES, categoryLabel, categoryColor } from "../../../lib/categories";
import ArticleCard from "../../../components/ArticleCard";

// Regenerate at most once per minute so newly published posts appear live.
export const revalidate = 60;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }) {
  const cat = CATEGORIES.find((c) => c.slug === params.slug);
  return { title: cat ? `${cat.label} — UAVHelpline` : "UAVHelpline" };
}

export default async function SectionPage({ params }) {
  const cat = CATEGORIES.find((c) => c.slug === params.slug);
  if (!cat) return notFound();

  if (cat.slug === "database") {
    return (
      <div className="container">
        <div className="page-head">
          <div className="eyebrow">Reference</div>
          <h1>{cat.label}</h1>
          <p>{cat.blurb}</p>
        </div>
        <p className="empty">
          The structured database of UAVs, manufacturers, components, and
          certifications is built up automatically from published coverage.
          Entries will appear here as the library grows.
        </p>
      </div>
    );
  }

  const posts = await getByCategory(cat.slug);
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="container">
      <div className="page-head">
        <div className="eyebrow">Section</div>
        <h1>{cat.label}</h1>
        <p>{cat.blurb}</p>
      </div>

      {posts.length === 0 ? (
        <p className="empty">No published articles in this section yet.</p>
      ) : (
        <>
          {featured && (
            <section className="sec-lead">
              <Link href={`/articles/${featured.slug}`}>
                <img src={featured.image} alt={featured.title} />
              </Link>
              <div>
                <span className="kick" style={{ color: categoryColor(featured.category) }}>
                  {categoryLabel(featured.category)}
                </span>
                <h2>
                  <Link href={`/articles/${featured.slug}`}>{featured.title}</Link>
                </h2>
                <p className="dek">{featured.tldr || featured.metaDescription}</p>
                <div className="by">
                  By {featured.author} · {featured.minutesRead} min read
                </div>
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <div className="grid" style={{ marginTop: 28 }}>
              {rest.map((p) => (
                <ArticleCard key={p.slug} post={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { getPublished, getBySlug, getByCategory } from "../../../lib/content";
import { categoryLabel, categoryColor } from "../../../lib/categories";

// Regenerate at most once per minute so newly published posts appear live.
export const revalidate = 60;

export async function generateStaticParams() {
  return (await getPublished()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const post = await getBySlug(params.slug);
  if (!post) return { title: "Not found — UAVHelpline" };
  return {
    title: `${post.title} — UAVHelpline`,
    description: post.metaDescription,
  };
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

export default async function ArticlePage({ params, searchParams }) {
  const post = await getBySlug(params.slug);
  const isPreview = searchParams?.preview === "1";
  if (!post) return notFound();
  if (post.status !== "published" && !isPreview) return notFound();

  const html = marked.parse(post.body || "");
  const related = (await getByCategory(post.category))
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  return (
    <article className="container article">
      {post.status !== "published" && (
        <div className="safety-flag" style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" }}>
          Draft preview — not yet published.
        </div>
      )}

      <Link
        href={`/section/${post.category}`}
        className="cat"
        style={{ color: categoryColor(post.category) }}
      >
        {categoryLabel(post.category)}
      </Link>
      <h1>{post.title}</h1>
      <p className="art-dek">{post.metaDescription}</p>
      <div className="byline">
        By <span className="author">{post.author}</span> · {fmtDate(post.date)} · {post.minutesRead} min read
      </div>

      {post.image && (
        <>
          <img className="hero" src={post.image} alt={post.title} />
        </>
      )}

      {post.tldr && (
        <div className="tldr">
          {post.tldr}
        </div>
      )}

      {post.safetyReview && (
        <div className="safety-flag">
          Portions of source material were summarized at a high level and
          redacted in line with UAVHelpline's safety policy.
        </div>
      )}

      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

      {post.tags && post.tags.length > 0 && (
        <div className="tags">
          {post.tags.map((t) => (
            <span key={t} className="tag-chip">#{t}</span>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <div className="related">
          <h3>Read next</h3>
          <div className="related-list">
            {related.map((p) => (
              <div className="related-item" key={p.slug}>
                <Link
                  href={`/section/${p.category}`}
                  className="kick"
                  style={{ color: categoryColor(p.category) }}
                >
                  {categoryLabel(p.category)}
                </Link>
                <h4>
                  <Link href={`/articles/${p.slug}`}>{p.title}</Link>
                </h4>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

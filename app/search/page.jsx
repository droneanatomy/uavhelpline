import { searchPosts } from "../../lib/content";
import ArticleCard from "../../components/ArticleCard";
import SetHeaderMeta from "../../components/SetHeaderMeta";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search — UAVHelpline",
  description: "Search UAVHelpline's drone and UAV coverage.",
};

export default async function SearchPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();
  const results = q ? await searchPosts(q) : [];

  return (
    <div className="container search-page">
      <SetHeaderMeta section="Search" />
      <div className="page-head">
        <h1>Search</h1>
        <form className="search-page__form" role="search" action="/search" method="get">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search articles, topics, manufacturers…"
            aria-label="Search articles"
            autoFocus
          />
          <button type="submit">Search</button>
        </form>
      </div>

      {q && (
        <p className="search-count">
          {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
        </p>
      )}

      {q && results.length > 0 ? (
        <div className="crow-cards search-results">
          {results.map((p) => (
            <ArticleCard key={p.slug} post={p} />
          ))}
        </div>
      ) : q ? (
        <p className="empty">No articles match &ldquo;{q}&rdquo;. Try a broader term.</p>
      ) : (
        <p className="empty">Type a query above to search the archive.</p>
      )}
    </div>
  );
}

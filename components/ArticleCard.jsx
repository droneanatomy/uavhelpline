import Link from "next/link";
import { categoryLabel, categoryColor } from "../lib/categories";

export default function ArticleCard({ post }) {
  return (
    <article className="card">
      <Link href={`/articles/${post.slug}`}>
        <img src={post.image} alt={post.title} />
      </Link>
      <Link
        href={`/section/${post.category}`}
        className="kick"
        style={{ color: categoryColor(post.category) }}
      >
        {categoryLabel(post.category)}
      </Link>
      <h3>
        <Link href={`/articles/${post.slug}`}>{post.title}</Link>
      </h3>
      {/* <p className="dek">{post.tldr || post.metaDescription}</p> */}
      <div className="by">
        By {post.author} · {post.minutesRead} min read
      </div>
    </article>
  );
}

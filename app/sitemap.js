import { getPublished } from "../lib/content";
import { CATEGORIES } from "../lib/categories";
import { SITE_URL } from "../lib/site";

export const revalidate = 3600;

export default async function sitemap() {
  let posts = [];
  try {
    posts = await getPublished();
  } catch {
    posts = [];
  }
  const sections = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/section/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));
  const articles = posts.map((p) => ({
    url: `${SITE_URL}/articles/${p.slug}`,
    lastModified: p.date ? new Date(p.date) : undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    ...sections,
    ...articles,
  ];
}

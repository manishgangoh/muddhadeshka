import { query } from "@/lib/db";
import { getConfig } from "@/lib/news";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app";

// Cache the sitemap and rebuild it hourly so Googlebot gets a fast response
// (a fresh 5000-row DB query on every fetch was too slow → "could not be read").
export const revalidate = 3600;

export default async function sitemap() {
  const cfg = getConfig();

  const categories = cfg.categories.map((c) => ({
    url: `${SITE}/${c.slug}`,
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  let articles = [];
  try {
    const rows = await query(
      `select slug, coalesce(ai_at, published_at, created_at) as lm
       from articles order by published_at desc nulls last limit 5000`
    );
    articles = rows.map((r) => ({
      url: `${SITE}/khabar/${r.slug}`,
      lastModified: r.lm ? new Date(r.lm) : undefined,
      changeFrequency: "daily",
      priority: 0.7,
    }));
  } catch {
    // DB unavailable → still return home + categories
  }

  return [
    { url: SITE, changeFrequency: "hourly", priority: 1 },
    ...categories,
    ...articles,
  ];
}

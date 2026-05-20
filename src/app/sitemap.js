import { query } from "@/lib/db";
import { getConfig } from "@/lib/news";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app";

export const dynamic = "force-dynamic";

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

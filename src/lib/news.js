import { unstable_cache } from "next/cache";
import { fetchMany } from "./rss.js";
import { getConfig, logoExists, SUPPORTED_LANGS, normalizeLang, feedDefsForLang, dedupe, timeAgoHi } from "./feeds.js";
import { getArticles, getArticleBySlug } from "./db.js";

// Re-export shared helpers so existing imports from "@/lib/news" keep working
export { getConfig, logoExists, SUPPORTED_LANGS, normalizeLang, dedupe, timeAgoHi, getArticleBySlug };

const REVALIDATE = 45; // serve DB reads from cache for ~45s so fresh news shows quickly

// DB row -> the item shape used by the UI (Card/Tag/etc.)
function dbToItem(row) {
  return {
    guid: row.guid,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    link: row.source_url,
    image: row.image,
    source: row.source_name,
    category: row.category,
    lang: row.lang,
    type: row.type,
    publishedAt: row.published_at,
  };
}

// Live RSS fallback (used when DB has no rows for a language yet, e.g. regional langs)
async function liveNews(lang) {
  const cfg = getConfig();
  const { items } = await fetchMany(feedDefsForLang(cfg, lang));
  return dedupe(items);
}

const cachedNews = unstable_cache(
  async (lang) => {
    const rows = await getArticles({ lang, limit: 120 });
    if (rows.length > 0) return rows.map(dbToItem);
    return liveNews(lang); // fallback for languages not yet in DB
  },
  ["news-by-lang-v2"],
  { revalidate: REVALIDATE }
);

const cachedCategory = unstable_cache(
  async (category, lang) => {
    const rows = await getArticles({ lang, category, limit: 60 });
    if (rows.length > 0) return rows.map(dbToItem);
    // fallback: filter live items by category
    const live = await liveNews(lang);
    return live.filter((it) => it.category === category);
  },
  ["news-by-cat-v2"],
  { revalidate: REVALIDATE }
);

export async function getHomepageNews(lang = "hi") {
  return cachedNews(normalizeLang(lang));
}

export async function getCategoryNews(category, lang = "hi") {
  const cfg = getConfig();
  const cat = cfg.categories.find((c) => c.slug === category);
  if (!cat) return null;
  const items = await cachedCategory(category, normalizeLang(lang));
  return { category: cat, items };
}

export async function getHomepageSections(lang = "hi") {
  const unique = dedupe(await getHomepageNews(lang));

  const withImg = unique.filter((it) => it.image);
  const lead = withImg[0] || unique[0];
  const sideStories = unique.filter((it) => it !== lead).slice(0, 4);

  const used = new Set([lead, ...sideStories]);
  const cats = ["rajniti", "desh", "khel", "manoranjan", "business"];
  const byCategory = cats
    .map((slug) => ({
      slug,
      items: unique.filter((it) => it.category === slug && !used.has(it)).slice(0, 4),
    }))
    .filter((s) => s.items.length > 0);

  return { lead, sideStories, byCategory, total: unique.length };
}

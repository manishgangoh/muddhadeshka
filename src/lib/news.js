import { unstable_cache } from "next/cache";
import { fetchMany, googleNewsSearchUrl } from "./rss.js";
import { getConfig, logoExists, SUPPORTED_LANGS, normalizeLang, feedDefsForLang, dedupe, timeAgoHi } from "./feeds.js";
import { getArticles, getArticleBySlug, upsertArticles, slugFor } from "./db.js";
import { findCity, findState } from "./locations.js";

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

// --- Hyperlocal: city & state news (via Google News search, stored so /khabar works) ---

async function fetchLocationNews(query, lang, tag) {
  const { items } = await fetchMany([
    { url: googleNewsSearchUrl(query, lang), source: "Google News", lang, category: "desh", type: "article" },
  ]);
  const unique = dedupe(items).map((it) => ({ ...it, ...tag, slug: slugFor(it.title, it.guid || it.link) }));
  try {
    await upsertArticles(unique);
  } catch {
    // storing is best-effort; page still renders from the returned items
  }
  return unique;
}

const cachedCityNews = unstable_cache(
  (slug, name, stateSlug, lang) =>
    fetchLocationNews(`${name} ${lang === "hi" ? "समाचार" : "news"}`, lang, { city: slug, state: stateSlug }),
  ["city-news-v1"],
  { revalidate: 900 }
);

const cachedStateNews = unstable_cache(
  (slug, nameHi, lang) => fetchLocationNews(`${nameHi} ${lang === "hi" ? "समाचार" : "news"}`, lang, { state: slug }),
  ["state-news-v1"],
  { revalidate: 900 }
);

export async function getCityNews(slug, lang = "hi") {
  const city = findCity(slug);
  if (!city) return null;
  const items = await cachedCityNews(slug, city.name, city.stateSlug, normalizeLang(lang));
  return { city, items: items || [] };
}

export async function getStateNews(slug, lang = "hi") {
  const state = findState(slug);
  if (!state) return null;
  const items = await cachedStateNews(slug, state.name_hi, normalizeLang(lang));
  return { state, items: items || [] };
}

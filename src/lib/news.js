import { unstable_cache } from "next/cache";
import { fetchMany, googleNewsSearchUrl } from "./rss.js";
import { getConfig, logoExists, SUPPORTED_LANGS, normalizeLang, feedDefsForLang, dedupe, timeAgoHi } from "./feeds.js";
import { getArticles, getArticleBySlug, upsertArticles, slugFor } from "./db.js";
import { findCity, findState } from "./locations.js";
import { translateTitles } from "./ai.js";

// Replace item titles with Hinglish (batch AI, used for listing pages in Hinglish mode)
async function toHinglish(items) {
  if (!items.length) return items;
  const titles = await translateTitles(items.map((it) => it.title), "hinglish");
  return items.map((it, i) => ({ ...it, title: titles[i] || it.title }));
}

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
    const fetchLang = lang === "hinglish" ? "hi" : lang;
    const rows = await getArticles({ lang: fetchLang, limit: 120 });
    let items = rows.length > 0 ? rows.map(dbToItem) : await liveNews(fetchLang);
    if (lang === "hinglish") items = await toHinglish(items.slice(0, 60));
    return items;
  },
  ["news-by-lang-v3"],
  { revalidate: REVALIDATE }
);

const cachedCategory = unstable_cache(
  async (category, lang) => {
    const fetchLang = lang === "hinglish" ? "hi" : lang;
    const rows = await getArticles({ lang: fetchLang, category, limit: 60 });
    let items = rows.length > 0 ? rows.map(dbToItem) : (await liveNews(fetchLang)).filter((it) => it.category === category);
    if (lang === "hinglish") items = await toHinglish(items.slice(0, 40));
    return items;
  },
  ["news-by-cat-v3"],
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
  const searchLang = lang === "hinglish" ? "hi" : lang;
  const { items } = await fetchMany([
    { url: googleNewsSearchUrl(query, searchLang), source: "Google News", lang: searchLang, category: "desh", type: "article" },
  ]);
  let unique = dedupe(items).map((it) => ({ ...it, ...tag, slug: slugFor(it.title, it.guid || it.link) }));
  try {
    await upsertArticles(unique);
  } catch {
    // storing is best-effort; page still renders from the returned items
  }
  if (lang === "hinglish") unique = await toHinglish(unique.slice(0, 40));
  return unique;
}

// Hindi search term for hi/hinglish, English for en/others
const locQuery = (name, lang) => `${name} ${lang === "en" ? "news" : "समाचार"}`;

const cachedCityNews = unstable_cache(
  (slug, name, stateSlug, lang) => fetchLocationNews(locQuery(name, lang), lang, { city: slug, state: stateSlug }),
  ["city-news-v2"],
  { revalidate: 900 }
);

const cachedStateNews = unstable_cache(
  (slug, nameHi, lang) => fetchLocationNews(locQuery(nameHi, lang), lang, { state: slug }),
  ["state-news-v2"],
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

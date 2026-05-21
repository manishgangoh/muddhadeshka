import { unstable_cache } from "next/cache";
import { fetchMany, googleNewsSearchUrl } from "./rss.js";
import { getConfig, logoExists, SUPPORTED_LANGS, normalizeLang, feedDefsForLang, dedupe, timeAgoHi } from "./feeds.js";
import { getArticles, getArticleBySlug, upsertArticles, slugFor, query } from "./db.js";
import { findCity, findState } from "./locations.js";

// Self-healing refresh: if the newest article is >5 min old, fire a background
// refresh of the live site (works on traffic, independent of unreliable GitHub cron).
const _g = globalThis;
export async function selfRefresh() {
  try {
    const now = Date.now();
    if (_g._mdkLastTrig && now - _g._mdkLastTrig < 5 * 60 * 1000) return; // throttle per instance
    const rows = await query("select extract(epoch from (now() - max(created_at))) as age from articles");
    const ageSec = Number(rows[0]?.age ?? 999999);
    if (ageSec < 300) return; // fresh enough
    _g._mdkLastTrig = now;
    const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app";
    const secret = process.env.CRON_SECRET || "";
    // fire-and-trigger the dedicated refresh endpoint (runs independently, 60s budget)
    await fetch(`${SITE}/api/refresh?secret=${secret}`, { signal: AbortSignal.timeout(4000) }).catch(() => {});
  } catch {
    // never let this break a page render
  }
}

// Re-export shared helpers so existing imports from "@/lib/news" keep working
export { getConfig, logoExists, SUPPORTED_LANGS, normalizeLang, dedupe, timeAgoHi, getArticleBySlug };

const REVALIDATE = 45; // serve DB reads from cache for ~45s so fresh news shows quickly

// DB row -> the item shape used by the UI. In Hinglish mode use the pre-stored
// Hinglish title (generated in the background by the cron) — NO AI on page load.
function dbToItem(row, hinglish = false) {
  return {
    guid: row.guid,
    slug: row.slug,
    title: hinglish ? row.title_hinglish || row.title : row.title,
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
    const hinglish = lang === "hinglish";
    const fetchLang = hinglish ? "hi" : lang;
    const rows = await getArticles({ lang: fetchLang, limit: 120 });
    return rows.length > 0 ? rows.map((r) => dbToItem(r, hinglish)) : await liveNews(fetchLang);
  },
  ["news-by-lang-v4"],
  { revalidate: REVALIDATE }
);

const cachedCategory = unstable_cache(
  async (category, lang) => {
    const hinglish = lang === "hinglish";
    const fetchLang = hinglish ? "hi" : lang;
    const rows = await getArticles({ lang: fetchLang, category, limit: 60 });
    return rows.length > 0 ? rows.map((r) => dbToItem(r, hinglish)) : (await liveNews(fetchLang)).filter((it) => it.category === category);
  },
  ["news-by-cat-v4"],
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
  const unique = dedupe(items).map((it) => ({ ...it, ...tag, slug: slugFor(it.title, it.guid || it.link) }));
  try {
    await upsertArticles(unique);
  } catch {
    // storing is best-effort; page still renders from the returned items
  }
  // (No AI on load — city/state titles stay in Hindi even in Hinglish mode; fast.)
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

import { getConfig, feedDefsForLang, dedupe } from "./feeds.js";
import { fetchFeed } from "./rss.js";
import { upsertArticles, getArticlesNeedingHinglish, saveHinglishTitles, getArticlesNeedingImage, saveImages } from "./db.js";
import { categorize } from "./categorize.js";
import { translateTitles } from "./ai.js";
import { fetchOgImage } from "./extract.js";
import { refreshViral } from "./viral.js";

// Pre-fetch og:image for image-less articles (real URLs only) in the background
export async function backfillImages(limit = 12) {
  const rows = await getArticlesNeedingImage(limit);
  const pairs = [];
  for (const r of rows) {
    const img = await fetchOgImage(r.source_url);
    if (img) pairs.push({ id: r.id, image: img });
  }
  await saveImages(pairs);
  return pairs.length;
}

// Pre-generate Hinglish titles in the background so listing pages never run AI on load
export async function backfillHinglishTitles(limit = 60) {
  const rows = await getArticlesNeedingHinglish(limit);
  if (!rows.length) return 0;
  const titles = await translateTitles(rows.map((r) => r.title), "hinglish");
  const pairs = rows.map((r, i) => ({ id: r.id, title_hinglish: titles[i] || r.title }));
  await saveHinglishTitles(pairs);
  return pairs.length;
}

export async function refreshLang(lang) {
  const cfg = getConfig();
  const defs = feedDefsForLang(cfg, lang);

  const results = await Promise.all(
    defs.map(async (def) => {
      const { items } = await fetchFeed(def);
      // General feeds (NDTV Hindi / TV9 / News18) carry mixed news → auto-categorize.
      // Category-specific feeds (ABP sports etc.) keep their own category but still
      // get refined when a strong keyword match exists.
      for (const it of items) {
        // General feeds are mixed → classify by keywords (fallback "desh").
        // Category-specific feeds (ABP sports etc.) are trusted as-is.
        it.category = def.general ? categorize(it.title, it.summary) || "desh" : def.category;
      }
      return items;
    })
  );

  const unique = dedupe(results.flat());
  const inserted = await upsertArticles(unique);
  return { lang, fetched: unique.length, inserted };
}

// Fetch + store news for the given languages (default: Hindi + English publisher feeds)
export async function refreshAllNews(langs = ["hi", "en"]) {
  const results = [];
  for (const l of langs) results.push(await refreshLang(l));
  // background: pre-generate Hinglish titles + fetch missing images
  try { await backfillHinglishTitles(60); } catch { /* best-effort */ }
  try { await backfillImages(10); } catch { /* best-effort */ }
  // viral/trending: pull Google Trends + summarise a few topics (rest fill on later runs)
  try { await refreshViral(6); } catch { /* best-effort */ }
  return results;
}

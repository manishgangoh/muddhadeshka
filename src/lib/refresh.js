import { getConfig, feedDefsForLang, dedupe } from "./feeds.js";
import { fetchFeed } from "./rss.js";
import { upsertArticles, getArticlesNeedingHinglish, saveHinglishTitles } from "./db.js";
import { categorize } from "./categorize.js";
import { translateTitles } from "./ai.js";

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
  // background: pre-generate Hinglish titles for any new/untranslated articles
  try { await backfillHinglishTitles(60); } catch { /* best-effort */ }
  return results;
}

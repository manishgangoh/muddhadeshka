import { getArticleBySlug, saveArticleContent, getClusterCandidates, getArticlesNeedingContent } from "./db.js";
import { rewriteArticle } from "./ai.js";
import { extractFullText } from "./extract.js";
import { findSameStory } from "./cluster.js";

// Build the full ORIGINAL (multi-source merged) article and store it.
// Heavy: scrapes 1-3 source pages + runs the AI rewrite, so this must run in the
// background (after()) or a cron — never inline in the request that renders the page.
// Returns the updated fields, or null if nothing was produced.
export async function buildArticleContent(slugOrArticle) {
  const a = typeof slugOrArticle === "string" ? await getArticleBySlug(slugOrArticle) : slugOrArticle;
  if (!a || a.full_content) return null;

  const candidates = await getClusterCandidates({ lang: a.lang, excludeSlug: a.slug, sinceHours: 96, limit: 200 });
  const cluster = findSameStory(a, candidates, { max: 2 });

  // scrape full text of this article + matched outlets (in parallel)
  const toScrape = [{ name: a.source_name, url: a.source_url }, ...cluster.map((c) => ({ name: c.source_name, url: c.source_url }))];
  const scraped = await Promise.all(toScrape.map(async (s) => ({ name: s.name, text: await extractFullText(s.url) })));
  const sources = scraped.filter((s) => s.text);
  if (sources.length === 0 && a.summary) sources.push({ name: a.source_name, text: a.summary });

  const r = await rewriteArticle({ title: a.title, summary: a.summary, source: a.source_name, lang: a.lang, sources });
  if (!r.body) return null;

  await saveArticleContent(a.slug, {
    aiTitle: r.title, body: r.body, keyPoints: r.keyPoints,
    sources: r.mergedSources, metaTitle: r.metaTitle, metaDesc: r.metaDesc,
  });
  return {
    ai_title: r.title, full_content: r.body, key_points: r.keyPoints,
    ai_sources: r.mergedSources, meta_title: r.metaTitle, meta_desc: r.metaDesc,
  };
}

// Background pre-warm: generate full AI articles ahead of time so users open
// already-ready, instant stories. PRIORITY tiers (newest-first within each):
//   1. Brand-new (last 6h)   → the freshest news + homepage lead/side stories
//   2. Recent   (last 24h)   → rest of the homepage + category pages
// Older news (>24h) is intentionally skipped here — it is rarely opened and is
// generated lazily on first click instead, so the agent's whole time budget
// always goes to what users actually see. Time-budgeted so it never overruns
// the serverless function limit.
export async function prewarmArticles({ limit = 10, budgetMs = 50000 } = {}) {
  const start = Date.now();
  let generated = 0;
  for (const sinceHours of [6, 24]) {
    if (Date.now() - start > budgetMs || generated >= limit) break;
    const rows = await getArticlesNeedingContent({ limit: limit - generated, sinceHours });
    for (const a of rows) {
      if (Date.now() - start > budgetMs || generated >= limit) break;
      try { if (await buildArticleContent(a)) generated++; } catch { /* skip; next run retries */ }
    }
  }
  return { generated };
}

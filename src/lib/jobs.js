import Parser from "rss-parser";
import { unstable_cache } from "next/cache";
import { getConfig } from "./feeds.js";
import { pool, query } from "./db.js";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; MuddhadeshkaBot/1.0)" },
});

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

function parseJob(item, def) {
  let title = clean(item.title);
  let company = "";
  // WeWorkRemotely titles are "Company: Job Title"
  if (def.source === "WeWorkRemotely" && title.includes(":")) {
    const i = title.indexOf(":");
    company = title.slice(0, i).trim();
    title = title.slice(i + 1).trim();
  }
  const html = item["content:encoded"] || item.content || "";
  const text = `${title} ${html}`.toLowerCase();
  const location = /\bremote\b|work from home/.test(text) ? "Remote" : "";
  const imgM = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return {
    guid: item.guid || item.link,
    title,
    company,
    location,
    url: item.link,
    source: def.source,
    image: imgM ? imgM[1] : null,
    category: def.category,
    publishedAt: item.isoDate || item.pubDate || null,
  };
}

async function fetchFeed(def) {
  try {
    const f = await parser.parseURL(def.url);
    return (f.items || []).map((it) => parseJob(it, def));
  } catch {
    return [];
  }
}

async function upsertJobs(jobs) {
  const valid = jobs.filter((j) => j.guid && j.title && j.url);
  if (!valid.length) return;
  const cols = ["guid", "title", "company", "location", "url", "source", "image", "category", "published_at"];
  const rows = [], vals = [];
  let i = 1;
  for (const j of valid) {
    rows.push(`(${cols.map(() => `$${i++}`).join(",")})`);
    const d = j.publishedAt ? new Date(j.publishedAt) : null;
    vals.push(j.guid, j.title, j.company || null, j.location || null, j.url, j.source || null, j.image || null, j.category || null, d && !isNaN(d) ? d.toISOString() : null);
  }
  await pool.query(`insert into jobs (${cols.join(",")}) values ${rows.join(",")} on conflict (guid) do nothing`, vals);
}

const cachedJobs = unstable_cache(
  async (category) => {
    const cfg = getConfig();
    const feeds = cfg.jobFeeds.filter((f) => f.category === category);
    const lists = await Promise.all(feeds.map(fetchFeed));
    const seen = new Set();
    const jobs = lists.flat().filter((j) => { if (!j.url || seen.has(j.url)) return false; seen.add(j.url); return true; });
    jobs.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    try { await upsertJobs(jobs); } catch { /* best-effort */ }
    return jobs.slice(0, 60);
  },
  ["jobs-v1"],
  { revalidate: 1800 } // 30 min
);

export async function getJobs(category = "all") {
  const cfg = getConfig();
  const valid = cfg.jobCategories.some((c) => c.slug === category) ? category : "all";
  return { category: valid, jobs: await cachedJobs(valid) };
}

export function jobCategories() {
  return getConfig().jobCategories;
}

export function jobTimeAgo(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "आज";
  if (d === 1) return "कल";
  return `${d} दिन पहले`;
}

import Parser from "rss-parser";
import { unstable_cache } from "next/cache";
import { getConfig } from "./feeds.js";
import { googleNewsSearchUrl } from "./rss.js";
import { pool, query, slugFor } from "./db.js";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; MuddhadeshkaBot/1.0)" },
});

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const stripHtml = (s) => clean((s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&"));

function parseJob(item, source, jobType) {
  let title = clean(item.title);
  let company = "";
  if (source === "WeWorkRemotely" && title.includes(":")) {
    const i = title.indexOf(":");
    company = title.slice(0, i).trim();
    title = title.slice(i + 1).trim();
  }
  const html = item["content:encoded"] || item.content || "";
  const text = `${title} ${html}`.toLowerCase();
  const location = jobType === "government" ? "भारत" : (/\bremote\b|work from home/.test(text) ? "Remote" : "");
  const imgM = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const guid = item.guid || item.link;
  return {
    guid,
    slug: slugFor(title, guid),
    title,
    company,
    location,
    url: item.link,
    source,
    image: imgM ? imgM[1] : null,
    description: stripHtml(html).slice(0, 4000),
    job_type: jobType,
    publishedAt: item.isoDate || item.pubDate || null,
  };
}

async function fetchUrl(url, source, jobType) {
  try {
    const f = await parser.parseURL(url);
    return (f.items || []).map((it) => parseJob(it, source, jobType));
  } catch {
    return [];
  }
}

async function upsertJobs(jobs) {
  const valid = jobs.filter((j) => j.guid && j.title && j.url);
  if (!valid.length) return;
  const cols = ["guid", "slug", "title", "company", "location", "url", "source", "image", "description", "job_type", "published_at"];
  const rows = [], vals = [];
  let i = 1;
  for (const j of valid) {
    rows.push(`(${cols.map(() => `$${i++}`).join(",")})`);
    const d = j.publishedAt ? new Date(j.publishedAt) : null;
    vals.push(j.guid, j.slug, j.title, j.company || null, j.location || null, j.url, j.source || null, j.image || null, j.description || null, j.job_type, d && !isNaN(d) ? d.toISOString() : null);
  }
  await pool.query(`insert into jobs (${cols.join(",")}) values ${rows.join(",")} on conflict (guid) do nothing`, vals);
}

const cachedJobs = unstable_cache(
  async (jobType) => {
    const cfg = getConfig();
    let lists;
    if (jobType === "government") {
      lists = await Promise.all(
        (cfg.govtJobQueries || []).map((q) => fetchUrl(googleNewsSearchUrl(q, "hi"), "Sarkari Naukri", "government"))
      );
    } else {
      lists = await Promise.all(cfg.jobFeeds.filter((f) => f.type === "private").map((f) => fetchUrl(f.url, f.source, "private")));
    }
    const seen = new Set();
    const jobs = lists.flat().filter((j) => { if (!j.url || seen.has(j.slug)) return false; seen.add(j.slug); return true; });
    jobs.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    try { await upsertJobs(jobs); } catch { /* best-effort */ }
    return jobs.slice(0, 60);
  },
  ["jobs-v2"],
  { revalidate: 1800 }
);

export async function getJobs(jobType = "private") {
  const cfg = getConfig();
  const valid = cfg.jobTypes.some((t) => t.slug === jobType) ? jobType : "private";
  return { jobType: valid, jobs: await cachedJobs(valid) };
}

export async function getJobBySlug(slug) {
  const rows = await query(`select * from jobs where slug=$1 limit 1`, [slug]);
  return rows[0] || null;
}

export function jobTypes() {
  return getConfig().jobTypes;
}

export function jobTimeAgo(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "आज";
  if (d === 1) return "कल";
  return `${d} दिन पहले`;
}

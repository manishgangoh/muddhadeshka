import Parser from "rss-parser";
import { unstable_cache } from "next/cache";
import { pool, query, slugFor } from "./db.js";
import { aiChat } from "./ai.js";

// What's viral RIGHT NOW in India. Google Trends search-spikes reflect cross-platform
// virality (Insta/X/YouTube/news), so we use it as the signal and write our own
// short Inshorts-style summaries (Hindi / Hinglish / English) with the AI engine.
const TRENDS_URL = "https://trends.google.com/trending/rss?geo=IN";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; MuddhadeshkaBot/1.0)" },
  customFields: {
    item: [
      ["ht:approx_traffic", "traffic"],
      ["ht:picture", "picture"],
      ["ht:news_item", "news", { keepArray: true }],
    ],
  },
});

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const first = (v) => (Array.isArray(v) ? v[0] : v) || "";

function trafficNum(s) {
  const m = String(s || "").replace(/[,+\s]/g, "").match(/([\d.]+)([KkMm]?)/);
  if (!m) return 0;
  let n = parseFloat(m[1]) || 0;
  if (/[Kk]/.test(m[2])) n *= 1000;
  if (/[Mm]/.test(m[2])) n *= 1e6;
  return Math.round(n);
}

// Create the table on first use (idempotent; runs once per server process)
async function ensureTable() {
  if (globalThis._mdkViralTable) return;
  await pool.query(`create table if not exists viral (
    id bigserial primary key,
    slug text unique not null,
    topic text not null,
    traffic text,
    traffic_num bigint default 0,
    image text,
    summary_hi text,
    summary_hinglish text,
    summary_en text,
    related jsonb default '[]'::jsonb,
    source text default 'Google Trends',
    trended_at timestamptz,
    summary_at timestamptz,
    created_at timestamptz default now()
  )`);
  globalThis._mdkViralTable = true;
}

async function fetchTrends() {
  let feed;
  try {
    feed = await parser.parseURL(TRENDS_URL);
  } catch {
    return [];
  }
  return (feed.items || [])
    .map((it) => {
      const related = (it.news || [])
        .map((n) => ({
          title: clean(first(n["ht:news_item_title"])),
          url: first(n["ht:news_item_url"]),
          source: clean(first(n["ht:news_item_source"])),
          image: first(n["ht:news_item_picture"]) || null,
        }))
        .filter((r) => r.title && r.url)
        .slice(0, 6);
      const topic = clean(it.title);
      return {
        topic,
        slug: slugFor(topic, "trend:" + topic.toLowerCase()),
        traffic: it.traffic || null,
        trafficNum: trafficNum(it.traffic),
        image: it.picture || related[0]?.image || null,
        trendedAt: it.isoDate || it.pubDate || null,
        related,
      };
    })
    .filter((t) => t.topic && t.related.length);
}

async function upsertTrends(rows) {
  if (!rows.length) return;
  const cols = ["slug", "topic", "traffic", "traffic_num", "image", "related", "source", "trended_at"];
  const ph = [], vals = [];
  let i = 1;
  for (const r of rows) {
    ph.push(`(${cols.map(() => `$${i++}`).join(",")})`);
    const d = r.trendedAt ? new Date(r.trendedAt) : null;
    vals.push(r.slug, r.topic, r.traffic, r.trafficNum, r.image, JSON.stringify(r.related), "Google Trends",
      d && !isNaN(d) ? d.toISOString() : new Date().toISOString());
  }
  // Re-trending topics refresh their stats/links but keep any summary already generated.
  await pool.query(
    `insert into viral (${cols.join(",")}) values ${ph.join(",")}
     on conflict (slug) do update set
       traffic = excluded.traffic,
       traffic_num = excluded.traffic_num,
       image = coalesce(excluded.image, viral.image),
       related = excluded.related,
       trended_at = excluded.trended_at`,
    vals
  );
}

// One AI call → factual ~60-word summary in Hindi, Hinglish and English.
// Strictly bound to the trending headlines (no invented facts).
async function summarizeTopic(topic, related) {
  const heads = (related || []).map((r, i) => `${i + 1}. ${r.title} (${r.source})`).join("\n");
  const system = `You are an Indian news editor writing short Inshorts-style trending cards (about 55-60 words each). Base your summary ONLY on the given headlines about the trending topic. Do NOT invent specific facts, numbers, names, scores or quotes that are not in the headlines — if details are unclear, stay general. Neutral, clear tone.`;
  const user = `Trending in India right now: "${topic}"
Related news headlines:
${heads}

Write a ~60-word summary explaining what is happening and why it is trending, in THREE languages with IDENTICAL facts. Use EXACTLY this format, keep the ### markers, write content on the lines after each marker (no brackets/placeholders):
###HI###
Hindi (Devanagari), ~55-60 words
###HINGLISH###
Hinglish (Hindi in Roman letters, keep common English words), ~55-60 words
###EN###
English, ~55-60 words`;

  const { text } = await aiChat(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { temperature: 0.4, maxTokens: 900 }
  );
  const grab = (a, b) => {
    const s = text.indexOf(a);
    if (s === -1) return "";
    const f = s + a.length;
    const e = b ? text.indexOf(b, f) : -1;
    return text.slice(f, e === -1 ? undefined : e).trim();
  };
  const cl = (s) => s.replace(/^<\/?[a-z_]+>\s*/i, "").replace(/\s*<\/?[a-z_]+>$/i, "").trim();
  const hi = cl(grab("###HI###", "###HINGLISH###"));
  const hinglish = cl(grab("###HINGLISH###", "###EN###"));
  const en = cl(grab("###EN###", null));
  return { hi: hi || topic, hinglish: hinglish || hi || topic, en: en || hi || topic };
}

async function backfillSummaries(limit = 6) {
  const rows = await query(
    `select id, topic, related from viral where summary_hi is null order by trended_at desc nulls last limit $1`,
    [limit]
  );
  let done = 0;
  for (const r of rows) {
    try {
      const s = await summarizeTopic(r.topic, r.related || []);
      await pool.query(
        `update viral set summary_hi=$2, summary_hinglish=$3, summary_en=$4, summary_at=now() where id=$1`,
        [r.id, s.hi, s.hinglish, s.en]
      );
      done++;
    } catch { /* skip; next refresh retries */ }
  }
  return done;
}

// Called by the refresh cron: pull trends, store, then generate a few summaries.
// summaryLimit is small so the shared /api/refresh stays well under its time budget;
// remaining topics get summarised on subsequent runs.
export async function refreshViral(summaryLimit = 6) {
  await ensureTable();
  const trends = await fetchTrends();
  await upsertTrends(trends);
  let summarized = 0;
  try { summarized = await backfillSummaries(summaryLimit); } catch { /* best-effort */ }
  return { fetched: trends.length, summarized };
}

const cachedViral = unstable_cache(
  async (period) => {
    await ensureTable();
    const since = period === "week" ? "7 days" : "24 hours";
    return query(
      `select slug, topic, traffic, traffic_num, image, related, summary_hi, summary_hinglish, summary_en, source, trended_at
       from viral where trended_at > now() - ($1)::interval
       order by traffic_num desc nulls last, trended_at desc limit 60`,
      [since]
    );
  },
  ["viral-v1"],
  { revalidate: 600 }
);

export async function getViral({ period = "today" } = {}) {
  try {
    return await cachedViral(period === "week" ? "week" : "today");
  } catch {
    return [];
  }
}

// Pick the right-language summary for a row (falls back to Hindi, then a related headline)
export function viralBlurb(v, lang) {
  const s = lang === "en" ? v.summary_en : lang === "hi" || lang === "mr" || lang === "bn" || lang === "ta" || lang === "te" || lang === "gu" || lang === "kn" || lang === "ml" || lang === "pa" ? v.summary_hi : v.summary_hinglish;
  return s || v.summary_hi || (v.related?.[0]?.title) || v.topic;
}

export function viralTimeAgo(iso) {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "अभी";
  if (m < 60) return `${m} मिनट पहले`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} घंटे पहले`;
  return `${Math.floor(h / 24)} दिन पहले`;
}

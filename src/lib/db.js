import pg from "pg";
import { createHash } from "node:crypto";

const { Pool } = pg;

// Reuse a single pool across hot-reloads / serverless invocations
const g = globalThis;
export const pool =
  g._mdkPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
  });
if (!g._mdkPool) g._mdkPool = pool;

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

// Stable short slug from a guid/link → used for /khabar/[slug]
export function slugFor(guidOrLink) {
  return createHash("sha1").update(guidOrLink || "").digest("base64url").slice(0, 12);
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Bulk insert RSS items; skip ones already stored (by guid). Returns count inserted.
export async function upsertArticles(items) {
  if (!items.length) return 0;
  const cols = ["guid", "source_url", "slug", "title", "summary", "image", "source_name", "category", "lang", "type", "published_at"];
  const values = [];
  const rows = [];
  let i = 1;
  for (const it of items) {
    const guid = it.guid || it.link;
    if (!guid || !it.title || !it.link) continue;
    rows.push(`($${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++})`);
    values.push(guid, it.link, slugFor(guid), it.title, it.summary || null, it.image || null,
      it.source || null, it.category || null, it.lang || "hi", it.type || "article", toDate(it.publishedAt));
  }
  if (!rows.length) return 0;
  const res = await pool.query(
    `insert into articles (${cols.join(",")}) values ${rows.join(",")}
     on conflict (guid) do nothing`,
    values
  );
  return res.rowCount;
}

export async function getArticles({ lang = "hi", category = null, limit = 60 } = {}) {
  if (category) {
    return query(
      `select * from articles where lang=$1 and category=$2 order by published_at desc nulls last limit $3`,
      [lang, category, limit]
    );
  }
  return query(
    `select * from articles where lang=$1 order by published_at desc nulls last limit $2`,
    [lang, limit]
  );
}

export async function getArticleBySlug(slug) {
  const rows = await query(`select * from articles where slug=$1 limit 1`, [slug]);
  return rows[0] || null;
}

export async function saveArticleContent(slug, { aiTitle, body, keyPoints, sources }) {
  await pool.query(
    `update articles set ai_title=$2, full_content=$3, key_points=$4, ai_sources=$5, ai_at=now() where slug=$1`,
    [slug, aiTitle || null, body || null, JSON.stringify(keyPoints || []), JSON.stringify(sources || [])]
  );
}

// Recent articles in same category/lang, excluding the given slug (for "related news")
export async function getRelated({ lang, category, excludeSlug, limit = 6 }) {
  return query(
    `select slug, ai_title, title, image, source_name, published_at, category
     from articles where lang=$1 and category=$2 and slug<>$3
     order by published_at desc nulls last limit $4`,
    [lang, category, excludeSlug, limit]
  );
}

// Recent articles in same lang (optionally category) for same-story clustering
export async function getClusterCandidates({ lang, category, excludeSlug, sinceHours = 72, limit = 120 }) {
  return query(
    `select slug, title, source_url, source_name from articles
     where lang=$1 and ($2::text is null or category=$2) and slug<>$3
       and published_at > now() - ($4 || ' hours')::interval
     order by published_at desc limit $5`,
    [lang, category || null, excludeSlug || "", String(sinceHours), limit]
  );
}

export async function countArticles() {
  const rows = await query(`select count(*)::int as n from articles`);
  return rows[0]?.n || 0;
}

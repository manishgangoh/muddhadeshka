import pg from "pg";
import { createHash } from "node:crypto";
import { slugify } from "transliteration";

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
if (!g._mdkPool) {
  // The Supabase pooler closes idle connections; without this handler pg emits an
  // unhandled 'error' event that crashes the process. Just log and let the pool recover.
  pool.on("error", (err) => console.error("[pg pool]", err.message));
  g._mdkPool = pool;
}

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

// SEO-friendly, unique slug from the title → /khabar/twisha-sharma-maut-mamle-xxxxxx
// Readable keywords (transliterated Hindi) + a short hash of the guid for uniqueness.
export function slugFor(title, guid) {
  let base = slugify(title || "", { lowercase: true, separator: "-" })
    .replace(/aa+/g, "a").replace(/ii+/g, "i").replace(/uu+/g, "u")
    .replace(/oo+/g, "o").replace(/ee+/g, "e")
    .replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  base = base.split("-").filter(Boolean).slice(0, 8).join("-").slice(0, 70).replace(/-$/, "");
  const id = createHash("sha1").update(guid || title || "").digest("base64url").slice(0, 6);
  return base ? `${base}-${id}` : id;
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Bulk insert RSS items; skip ones already stored (by guid). Returns count inserted.
export async function upsertArticles(items) {
  if (!items.length) return 0;
  const cols = ["guid", "source_url", "slug", "title", "summary", "image", "source_name", "category", "lang", "type", "published_at", "city", "state"];
  const values = [];
  const rows = [];
  let i = 1;
  for (const it of items) {
    const guid = it.guid || it.link;
    if (!guid || !it.title || !it.link) continue;
    rows.push(`(${Array.from({ length: cols.length }, () => `$${i++}`).join(",")})`);
    values.push(guid, it.link, slugFor(it.title, guid), it.title, it.summary || null, it.image || null,
      it.source || null, it.category || null, it.lang || "hi", it.type || "article", toDate(it.publishedAt),
      it.city || null, it.state || null);
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

export async function saveArticleContent(slug, { aiTitle, body, keyPoints, sources, metaTitle, metaDesc }) {
  await pool.query(
    `update articles set ai_title=$2, full_content=$3, key_points=$4, ai_sources=$5, meta_title=$6, meta_desc=$7, ai_at=now() where slug=$1`,
    [slug, aiTitle || null, body || null, JSON.stringify(keyPoints || []), JSON.stringify(sources || []), metaTitle || null, metaDesc || null]
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

export async function getTranslation(slug, lang) {
  const rows = await query(`select title, body, key_points from article_translations where slug=$1 and lang=$2 limit 1`, [slug, lang]);
  return rows[0] || null;
}

export async function saveTranslation(slug, lang, { title, body, keyPoints }) {
  await pool.query(
    `insert into article_translations (slug, lang, title, body, key_points) values ($1,$2,$3,$4,$5)
     on conflict (slug, lang) do update set title=$3, body=$4, key_points=$5`,
    [slug, lang, title || null, body || null, JSON.stringify(keyPoints || [])]
  );
}

export async function countArticles() {
  const rows = await query(`select count(*)::int as n from articles`);
  return rows[0]?.n || 0;
}

import { extract } from "@extractus/article-extractor";

function cleanText(s = "") {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Method 1: readability-style extractor (works for most sites)
async function viaLibrary(url) {
  try {
    const a = await extract(
      url,
      {},
      { headers: { "user-agent": "Mozilla/5.0 (compatible; MuddhadeshkaBot/1.0)" }, signal: AbortSignal.timeout(12000) }
    );
    return a?.content ? cleanText(a.content) : null;
  } catch {
    return null;
  }
}

// Method 2: JSON-LD "articleBody" embedded in the page (works for NDTV & many others
// that block readability scraping)
function findArticleBody(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) { const r = findArticleBody(n); if (r) return r; }
    return null;
  }
  if (typeof node.articleBody === "string" && node.articleBody.length > 200) return node.articleBody;
  for (const k of Object.keys(node)) {
    if (node[k] && typeof node[k] === "object") { const r = findArticleBody(node[k]); if (r) return r; }
  }
  return null;
}

async function viaJsonLd(url) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const b of blocks) {
      let data;
      try { data = JSON.parse(b[1].trim()); } catch { continue; }
      const body = findArticleBody(data);
      if (body) return cleanText(body);
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch a source article's main body as plain text. Returns null if nothing usable
// (paywall/bot-block) so callers can fall back to the RSS summary.
export async function extractFullText(url) {
  const lib = await viaLibrary(url);
  // If readability gave little or nothing, try the JSON-LD fallback
  const ld = !lib || lib.length < 800 ? await viaJsonLd(url) : null;

  const best = [lib, ld].filter(Boolean).sort((a, b) => b.length - a.length)[0];
  return best && best.length > 250 ? best.slice(0, 8000) : null;
}

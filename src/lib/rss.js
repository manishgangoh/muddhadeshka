import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; MuddhadeshkaBot/1.0)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["media:group", "mediaGroup"],
    ],
  },
});

// ---- URL builders -----------------------------------------------------------

export function googleNewsTopicUrl(topic, lang = "hi") {
  return `https://news.google.com/rss/headlines/section/topic/${topic}?hl=${lang}-IN&gl=IN&ceid=IN:${lang}`;
}

export function googleNewsSearchUrl(query, lang = "hi") {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=${lang}-IN&gl=IN&ceid=IN:${lang}`;
}

export function youtubeFeedUrl(channelId) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

// ---- helpers ----------------------------------------------------------------

function stripHtml(str = "") {
  return str
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item) {
  if (item.enclosure?.url && /^https?:/.test(item.enclosure.url)) return item.enclosure.url;
  if (item.mediaThumbnail?.[0]?.$?.url) return item.mediaThumbnail[0].$.url;
  if (item.mediaContent?.[0]?.$?.url) return item.mediaContent[0].$.url;
  // YouTube
  if (item.mediaGroup?.["media:thumbnail"]?.[0]?.$?.url)
    return item.mediaGroup["media:thumbnail"][0].$.url;
  const html = item["content:encoded"] || item.content || "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1];
  return null;
}

function youtubeVideoId(item) {
  if (item.id?.startsWith("yt:video:")) return item.id.replace("yt:video:", "");
  const m = (item.link || "").match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

// ---- core fetch -------------------------------------------------------------

export async function fetchFeed({ url, source = "", lang = "", category = "", type = "article" }) {
  try {
    const feed = await parser.parseURL(url);
    const items = (feed.items || []).map((item) => {
      const videoId = type === "video" ? youtubeVideoId(item) : null;
      const image = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : extractImage(item);
      return {
        title: stripHtml(item.title || ""),
        summary: stripHtml(item.contentSnippet || item.summary || item.content || "").slice(0, 400),
        link: item.link || "",
        image,
        source: source || feed.title || "",
        lang,
        category,
        type,
        videoId,
        publishedAt: item.isoDate || item.pubDate || null,
        guid: item.guid || item.id || item.link || "",
      };
    });
    return { ok: true, source, count: items.length, items };
  } catch (err) {
    return { ok: false, source, url, error: err.message, items: [] };
  }
}

// Fetch many feeds in parallel, flatten + sort newest first
export async function fetchMany(feedDefs) {
  const results = await Promise.all(feedDefs.map((f) => fetchFeed(f)));
  const items = results.flatMap((r) => r.items);
  items.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  return { results, items };
}

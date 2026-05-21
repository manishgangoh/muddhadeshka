import Parser from "rss-parser";
const p = new Parser({ timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0)" }, customFields:{item:[["media:content","mc",{keepArray:true}],["enclosure","enc"]]} });
const feeds = {
  "DDNews":      "https://ddnews.gov.in/en/feed/",
  "PIB":         "https://pib.gov.in/Rss/RssLatestRelease.aspx",
  "NBT-default": "https://navbharattimes.indiatimes.com/rssfeedsdefault.cms",
  "NBT-2283084": "https://navbharattimes.indiatimes.com/rssfeeds/2283084.cms",
  "ZeeHindi":    "https://zeenews.india.com/hindi/rss/india-news.xml",
  "Gadgets360":  "https://feeds.feedburner.com/gadgets360-latest",
  "Digit":       "https://www.digit.in/feed/",
};
for (const [name,url] of Object.entries(feeds)) {
  try {
    const f = await p.parseURL(url);
    const it = f.items?.[0];
    const age = it ? Math.round((Date.now()-new Date(it.isoDate||it.pubDate))/60000) : "?";
    const img = it && (it.enclosure?.url || it.enc?.url || it.mc?.[0]?.$?.url || ((it["content:encoded"]||it.content||"").match(/<img[^>]+src=["']([^"']+)/)?.[1]));
    console.log(`OK  ${name.padEnd(13)} | items:${String(f.items.length).padStart(3)} | ${String(age).padStart(5)}min | img:${img?"Y":"n"} | "${(it?.title||"").slice(0,32)}"`);
  } catch(e){ console.log(`ERR ${name.padEnd(13)} | ${e.message.slice(0,45)}`); }
}

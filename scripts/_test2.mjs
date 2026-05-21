import Parser from "rss-parser";
const p = new Parser({ timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0)" }, customFields:{item:[["media:content","mc",{keepArray:true}],["enclosure","enc"]]} });
const feeds = {
  "HindustanTimes":  "https://www.hindustantimes.com/rss/topnews/rssfeed.xml",
  "IndiaToday":      "https://www.indiatoday.in/rss/1206584",
  "TOI-top":         "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
  "NDTV-top":        "https://feeds.feedburner.com/ndtvnews-top-stories",
  "TheHindu-latest": "https://www.thehindu.com/news/feeder/default.rss",
  "TheHindu-states": "https://www.thehindu.com/news/states/feeder/default.rss",
  "EconomicTimes":   "https://economictimes.indiatimes.com/rssfeedsdefault.cms",
  "Livemint":        "https://www.livemint.com/rss/politics",
  "TOI-Delhi":       "https://timesofindia.indiatimes.com/rssfeeds/2685073.cms",
  "TOI-Mumbai":      "https://timesofindia.indiatimes.com/rssfeeds/4654568.cms",
  "TOI-Lucknow":     "https://timesofindia.indiatimes.com/rssfeeds/924771.cms",
  "TOI-Patna":       "https://timesofindia.indiatimes.com/rssfeeds/2842445.cms",
  "TOI-Jaipur":      "https://timesofindia.indiatimes.com/rssfeeds/3012535.cms",
};
for (const [name,url] of Object.entries(feeds)) {
  try {
    const f = await p.parseURL(url);
    const it = f.items?.[0];
    const age = it ? Math.round((Date.now()-new Date(it.isoDate||it.pubDate))/60000) : "?";
    const img = it && (it.enclosure?.url || it.enc?.url || it.mc?.[0]?.$?.url || ((it["content:encoded"]||it.content||"").match(/<img[^>]+src=["']([^"']+)/)?.[1]));
    console.log(`OK  ${name.padEnd(16)} | items:${String(f.items.length).padStart(3)} | ${String(age).padStart(4)}min | img:${img?"Y":"n"}`);
  } catch(e){ console.log(`ERR ${name.padEnd(16)} | ${e.message.slice(0,40)}`); }
}

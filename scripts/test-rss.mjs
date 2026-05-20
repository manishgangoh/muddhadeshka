import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  fetchFeed,
  fetchMany,
  googleNewsTopicUrl,
  googleNewsSearchUrl,
  youtubeFeedUrl,
} from "../src/lib/rss.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "config/sources.json"), "utf8"));

function show(title, items, n = 4) {
  console.log(`\n\x1b[1m\x1b[36m=== ${title} ===\x1b[0m  (${items.length} items)`);
  items.slice(0, n).forEach((it, i) => {
    console.log(`\x1b[33m${i + 1}.\x1b[0m ${it.title}`);
    console.log(`   ${it.source} | ${it.publishedAt || "no-date"} | img:${it.image ? "yes" : "no"}${it.videoId ? " | video:" + it.videoId : ""}`);
  });
}

console.log("\x1b[1mMuddhadeshka RSS engine — live test\x1b[0m");

// 1) Publisher RSS — English Sports (Times of India)
const toi = config.rssFeeds.find((f) => f.source === "Times of India" && f.category === "khel");
show("Publisher RSS — TOI Sports (English)", (await fetchFeed({ ...toi, type: "article" })).items);

// 2) Google News — Hindi Politics (topic)
const pol = await fetchFeed({
  url: googleNewsTopicUrl("NATION", "hi"),
  source: "Google News",
  lang: "hi",
  category: "rajniti",
});
show("Google News — Hindi Politics (राजनीति)", pol.items);

// 3) Google News — city search (Lucknow, Hindi)
const city = await fetchFeed({
  url: googleNewsSearchUrl("Lucknow समाचार", "hi"),
  source: "Google News",
  lang: "hi",
  category: "city:lucknow",
});
show("Google News — Lucknow city news (Hindi)", city.items);

// 4) YouTube — video news (Aaj Tak)
const yt = config.youtubeChannels.find((c) => c.name === "Aaj Tak");
const ytFeed = await fetchFeed({
  url: youtubeFeedUrl(yt.channelId),
  source: yt.name,
  lang: yt.lang,
  type: "video",
});
show("YouTube — Aaj Tak video news", ytFeed.items);

// 5) fetchMany — combine all English feeds, newest first
const enFeeds = config.rssFeeds.filter((f) => f.lang === "en").map((f) => ({ ...f, type: "article" }));
const { items: combined } = await fetchMany(enFeeds);
show(`Combined English feeds (${enFeeds.length} sources, sorted newest)`, combined, 5);

console.log("\n\x1b[1m\x1b[32m✓ Test complete\x1b[0m");

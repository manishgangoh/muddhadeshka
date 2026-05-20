// Background news fetcher: pulls RSS → categorizes → stores new articles in a loop.
// Run: node --env-file=.env.local scripts/auto-refresh.mjs
// Interval (seconds) via REFRESH_SEC env, default 60.
import { refreshAllNews } from "../src/lib/refresh.js";
import { countArticles } from "../src/lib/db.js";

const SEC = Number(process.env.REFRESH_SEC || 60);
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

console.log(`Auto-refresh started — har ${SEC}s me news fetch hogi`);
while (true) {
  try {
    const res = await refreshAllNews(["hi", "en"]);
    const inserted = res.reduce((a, x) => a + x.inserted, 0);
    const total = await countArticles();
    console.log(`[${new Date().toLocaleTimeString("en-IN")}] +${inserted} nayi | total ${total}`);
  } catch (e) {
    console.error(`[${new Date().toLocaleTimeString("en-IN")}] error:`, e.message);
  }
  await sleep(SEC);
}

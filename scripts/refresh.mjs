import { refreshAllNews } from "../src/lib/refresh.js";
import { countArticles } from "../src/lib/db.js";
const r = await refreshAllNews(["hi", "en"]);
console.table(r);
console.log("Total articles in DB:", await countArticles());
process.exit(0);

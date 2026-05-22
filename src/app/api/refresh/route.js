import { after } from "next/server";
import { refreshAllNews } from "@/lib/refresh";
import { prewarmArticles } from "@/lib/article";
import { countArticles } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // refresh of hi+en feeds takes ~15s

// Hit by a scheduler (GitHub Actions / cron-job.org / Vercel Cron) to pull fresh news.
// Protected by CRON_SECRET — pass ?secret=... or Authorization: Bearer ...
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const provided = url.searchParams.get("secret") || (request.headers.get("authorization") || "").replace("Bearer ", "");

  if (secret && provided !== secret) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const results = await refreshAllNews(["hi", "en"]);
    const inserted = results.reduce((a, x) => a + x.inserted, 0);
    const total = await countArticles();
    // Bonus: pre-generate a few of the freshly-added articles in the remaining time
    // budget (the dedicated /api/prewarm cron does the bulk of the work).
    after(async () => { try { await prewarmArticles({ limit: 4, budgetMs: 12000 }); } catch { /* best-effort */ } });
    return Response.json({ ok: true, inserted, total, results });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

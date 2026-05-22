import { prewarmArticles } from "@/lib/article";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Background "agent": pre-generates the full AI article for the newest un-generated
// news. Hit by a scheduler (cron-job.org) every 1-2 min so stories are ready BEFORE
// users open them. Protected by CRON_SECRET — pass ?secret=... or Authorization: Bearer.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const provided = url.searchParams.get("secret") || (request.headers.get("authorization") || "").replace("Bearer ", "");

  if (secret && provided !== secret) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    // Keep this small: free AI tiers have tight per-minute token limits, and the
    // bulk of the budget must stay free for real user (on-click) generation.
    const r = await prewarmArticles({ limit: 3, budgetMs: 45000 });
    return Response.json({ ok: true, ...r });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

import { after } from "next/server";
import { prewarmArticles } from "@/lib/article";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Background "agent": pre-generates the full AI article for the newest un-generated
// news. Hit by a scheduler (cron-job.org) every 1-2 min so stories are ready BEFORE
// users open them. Protected by CRON_SECRET — pass ?secret=... or Authorization: Bearer.
//
// Returns IMMEDIATELY and does the (slow) generation in the background via after(),
// so the scheduler never hits its ~30s request timeout. The work still runs up to the
// function's maxDuration. Kept small so free AI per-minute limits stay free for
// real user (on-click) generation.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const provided = url.searchParams.get("secret") || (request.headers.get("authorization") || "").replace("Bearer ", "");

  if (secret && provided !== secret) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  after(async () => { try { await prewarmArticles({ limit: 3, budgetMs: 50000 }); } catch { /* next run retries */ } });
  return Response.json({ ok: true, started: true });
}

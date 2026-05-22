import { getArticleBySlug } from "@/lib/db";
import { buildArticleContent } from "@/lib/article";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// On-demand: build the full AI article for a single slug and report when ready.
// Called by the article page (client) only when the story isn't pre-warmed yet,
// so it's deterministic — the client gets a real response and reloads. Idempotent:
// returns immediately if the content already exists.
export async function GET(request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return Response.json({ ok: false, error: "no slug" }, { status: 400 });
  try {
    const a = await getArticleBySlug(slug);
    if (!a) return Response.json({ ok: false, error: "not found" }, { status: 404 });
    if (a.full_content) return Response.json({ ok: true, ready: true });
    const r = await buildArticleContent(a);
    return Response.json({ ok: true, ready: !!(r && r.full_content) });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

import { notFound } from "next/navigation";
import { normalizeLang, timeAgoHi } from "@/lib/news";
import { getArticleBySlug, saveArticleContent, getRelated, getClusterCandidates } from "@/lib/db";
import { rewriteArticle } from "@/lib/ai";
import { extractFullText } from "@/lib/extract";
import { findSameStory } from "@/lib/cluster";
import { CAT, Tag, hrefFor } from "@/components/ui";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) return { title: "मुद्दा देश का" };
  return {
    title: `${a.ai_title || a.title} — मुद्दा देश का`,
    description: (a.full_content || a.summary || "").slice(0, 160),
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  let a = await getArticleBySlug(slug);
  if (!a) notFound();

  // First open → find the SAME story from other outlets, scrape all, merge into one
  // original article via AI, then store it. (Level 2: multi-source merge)
  if (!a.full_content) {
    try {
      const candidates = await getClusterCandidates({ lang: a.lang, excludeSlug: slug, sinceHours: 96, limit: 200 });
      const cluster = findSameStory(a, candidates, { max: 2 });

      // scrape full text of this article + matched outlets (in parallel)
      const toScrape = [{ name: a.source_name, url: a.source_url }, ...cluster.map((c) => ({ name: c.source_name, url: c.source_url }))];
      const scraped = await Promise.all(toScrape.map(async (s) => ({ name: s.name, text: await extractFullText(s.url) })));
      const sources = scraped.filter((s) => s.text);
      if (sources.length === 0 && a.summary) sources.push({ name: a.source_name, text: a.summary });

      const r = await rewriteArticle({ title: a.title, summary: a.summary, source: a.source_name, lang: a.lang, sources });
      if (r.body) {
        await saveArticleContent(slug, { aiTitle: r.title, body: r.body, keyPoints: r.keyPoints, sources: r.mergedSources });
        a = { ...a, ai_title: r.title, full_content: r.body, key_points: r.keyPoints, ai_sources: r.mergedSources };
      }
    } catch {
      // AI/scrape unavailable → fall back to the source summary below
    }
  }

  const lang = normalizeLang(a.lang);
  const mergedSources = Array.isArray(a.ai_sources) ? a.ai_sources : [];
  const points = Array.isArray(a.key_points) ? a.key_points : [];
  const paragraphs = (a.full_content || a.summary || "").split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const related = await getRelated({ lang, category: a.category, excludeSlug: slug, limit: 6 });
  const catLabel = CAT[a.category]?.label || "";

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang={lang} basePath="/" activeCat={a.category} />

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Breadcrumb */}
        <nav className="mb-3 text-xs text-zinc-500">
          <a href={hrefFor("/", lang)} className="hover:text-brand-blue">होम</a>
          {catLabel && <> · <a href={hrefFor(`/${a.category}`, lang)} className="hover:text-brand-blue">{catLabel}</a></>}
        </nav>

        <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-7">
          <Tag slug={a.category} />
          <h1 className="mt-2 text-2xl font-extrabold leading-tight text-zinc-900 sm:text-3xl">
            {a.ai_title || a.title}
          </h1>
          <div className="mt-2 text-sm text-zinc-500">
            <span>{timeAgoHi(a.published_at)}</span>
          </div>

          {a.image && (
            <img src={a.image} alt="" className="mt-4 w-full rounded-lg object-cover" />
          )}

          {/* Key points */}
          {points.length > 0 && (
            <div className="mt-5 rounded-lg border-l-4 border-brand-red bg-rose-50/60 p-4">
              <p className="mb-2 text-sm font-bold text-brand-red">मुख्य बातें</p>
              <ul className="space-y-1.5 text-sm text-zinc-700">
                {points.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="text-brand-red">•</span><span>{p}</span></li>
                ))}
              </ul>
            </div>
          )}

          {/* Body */}
          <div className="mt-5 space-y-4 text-[17px] leading-8 text-zinc-800">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {/* Source button */}
          <div className="mt-6 border-t border-zinc-200 pt-5">
            <a href={a.source_url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue-dark">
              मूल स्रोत पर पूरी खबर पढ़ें →
            </a>
            <p className="mt-3 text-xs text-zinc-400">
              यह खबर AI द्वारा {mergedSources.length > 1 ? `${mergedSources.join(", ")} की रिपोर्ट्स के आधार पर` : "मूल स्रोत के आधार पर"} तैयार की गई है।
            </p>
          </div>
        </article>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
              <span className="h-5 w-1.5 rounded bg-brand-red" /> इसे भी पढ़ें
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <a key={r.slug} href={hrefFor(`/khabar/${r.slug}`, lang)}
                   className="group flex gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 hover:shadow-md">
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded bg-zinc-100">
                    {r.image
                      ? <img src={r.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                      : <div className="flex h-full items-center justify-center text-center text-[9px] font-semibold text-zinc-300">मुद्दा<br/>देश का</div>}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-snug text-zinc-800 group-hover:text-brand-blue line-clamp-3">{r.ai_title || r.title}</h3>
                    <span className="mt-1 block text-[11px] text-zinc-400">{timeAgoHi(r.published_at)}</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

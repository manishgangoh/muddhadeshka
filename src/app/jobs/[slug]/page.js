import { notFound } from "next/navigation";
import { getJobBySlug, jobTimeAgo } from "@/lib/jobs";
import { normalizeLang } from "@/lib/news";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const j = await getJobBySlug(slug);
  if (!j) return { title: "नौकरी — मुद्दा देश का" };
  return {
    title: `${j.title}${j.company ? " — " + j.company : ""} | Job`,
    description: (j.description || j.title).slice(0, 160),
    alternates: { canonical: `${SITE}/jobs/${j.slug}` },
  };
}

export default async function JobDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const lang = normalizeLang((await searchParams)?.lang);
  const j = await getJobBySlug(slug);
  if (!j) notFound();

  const paragraphs = (j.description || "").split(/\n\n+|\.\s(?=[A-Z])/).map((p) => p.trim()).filter((p) => p.length > 20).slice(0, 12);

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang={lang} basePath="/jobs" activeCat="home" />

      <main className="mx-auto max-w-3xl px-4 py-6">
        <nav className="mb-3 text-xs text-zinc-500">
          <a href="/" className="hover:text-brand-blue">होम</a> · <a href="/jobs" className="hover:text-brand-blue">नौकरियाँ</a>
        </nav>

        <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
              {j.image
                ? <img src={j.image} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-2xl font-bold text-brand-red">{(j.company || j.title || "?").charAt(0)}</div>}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-snug text-zinc-900 sm:text-2xl">{j.title}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {j.company && <span>{j.company} · </span>}{j.source}{j.published_at && <span> · {jobTimeAgo(j.published_at)}</span>}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {j.location && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">📍 {j.location}</span>}
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">{j.job_type === "government" ? "सरकारी नौकरी" : "प्राइवेट जॉब"}</span>
          </div>

          {/* Apply button (top) */}
          <a href={j.url} target="_blank" rel="noopener noreferrer"
             className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 font-bold text-white transition hover:bg-brand-red-dark">
            Apply करें →
          </a>

          {/* Description */}
          {paragraphs.length > 0 && (
            <div className="mt-6 border-t border-zinc-200 pt-5">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">जॉब विवरण</h2>
              <div className="space-y-3 leading-7 text-zinc-700">
                {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          )}

          {/* Apply button (bottom) */}
          <div className="mt-6 border-t border-zinc-200 pt-5">
            <a href={j.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 font-bold text-white transition hover:bg-brand-red-dark">
              इस जॉब के लिए Apply करें →
            </a>
            <p className="mt-3 text-xs text-zinc-400">Apply करने पर मूल जॉब साइट ({j.source}) पर रीडायरेक्ट होंगे।</p>
          </div>
        </article>
      </main>

      <SiteFooter lang={lang} />
    </div>
  );
}

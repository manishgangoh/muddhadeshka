import { getJobs, jobTypes, jobTimeAgo } from "@/lib/jobs";
import { normalizeLang } from "@/lib/news";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app";

export const metadata = {
  title: "नौकरियाँ — प्राइवेट और सरकारी जॉब्स",
  description: "ताज़ा प्राइवेट और सरकारी नौकरियाँ एक ही जगह — रिमोट, टेक, सरकारी भर्ती। मुद्दा देश का Jobs।",
  alternates: { canonical: `${SITE}/jobs` },
};

export default async function JobsPage({ searchParams }) {
  const sp = await searchParams;
  const lang = normalizeLang(sp?.lang);
  const { jobType, jobs } = await getJobs(sp?.type || "private");
  const types = jobTypes();

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang={lang} basePath="/jobs" activeCat="home" />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-extrabold text-zinc-900">नौकरियाँ / Jobs</h1>
        <p className="mt-1 text-sm text-zinc-500">ताज़ा प्राइवेट और सरकारी नौकरियाँ — {jobs.length} jobs</p>

        {/* Type tabs */}
        <div className="mt-4 mb-6 flex gap-2">
          {types.map((t) => (
            <a key={t.slug} href={`/jobs?type=${t.slug}`}
               className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                 t.slug === jobType ? "bg-brand-red text-white shadow" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
               }`}>
              {t.name_hi}
            </a>
          ))}
        </div>

        {jobs.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">अभी कोई जॉब उपलब्ध नहीं है। थोड़ी देर बाद देखें।</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <a key={j.slug} href={`/jobs/${j.slug}`}
                 className="group flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 transition hover:shadow-md">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                  {j.image
                    ? <img src={j.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-lg font-bold text-brand-red">{(j.company || j.title || "?").charAt(0)}</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-zinc-900 group-hover:text-brand-red">{j.title}</h2>
                  <p className="truncate text-sm text-zinc-500">
                    {j.company && <span>{j.company} · </span>}
                    {j.source}{j.publishedAt && <span> · {jobTimeAgo(j.publishedAt)}</span>}
                  </p>
                </div>
                {j.location && <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:block">{j.location}</span>}
                <span className="shrink-0 rounded-lg bg-brand-red px-3 py-2 text-sm font-semibold text-white">देखें →</span>
              </a>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">जॉब्स विभिन्न जॉब बोर्ड्स से एकत्र हैं।</p>
      </main>

      <SiteFooter lang={lang} />
    </div>
  );
}

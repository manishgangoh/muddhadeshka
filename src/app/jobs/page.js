import { getJobs, searchJobs, jobTypes, jobTimeAgo } from "@/lib/jobs";
import { normalizeLang } from "@/lib/news";
import Avatar from "@/components/Avatar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app";

export const metadata = {
  title: "नौकरियाँ — प्राइवेट और सरकारी जॉब्स | Latest Jobs in India",
  description: "ताज़ा प्राइवेट और सरकारी नौकरियाँ एक ही जगह — LinkedIn, रिमोट, टेक, सरकारी भर्ती। शहर और टाइटल से सर्च करें। मुद्दा देश का Jobs।",
  alternates: { canonical: `${SITE}/jobs` },
};

function JobCard({ j }) {
  return (
    <a href={`/jobs/${j.slug}`}
       className="group flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
          <Avatar src={j.image} label={j.company || j.title} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-bold leading-snug text-zinc-900 group-hover:text-brand-red">{j.title}</h2>
          {j.company && <p className="truncate text-sm text-zinc-600">{j.company}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {j.location && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">📍 {j.location}</span>}
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">{j.source}</span>
        {j.published_at && <span className="text-zinc-400">{jobTimeAgo(j.published_at)}</span>}
      </div>
      <span className="mt-3 inline-block w-fit rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white">देखें / Apply →</span>
    </a>
  );
}

export default async function JobsPage({ searchParams }) {
  const sp = await searchParams;
  const lang = normalizeLang(sp?.lang);
  const type = sp?.type || "private";
  const q = (sp?.q || "").trim();
  const loc = (sp?.loc || "").trim();
  const types = jobTypes();

  let jobs, jobType = type;
  if (q || loc) {
    jobs = await searchJobs({ q, loc, jobType: type, limit: 60 });
  } else {
    ({ jobType, jobs } = await getJobs(type));
  }

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang={lang} basePath="/jobs" activeCat="home" />

      {/* Search hero */}
      <section className="bg-gradient-to-r from-brand-blue to-brand-blue-dark px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-extrabold sm:text-3xl">अपनी अगली नौकरी खोजें 💼</h1>
          <p className="mt-1 text-sm text-blue-100">प्राइवेट · सरकारी · रिमोट · LinkedIn — सब एक जगह</p>
          <form action="/jobs" method="get" className="mt-4 flex flex-col gap-2 rounded-xl bg-white p-2 shadow-lg sm:flex-row sm:items-center">
            <input type="hidden" name="type" value={jobType} />
            <div className="flex flex-1 items-center gap-2 px-2">
              <span className="text-zinc-400">🔍</span>
              <input name="q" defaultValue={q} placeholder="जॉब टाइटल या कंपनी (e.g. developer)"
                     className="w-full bg-white py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none" />
            </div>
            <div className="flex items-center gap-2 border-zinc-200 px-2 sm:border-l sm:w-56">
              <span className="text-zinc-400">📍</span>
              <input name="loc" defaultValue={loc} placeholder="शहर / location"
                     className="w-full bg-white py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none" />
            </div>
            <button className="rounded-lg bg-brand-red px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-red-dark">खोजें</button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Type tabs */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {types.map((t) => (
            <a key={t.slug} href={`/jobs?type=${t.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}${loc ? `&loc=${encodeURIComponent(loc)}` : ""}`}
               className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                 t.slug === jobType ? "bg-brand-red text-white shadow" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
               }`}>
              {t.name_hi}
            </a>
          ))}
          {(q || loc) && (
            <a href={`/jobs?type=${jobType}`} className="ml-auto text-sm font-medium text-brand-blue hover:underline">✕ सर्च हटाएं</a>
          )}
        </div>

        {(q || loc) && <p className="mb-4 text-sm text-zinc-500">"{q || loc}" के लिए {jobs.length} नतीजे</p>}

        {jobs.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">कोई जॉब नहीं मिली। दूसरा कीवर्ड या शहर आज़माएँ।</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((j) => <JobCard key={j.slug} j={j} />)}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">जॉब्स विभिन्न जॉब बोर्ड्स और LinkedIn से एकत्र हैं।</p>
      </main>

      <SiteFooter lang={lang} />
    </div>
  );
}

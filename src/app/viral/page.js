import { getViral, viralBlurb, viralTimeAgo } from "@/lib/viral";
import { normalizeLang } from "@/lib/news";
import Avatar from "@/components/Avatar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app";

export const metadata = {
  title: "वायरल — अभी क्या ट्रेंड हो रहा है | Trending & Viral in India",
  description: "अभी भारत में क्या वायरल है — ट्रेंडिंग टॉपिक, viral न्यूज़ और सोशल मीडिया buzz, छोटे कार्ड्स में। मुद्दा देश का Viral।",
  alternates: { canonical: `${SITE}/viral` },
};

function ViralCard({ v, lang }) {
  const related = Array.isArray(v.related) ? v.related : [];
  const headline = related[0]?.title || v.topic;
  const blurb = viralBlurb(v, lang);
  const img = v.image || related[0]?.image || null;
  const sources = [...new Set(related.map((r) => r.source).filter(Boolean))].slice(0, 3);
  const readUrl = related[0]?.url;

  return (
    <article className="snap-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div className="relative h-48 w-full overflow-hidden bg-zinc-100 sm:h-56">
        <Avatar src={img} label={v.topic} />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-gradient-to-r from-orange-500 to-brand-red px-2.5 py-1 text-xs font-bold text-white shadow">
            🔥 {v.traffic ? `${v.traffic} सर्च` : "ट्रेंडिंग"}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-1.5 flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-semibold text-orange-600">ट्रेंडिंग</span>
          {v.trended_at && <span>· {viralTimeAgo(v.trended_at)}</span>}
        </div>
        <h2 className="text-lg font-extrabold leading-snug text-zinc-900">{headline}</h2>
        <p className="mt-2 leading-7 text-zinc-700">{blurb}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 text-xs">
          {sources.length > 0 && (
            <span className="text-zinc-500">स्रोत: <span className="font-medium text-zinc-700">{sources.join(", ")}</span></span>
          )}
          {readUrl && (
            <a href={readUrl} target="_blank" rel="noopener noreferrer nofollow"
               className="ml-auto inline-flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-1.5 font-semibold text-white transition hover:bg-brand-blue-dark">
              विस्तार से पढ़ें →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function ViralPage({ searchParams }) {
  const sp = await searchParams;
  const lang = normalizeLang(sp?.lang);
  const period = sp?.period === "week" ? "week" : "today";
  const items = await getViral({ period });

  const tabHref = (p) => `/viral?period=${p}${lang !== "hinglish" ? `&lang=${lang}` : ""}`;
  const tabs = [
    { p: "today", label: "आज" },
    { p: "week", label: "इस हफ्ते" },
  ];

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang={lang} basePath="/viral" activeCat="viral" />

      <section className="bg-gradient-to-r from-orange-500 via-brand-red to-brand-red-dark px-4 py-7 text-white">
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-extrabold sm:text-3xl">🔥 अभी क्या वायरल है</h1>
          <p className="mt-1 text-sm text-orange-50">भारत के ट्रेंडिंग टॉपिक · viral न्यूज़ · सोशल बज़ — एक नज़र में</p>
        </div>
      </section>

      <main className="mx-auto max-w-xl px-4 py-5">
        {/* Period tabs */}
        <div className="mb-4 flex items-center gap-2">
          {tabs.map((t) => (
            <a key={t.p} href={tabHref(t.p)}
               className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                 t.p === period ? "bg-brand-red text-white shadow" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
               }`}>
              {t.label}
            </a>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">अभी ट्रेंडिंग डेटा तैयार हो रहा है — थोड़ी देर में वापस आएँ।</p>
        ) : (
          <div className="flex snap-y flex-col gap-4">
            {items.map((v) => <ViralCard key={v.slug} v={v} lang={lang} />)}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">ट्रेंड्स Google Trends (India) से · सारांश AI द्वारा, तथ्यों पर आधारित।</p>
      </main>

      <SiteFooter lang={lang} />
    </div>
  );
}

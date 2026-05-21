import { notFound } from "next/navigation";
import { getStateNews, normalizeLang } from "@/lib/news";
import { findState, citySlug } from "@/lib/locations";
import { Card, hrefFor } from "@/components/ui";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const state = findState(slug);
  if (!state) return { title: "मुद्दा देश का" };
  return {
    title: `${state.name_hi} की ताज़ा खबरें — ${state.name_en} News`,
    description: `${state.name_hi} की ताज़ा खबरें, ब्रेकिंग न्यूज़, राजनीति और हर ज़िले के अपडेट — मुद्दा देश का पर।`,
    alternates: { canonical: `${SITE}/state/${slug}` },
  };
}

export default async function StatePage({ params, searchParams }) {
  const { slug } = await params;
  const lang = normalizeLang((await searchParams)?.lang);
  const data = await getStateNews(slug, lang);
  if (!data) notFound();

  const { state, items } = data;

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang={lang} basePath={`/state/${slug}`} activeCat="home" />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-3 text-xs text-zinc-500">
          <a href={hrefFor("/", lang)} className="hover:text-brand-blue">होम</a>
        </nav>

        <div className="mb-5 flex items-center gap-3 border-b-2 border-zinc-200 pb-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900">{state.name_hi} की ताज़ा खबरें</h1>
            <p className="text-sm text-zinc-500">{state.name_en} · {items.length} खबरें</p>
          </div>
        </div>

        {/* Cities in this state */}
        <div className="mb-6 flex flex-wrap gap-2">
          {state.cities.map((c) => (
            <a key={c} href={hrefFor(`/city/${citySlug(c)}`, lang)}
               className="rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-blue shadow-sm ring-1 ring-zinc-200 hover:bg-brand-blue hover:text-white">
              {c}
            </a>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">अभी {state.name_hi} की कोई खबर उपलब्ध नहीं है।</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((it) => <Card key={it.guid} it={it} lang={lang} />)}
          </div>
        )}
      </main>

      <SiteFooter lang={lang} />
    </div>
  );
}

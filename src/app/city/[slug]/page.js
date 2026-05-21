import { notFound } from "next/navigation";
import { getCityNews, normalizeLang } from "@/lib/news";
import { findCity } from "@/lib/locations";
import { Card, hrefFor } from "@/components/ui";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const city = findCity(slug);
  if (!city) return { title: "मुद्दा देश का" };
  return {
    title: `${city.name} की ताज़ा खबरें — Latest ${city.name} News`,
    description: `${city.name} की ताज़ा खबरें, ब्रेकिंग न्यूज़, राजनीति, अपराध और लोकल अपडेट — मुद्दा देश का पर।`,
    alternates: { canonical: `${SITE}/city/${slug}` },
  };
}

export default async function CityPage({ params, searchParams }) {
  const { slug } = await params;
  const lang = normalizeLang((await searchParams)?.lang);
  const data = await getCityNews(slug, lang);
  if (!data) notFound();

  const { city, items } = data;

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang={lang} basePath={`/city/${slug}`} activeCat="home" />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-3 text-xs text-zinc-500">
          <a href={hrefFor("/", lang)} className="hover:text-brand-blue">होम</a>
          {" · "}
          <a href={hrefFor(`/state/${city.stateSlug}`, lang)} className="hover:text-brand-blue">{city.stateName_hi}</a>
        </nav>

        <div className="mb-6 flex items-center gap-3 border-b-2 border-zinc-200 pb-3">
          <span className="text-2xl">📍</span>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900">{city.name} की ताज़ा खबरें</h1>
            <p className="text-sm text-zinc-500">{city.stateName_hi} · {items.length} खबरें</p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">अभी {city.name} की कोई खबर उपलब्ध नहीं है।</p>
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

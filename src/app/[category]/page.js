import { notFound } from "next/navigation";
import { getCategoryNews, normalizeLang } from "@/lib/news";
import { CAT, Card } from "@/components/ui";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { category } = await params;
  const c = CAT[category];
  return { title: c ? `${c.label} — मुद्दा देश का` : "मुद्दा देश का" };
}

export default async function CategoryPage({ params, searchParams }) {
  const { category } = await params;
  const lang = normalizeLang((await searchParams)?.lang);

  const data = await getCategoryNews(category, lang);
  if (!data) notFound();

  const { category: cat, items } = data;
  const accent = CAT[cat.slug]?.color || "bg-brand-red";

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang={lang} basePath={`/${cat.slug}`} activeCat={cat.slug} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3 border-b-2 border-zinc-200 pb-3">
          <span className={`h-7 w-2 rounded ${accent}`} />
          <h1 className="text-2xl font-extrabold text-zinc-900">{cat.name_hi}</h1>
          <span className="ml-auto text-sm text-zinc-400">{items.length} खबरें</span>
        </div>

        {items.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">अभी इस श्रेणी में कोई खबर उपलब्ध नहीं है।</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((it) => <Card key={it.guid} it={it} lang={lang} />)}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

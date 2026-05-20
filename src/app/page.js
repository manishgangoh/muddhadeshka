import { getHomepageSections, timeAgoHi, normalizeLang } from "@/lib/news";
import { CAT, Tag, Card, hrefFor, articleHref, linkProps } from "@/components/ui";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  const lang = normalizeLang((await searchParams)?.lang);
  const { lead, sideStories, byCategory } = await getHomepageSections(lang);
  const tickerItems = [lead, ...sideStories].filter(Boolean);

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang={lang} basePath="/" activeCat="home" />

      {/* Breaking ticker */}
      {tickerItems.length > 0 && (
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 overflow-hidden px-4 py-2">
            <span className="shrink-0 rounded bg-brand-red px-2 py-1 text-xs font-bold text-white">ताज़ा</span>
            <div className="relative flex-1 overflow-hidden">
              <div className="animate-ticker flex w-max gap-10 whitespace-nowrap text-sm text-zinc-700">
                {[...tickerItems, ...tickerItems].map((it, i) => (
                  <span key={i}>• {it.title}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Hero: lead + side list */}
        <section className="mb-10 grid gap-5 lg:grid-cols-3">
          {lead && (
            <a href={articleHref(lead, lang)} {...linkProps(lead)}
               className="group relative col-span-2 overflow-hidden rounded-xl bg-zinc-900 shadow-md">
              <div className="aspect-[16/9] w-full overflow-hidden">
                {lead.image
                  ? <img src={lead.image} alt="" className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-105" />
                  : <div className="flex h-full items-center justify-center text-zinc-500">मुद्दा देश का</div>}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5">
                <Tag slug={lead.category} />
                <h2 className="mt-2 text-2xl font-bold leading-snug text-white group-hover:underline md:text-3xl">{lead.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-200">{lead.summary}</p>
                <span className="mt-2 block text-xs text-zinc-300">{lead.source} · {timeAgoHi(lead.publishedAt)}</span>
              </div>
            </a>
          )}

          <div className="flex flex-col divide-y divide-zinc-200 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
            <h3 className="pb-2 text-sm font-bold text-brand-red">और बड़ी खबरें</h3>
            {sideStories.map((it) => (
              <a key={it.guid} href={articleHref(it, lang)} {...linkProps(it)}
                 className="group flex gap-3 py-3">
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded bg-zinc-100">
                  {it.image
                    ? <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">{it.source}</div>}
                </div>
                <div>
                  <h4 className="text-sm font-semibold leading-snug text-zinc-800 group-hover:text-brand-blue line-clamp-3">{it.title}</h4>
                  <span className="mt-1 block text-[11px] text-zinc-400">{timeAgoHi(it.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Category sections */}
        {byCategory.map((sec) => (
          <section key={sec.slug} className="mb-10">
            <div className="mb-4 flex items-center gap-3 border-b-2 border-zinc-200 pb-2">
              <span className={`h-5 w-1.5 rounded ${CAT[sec.slug]?.color || "bg-brand-red"}`} />
              <h2 className="text-xl font-extrabold text-zinc-900">{CAT[sec.slug]?.label}</h2>
              <a href={hrefFor(`/${sec.slug}`, lang)} className="ml-auto text-sm font-medium text-brand-blue hover:underline">सभी देखें →</a>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {sec.items.map((it) => <Card key={it.guid} it={it} lang={lang} />)}
            </div>
          </section>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}

import { getConfig } from "@/lib/news";
import { getStates, getCities } from "@/lib/locations";
import { Social, hrefFor, CAT } from "@/components/ui";

export default function SiteFooter({ lang = "hi" }) {
  const cfg = getConfig();
  const states = getStates();
  const cities = getCities().slice(0, 24);

  return (
    <footer className="border-t-4 border-brand-red bg-brand-blue-dark text-blue-200">
      {/* Link hub — categories, states, cities (internal linking + SEO) */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-bold text-white">श्रेणियाँ</h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {cfg.categories.map((c) => (
                <a key={c.slug} href={hrefFor(`/${c.slug}`, lang)} className="hover:text-white">{c.name_hi}</a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-white">राज्य</h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {states.map((s) => (
                <a key={s.slug} href={hrefFor(`/state/${s.slug}`, lang)} className="hover:text-white">{s.name_hi}</a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-white">शहर</h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {cities.map((c) => (
                <a key={c.slug} href={hrefFor(`/city/${c.slug}`, lang)} className="hover:text-white">{c.name}</a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-blue-900 py-6 text-center text-sm">
        <p className="text-lg font-bold text-white">मुद्दा देश का</p>
        <div className="mt-3 flex justify-center"><Social links={cfg.site.social} /></div>
        <p className="mt-3">© {new Date().getFullYear()} muddhadeshka.com · सभी खबरें मूल स्रोत से ली गई हैं</p>
      </div>
    </footer>
  );
}

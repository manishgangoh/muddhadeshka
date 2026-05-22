import { getConfig, logoExists } from "@/lib/news";
import { Social, hrefFor } from "@/components/ui";

// basePath = current page path ("/" or "/khel") so language switch stays on same page
// activeCat = slug of current category, or "home"
export default function SiteHeader({ lang = "hi", basePath = "/", activeCat = "home" }) {
  const cfg = getConfig();
  const today = new Date().toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      {/* Top utility bar */}
      <div className="bg-brand-blue-dark text-blue-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 text-xs">
          <span className="hidden shrink-0 md:block">{today}</span>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
              <span className="mr-1 hidden shrink-0 text-blue-300 sm:inline">भाषा:</span>
              {cfg.languages.map((l) => (
                <a key={l.code} href={hrefFor(basePath, l.code)}
                   className={`shrink-0 rounded px-1.5 py-0.5 transition ${
                     l.code === lang ? "bg-white font-bold text-brand-blue-dark" : "text-blue-100 hover:text-white"
                   }`}>
                  {l.name}
                </a>
              ))}
            </div>
            <span className="hidden h-3 w-px shrink-0 bg-blue-700 sm:block" />
            <Social links={cfg.site.social} />
          </div>
        </div>
      </div>

      {/* Masthead */}
      <header className="bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href={hrefFor("/", lang)} className="flex items-center gap-3">
            {logoExists() ? (
              <img src="/logo.png" alt="मुद्दा देश का — muddhadeshka.com" className="h-16 w-auto" />
            ) : (
              <h1 className="text-4xl font-extrabold tracking-tight">
                <span className="text-brand-red">मुद्दा</span> <span className="text-brand-blue">देश का</span>
              </h1>
            )}
            <span className="hidden text-xs tracking-wide text-zinc-500 sm:block">हर खबर · हर राज्य · हर भाषा</span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/viral" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-brand-red px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 2c1 3-1 4-2 6-1 2 0 3 0 3s-2-1-2-3c-2 2-3 4-3 6a7 7 0 1 0 14 0c0-4-3-6-4-9-1 2-2 2-3 1 1-2 2-3 0-5z" />
              </svg>
              Viral
            </a>
            <a href="/jobs" className="flex items-center gap-1.5 rounded-lg bg-brand-red px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-red-dark">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-6 0h-4V5h4v2z" />
              </svg>
              Jobs
            </a>
            <span className="hidden items-center gap-1.5 rounded-full bg-brand-red/10 px-3 py-1 text-xs font-semibold text-brand-red md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-red" /> लाइव
            </span>
          </div>
        </div>
      </header>

      {/* Sticky category nav */}
      <nav className="sticky top-0 z-20 bg-brand-blue shadow">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-1 px-4 py-2.5 text-sm font-semibold text-white">
          <a href={hrefFor("/", lang)}
             className={`pb-0.5 transition hover:text-white ${activeCat === "home" ? "border-b-2 border-white" : "text-blue-100 hover:border-b-2 hover:border-white"}`}>
            होम
          </a>
          <a href="/viral"
             className={`pb-0.5 font-bold transition ${activeCat === "viral" ? "border-b-2 border-white text-white" : "text-amber-200 hover:border-b-2 hover:border-white hover:text-white"}`}>
            🔥 वायरल
          </a>
          {cfg.categories.map((c) => (
            <a key={c.slug} href={hrefFor(`/${c.slug}`, lang)}
               className={`pb-0.5 transition hover:text-white ${activeCat === c.slug ? "border-b-2 border-white" : "text-blue-100 hover:border-b-2 hover:border-white"}`}>
              {c.name_hi}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}

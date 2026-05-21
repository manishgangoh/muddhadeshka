import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Shared wrapper for static info / legal pages
export default function InfoPage({ title, updated = "21 मई 2026", children }) {
  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <SiteHeader lang="hi" basePath="/" activeCat="home" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-9">
          <h1 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">{title}</h1>
          <p className="mt-1 text-xs text-zinc-400">अंतिम अपडेट: {updated}</p>
          <div className="mt-5 space-y-4 leading-8 text-zinc-700 [&_a]:text-brand-blue [&_a]:underline [&_h2]:mt-7 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-zinc-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter lang="hi" />
    </div>
  );
}

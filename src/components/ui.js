import { timeAgoHi } from "@/lib/news";

export const CAT = {
  rajniti: { label: "राजनीति", color: "bg-brand-red" },
  desh: { label: "देश", color: "bg-brand-blue" },
  khel: { label: "खेल", color: "bg-emerald-600" },
  manoranjan: { label: "मनोरंजन", color: "bg-fuchsia-600" },
  business: { label: "बिज़नेस", color: "bg-amber-600" },
  tech: { label: "टेक्नोलॉजी", color: "bg-sky-600" },
  duniya: { label: "दुनिया", color: "bg-indigo-600" },
  swasthya: { label: "स्वास्थ्य", color: "bg-teal-600" },
  vigyan: { label: "विज्ञान", color: "bg-violet-600" },
};

// Build a URL preserving the selected language (hi is default → no param)
export function hrefFor(path, lang) {
  return lang && lang !== "hi" ? `${path}?lang=${lang}` : path;
}

// Where a news item links: our own article page if it's stored (has slug), else the source
export function articleHref(it, lang) {
  return it?.slug ? hrefFor(`/khabar/${it.slug}`, lang) : it?.link;
}
export function linkProps(it) {
  return it?.slug ? {} : { target: "_blank", rel: "noopener noreferrer" };
}

export function Tag({ slug }) {
  const c = CAT[slug];
  if (!c) return null;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold text-white ${c.color}`}>
      {c.label}
    </span>
  );
}

export function Card({ it, lang = "hi" }) {
  return (
    <a href={articleHref(it, lang)} {...linkProps(it)}
       className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="aspect-video overflow-hidden bg-zinc-100">
        {it.image
          ? <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-sm font-semibold text-zinc-300">मुद्दा देश का</div>}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <Tag slug={it.category} />
        <h3 className="mt-1.5 font-semibold leading-snug text-zinc-900 group-hover:text-brand-blue line-clamp-3">{it.title}</h3>
        <span className="mt-auto pt-3 text-xs text-zinc-400">{timeAgoHi(it.publishedAt)}</span>
      </div>
    </a>
  );
}

const SOCIAL_ICONS = {
  instagram: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.5-3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z",
  youtube: "M21.6 7.2s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C16 4 12 4 12 4s-4 0-6.8.3c-.4.1-1.2.1-2 .9-.6.6-.8 2-.8 2S2 8.8 2 10.5v1.9c0 1.7.2 3.3.2 3.3s.2 1.4.8 2c.8.8 1.8.8 2.3.9C7 18.9 12 19 12 19s4 0 6.8-.3c.4-.1 1.2-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.3v-1.9c0-1.7-.2-3.4-.2-3.4zM10 14.6V9l4.7 2.8L10 14.6z",
  facebook: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z",
  twitter: "M18.9 2H22l-7 8 8.2 12H17l-5-7.4L6.3 22H3l7.5-8.6L2.2 2H9l4.5 6.7L18.9 2zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20z",
  whatsapp: "M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.8-.6-3-1.3-5-4.4-5.2-4.6-.1-.2-1.2-1.6-1.2-3.1S6.5 7 6.8 6.7c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5c-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.7-.1l.8-1c.2-.3.4-.2.7-.1l2 .9c.3.1.4.2.5.3.1.2.1.8-.1 1.5z",
};

export function Social({ links }) {
  const order = ["instagram", "youtube", "facebook", "twitter", "whatsapp"];
  return (
    <div className="flex items-center gap-2.5">
      {order.filter((k) => links?.[k]).map((k) => (
        <a key={k} href={links[k]} target="_blank" rel="noopener noreferrer" aria-label={k}
           className="text-blue-200 transition hover:text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d={SOCIAL_ICONS[k]} />
          </svg>
        </a>
      ))}
    </div>
  );
}

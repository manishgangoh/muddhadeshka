// Renders a stored article body. Supports plain-text paragraphs (existing AI
// articles render unchanged) PLUS a safe markdown subset for richer editorial
// pieces: ## / ### headings, "- " bullets, "> " quotes, --- rules, **bold**,
// [text](url) links and bare URLs. Links are real, clickable <a> tags.

function renderInline(text, kp) {
  const nodes = [];
  let k = 0, last = 0, m;
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|(https?:\/\/[^\s)]+)/g;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(<a key={`${kp}-${k++}`} href={m[2]} target="_blank" rel="noopener" className="font-semibold text-brand-blue underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-dark">{m[1]}</a>);
    } else if (m[3]) {
      nodes.push(<strong key={`${kp}-${k++}`}>{m[3]}</strong>);
    } else if (m[4]) {
      nodes.push(<a key={`${kp}-${k++}`} href={m[4]} target="_blank" rel="noopener" className="font-semibold text-brand-blue underline hover:text-brand-blue-dark">{m[4].replace(/^https?:\/\//, "")}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function ArticleBody({ text }) {
  const blocks = (text || "").split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-4 text-[17px] leading-8 text-zinc-800">
      {blocks.map((b, i) => {
        if (/^###\s+/.test(b))
          return <h3 key={i} className="mt-6 text-lg font-bold text-zinc-900">{renderInline(b.replace(/^###\s+/, ""), `h${i}`)}</h3>;
        if (/^##\s+/.test(b))
          return <h2 key={i} className="mt-7 text-xl font-extrabold text-zinc-900 sm:text-2xl">{renderInline(b.replace(/^##\s+/, ""), `h${i}`)}</h2>;
        if (/^>\s+/.test(b))
          return <blockquote key={i} className="border-l-4 border-brand-red bg-rose-50/60 px-4 py-3 font-medium italic text-zinc-700">{renderInline(b.replace(/^>\s+/, ""), `q${i}`)}</blockquote>;
        if (/^---+$/.test(b))
          return <hr key={i} className="my-6 border-zinc-200" />;
        const lines = b.split("\n").map((l) => l.trim());
        if (lines.length && lines.every((l) => /^[-*]\s+/.test(l)))
          return (
            <ul key={i} className="ml-1 space-y-2">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                  <span>{renderInline(l.replace(/^[-*]\s+/, ""), `l${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        return <p key={i}>{renderInline(b, `p${i}`)}</p>;
      })}
    </div>
  );
}

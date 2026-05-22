// AI fallback chain — all providers use the OpenAI-compatible /chat/completions API.
// Preference order: Groq -> Gemini -> OpenRouter -> Cerebras -> Mistral.
// One request hits ONE provider at a time. When a provider hits its rate/quota limit
// it goes on a temporary cooldown and is skipped, so the next provider takes over —
// this spreads load across every free tier and maximises combined throughput.

const PROVIDERS = [
  { name: "groq", env: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
  { name: "gemini", env: "GEMINI_API_KEY", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-2.5-flash-lite" },
  { name: "openrouter", env: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions", model: "meta-llama/llama-3.3-70b-instruct:free" },
  { name: "cerebras", env: "CEREBRAS_API_KEY", url: "https://api.cerebras.ai/v1/chat/completions", model: "llama-3.1-8b" },
  { name: "mistral", env: "MISTRAL_API_KEY", url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest" },
];

// Cooldown state survives hot-reloads / shares across requests in one server process
const state = (globalThis._mdkAi ||= { cooldownUntil: {} });

function configured() {
  return PROVIDERS.filter((p) => process.env[p.env]).map((p) => ({ ...p, key: process.env[p.env] }));
}

// Ready providers (not cooling down) first in preference order; cooled ones kept as last resort
function pickOrder() {
  const now = Date.now();
  const all = configured();
  const ready = all.filter((p) => (state.cooldownUntil[p.name] || 0) <= now);
  const cooling = all.filter((p) => (state.cooldownUntil[p.name] || 0) > now);
  return [...ready, ...cooling];
}

function cooldownMs(status, msg) {
  if (status === 429 && /quota|exhaust|exceeded/i.test(msg)) return 30 * 60 * 1000; // daily quota → 30 min
  if (status === 429) return 60 * 1000; // per-minute rate limit → 1 min
  if (status >= 500 || status === 0) return 30 * 1000; // server error / timeout → 30 s
  return 10 * 60 * 1000; // bad model / other 4xx → 10 min
}

async function callProvider(p, messages, { temperature = 0.6, maxTokens = 1200 } = {}) {
  const res = await fetch(p.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
    body: JSON.stringify({ model: p.model, messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(`${res.status} ${t.slice(0, 120)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error("empty response");
    err.status = 0;
    throw err;
  }
  return content;
}

// Try providers one by one until one succeeds. On limit/error, cool that provider down
// and move to the next. Returns { text, provider } or throws if all are exhausted.
export async function aiChat(messages, opts = {}) {
  const errors = [];
  for (const p of pickOrder()) {
    try {
      const text = await callProvider(p, messages, opts);
      delete state.cooldownUntil[p.name]; // recovered → clear any cooldown
      return { text, provider: p.name };
    } catch (e) {
      const status = e.status ?? 0;
      state.cooldownUntil[p.name] = Date.now() + cooldownMs(status, e.message || "");
      errors.push(`${p.name}:${status}`);
    }
  }
  throw new Error(`All AI providers exhausted/failed: ${errors.join(" | ")}`);
}

// Inspect current provider availability (for debugging / a status endpoint)
export function aiStatus() {
  const now = Date.now();
  return configured().map((p) => ({
    provider: p.name,
    ready: (state.cooldownUntil[p.name] || 0) <= now,
    cooldownSec: Math.max(0, Math.ceil(((state.cooldownUntil[p.name] || 0) - now) / 1000)),
  }));
}

// Remove stray placeholder wrappers some models echo, e.g. <title>..</title> or (..)
function clean(s) {
  return s
    .replace(/^<\/?[a-z_]+>\s*/i, "")
    .replace(/\s*<\/?[a-z_]+>$/i, "")
    .replace(/^\((.*)\)$/s, "$1")
    .trim();
}

// Parse the delimiter format (robust for multi-paragraph non-Latin text, unlike JSON)
function parseStructured(text) {
  const grab = (start, end) => {
    const s = text.indexOf(start);
    if (s === -1) return "";
    const from = s + start.length;
    const e = end ? text.indexOf(end, from) : -1;
    return text.slice(from, e === -1 ? undefined : e).trim();
  };
  const title = clean(grab("###TITLE###", "###METATITLE###"));
  const metaTitle = clean(grab("###METATITLE###", "###METADESC###"));
  const metaDesc = clean(grab("###METADESC###", "###BODY###"));
  const body = clean(grab("###BODY###", "###POINTS###"));
  const pointsRaw = grab("###POINTS###", null);
  const keyPoints = pointsRaw
    .split("\n")
    .map((l) => clean(l.replace(/^[-*•\d.\s]+/, "")))
    .filter((l) => l && !/^<\/?[a-z_]+>$/i.test(l));
  return { title, metaTitle, metaDesc, body, keyPoints };
}

const LANG_NAME = { hi: "हिन्दी (Hindi)", en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil", te: "Telugu", gu: "Gujarati", kn: "Kannada", ml: "Malayalam", pa: "Punjabi" };

// Rewrite news into an ORIGINAL full article (legal: own words, not a copy).
// `sources` = [{ name, text }] — full texts of the SAME story from one or more outlets.
// With multiple sources the AI MERGES their facts into one comprehensive article.
// Strictly fact-bound: no invented facts → the news content does not change.
export async function rewriteArticle({ title, summary, source, lang = "hi", sources = [] }) {
  const langName = LANG_NAME[lang] || "हिन्दी";
  const usable = (sources || []).filter((s) => s.text && s.text.length > 250).slice(0, 3);
  const multi = usable.length > 1;
  const hasFull = usable.length >= 1;

  const system = `You are a professional news editor for an Indian news website. Write in ${langName} in your OWN words — never copy any source verbatim. Be factual, neutral, clear and DETAILED — include every important fact, name, number, date, quote and background detail present in the source(s); do not leave out information.${
    hasFull ? " Use ONLY facts present in the provided source report(s). Do NOT invent, guess, or add any fact, name, number or quote that is not in the sources." : ""
  }${multi ? " The reports below are about the SAME event from different outlets — combine ALL their facts into ONE comprehensive article, including unique details each outlet reports; avoid repetition and do not contradict them." : ""}`;

  let sourceBlock;
  if (multi) {
    sourceBlock = usable.map((s, i) => `[Source ${i + 1}: ${s.name}]\n"""\n${s.text.slice(0, 4500)}\n"""`).join("\n\n");
  } else if (hasFull) {
    sourceBlock = `Source article text (${usable[0].name}):\n"""\n${usable[0].text}\n"""`;
  } else {
    sourceBlock = `Source headline: "${title}"\nSource summary: "${summary || ""}"\nSource: ${source || "news agency"}`;
  }

  const lengthHint = hasFull
    ? "a detailed, complete article (about 450-750 words) that covers ALL the important facts and details from the source(s)"
    : "a 250-400 word article";

  const user = `${sourceBlock}

Write an ORIGINAL, DETAILED news article in ${langName}, in your own words. Cover all the important information — do not over-summarise. Also write SEO fields. Use EXACTLY this format, keep the ### markers, and write content directly on the lines after each marker (no angle brackets or placeholders):
###TITLE###
a clear rewritten headline in ${langName}
###METATITLE###
an SEO page title in ${langName}, max 60 characters, most important keywords first
###METADESC###
an SEO meta description in ${langName}, 140-155 characters, compelling and keyword-rich
###BODY###
${lengthHint} in ${langName}, in 4-7 well-structured paragraphs
###POINTS###
- key point in ${langName}
- key point in ${langName}
- key point in ${langName}
- key point in ${langName}`;

  const { text, provider } = await aiChat(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { temperature: 0.6, maxTokens: 3000 }
  );
  const parsed = parseStructured(text);
  const finalTitle = parsed.title || title;
  return {
    title: finalTitle,
    metaTitle: (parsed.metaTitle || finalTitle).slice(0, 65),
    metaDesc: (parsed.metaDesc || parsed.body || "").replace(/\s+/g, " ").slice(0, 160),
    body: parsed.body || "",
    keyPoints: parsed.keyPoints.length ? parsed.keyPoints : [],
    provider,
    mergedSources: usable.map((s) => s.name),
  };
}

// Parse a simple TITLE/BODY/POINTS response (for translations)
function parseTransl(text) {
  const grab = (s, e) => {
    const i = text.indexOf(s);
    if (i === -1) return "";
    const from = i + s.length;
    const j = e ? text.indexOf(e, from) : -1;
    return text.slice(from, j === -1 ? undefined : j).trim();
  };
  return {
    title: clean(grab("###TITLE###", "###BODY###")),
    body: clean(grab("###BODY###", "###POINTS###")),
    keyPoints: grab("###POINTS###", null).split("\n").map((l) => clean(l.replace(/^[-*•\d.\s]+/, ""))).filter((l) => l && !/^<\/?[a-z_]+>$/i.test(l)),
  };
}

const STYLE = {
  hinglish: "Hinglish — Hindi written in Roman (English) letters, natural conversational Indian style. Keep important English/technical/proper words in English. Example tone: \"Government ne nayi AI policy launch ki hai, jisse startups ko fayda hoga.\"",
  en: "natural, fluent English",
  hi: "natural Hindi in Devanagari script",
};

// Translate an already-written article into another language/style (keeps facts identical)
export async function translateArticle({ title, body, keyPoints = [], targetLang }) {
  const style = STYLE[targetLang] || STYLE.hinglish;
  const system = `You are a translator/localiser for an Indian news website. Rewrite the given article into ${style}. Keep ALL facts, names and numbers exactly the same — only change the language/style. Do not add or remove information.`;
  const user = `Translate this into ${style}. Keep the EXACT format with ### markers (no angle brackets):
###TITLE###
${title}
###BODY###
${body}
###POINTS###
${keyPoints.map((p) => "- " + p).join("\n")}`;
  const { text } = await aiChat(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { temperature: 0.4, maxTokens: 3000 }
  );
  const p = parseTransl(text);
  return { title: p.title || title, body: p.body || body, keyPoints: p.keyPoints.length ? p.keyPoints : keyPoints };
}

// Batch-translate many headlines in one call (for listing pages). Returns same-length array.
export async function translateTitles(titles, targetLang = "hinglish") {
  if (!titles.length) return [];
  const style = STYLE[targetLang] || STYLE.hinglish;
  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");
  try {
    const { text } = await aiChat(
      [
        { role: "system", content: `Translate each news headline into ${style}. Keep facts/names exact. Output ONLY the numbered list, one headline per line, with the SAME numbers.` },
        { role: "user", content: numbered },
      ],
      { temperature: 0.3, maxTokens: 2000 }
    );
    const map = {};
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*(\d+)[.):]\s*(.+)$/);
      if (m) map[+m[1]] = clean(m[2]);
    }
    return titles.map((t, i) => map[i + 1] || t);
  } catch {
    return titles; // on failure, keep originals
  }
}

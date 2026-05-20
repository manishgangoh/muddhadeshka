// Group articles that report the SAME story across different sources,
// using significant-word overlap between headlines (free, no embeddings).

const STOP = new Set([
  // Hindi
  "है", "हैं", "था", "थी", "थे", "की", "का", "के", "को", "में", "से", "पर", "और", "भी", "कि", "एक",
  "तो", "ने", "ये", "वो", "यह", "वह", "इस", "उस", "हो", "गया", "गई", "रहा", "रही", "रहे", "लिए", "साथ",
  "बाद", "क्या", "कैसे", "क्यों", "कौन", "जो", "हुआ", "हुई", "करने", "किया", "होगा", "होगी", "नहीं", "अब",
  // English
  "the", "a", "an", "of", "to", "in", "on", "and", "for", "is", "are", "was", "were", "with", "at",
  "by", "from", "this", "that", "as", "it", "be", "has", "have", "will", "after", "over", "new", "live",
]);

export function tokenize(title = "") {
  return [...new Set(
    title
      .toLowerCase()
      .split(/[\s,.;:!?–—\-|"'`()\[\]{}।:#@/\\]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !STOP.has(t))
  )];
}

// Overlap score between two token sets: shared count + Jaccard
function score(aTokens, bSet) {
  let shared = 0;
  for (const t of aTokens) if (bSet.has(t)) shared++;
  const union = new Set([...aTokens, ...bSet]).size || 1;
  return { shared, jaccard: shared / union };
}

// From candidates, return those that are the SAME story as `article`.
// A match needs at least `minShared` shared significant words OR strong Jaccard.
export function findSameStory(article, candidates, { minShared = 3, minJaccard = 0.34, max = 3 } = {}) {
  const aTokens = tokenize(article.title);
  if (aTokens.length < 2) return [];
  const aSet = new Set(aTokens);

  const scored = candidates
    .map((c) => ({ ...c, ...score(tokenize(c.title), aSet) }))
    .filter((c) => c.shared >= minShared || c.jaccard >= minJaccard)
    .sort((x, y) => y.shared - x.shared || y.jaccard - x.jaccard);

  // de-dup by source so we merge DIFFERENT outlets, not the same outlet twice
  const seenSource = new Set([article.source_name]);
  const picked = [];
  for (const c of scored) {
    if (seenSource.has(c.source_name)) continue;
    seenSource.add(c.source_name);
    picked.push(c);
    if (picked.length >= max) break;
  }
  return picked;
}

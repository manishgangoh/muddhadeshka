"use client";
import { useEffect } from "react";

// When a story isn't pre-warmed yet, ask the server to build the full AI article
// (a real request, so it's reliable in dev + prod), then reload to show it.
// Retries once on failure; after that the page keeps showing the source summary.
export default function GenerateArticle({ slug }) {
  useEffect(() => {
    let cancelled = false;
    async function run(attempt) {
      try {
        const res = await fetch(`/api/article/generate?slug=${encodeURIComponent(slug)}`);
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (j.ready) { location.reload(); return; }
        if (attempt < 1) setTimeout(() => run(attempt + 1), 4000);
      } catch {
        if (!cancelled && attempt < 1) setTimeout(() => run(attempt + 1), 4000);
      }
    }
    run(0);
    return () => { cancelled = true; };
  }, [slug]);
  return null;
}

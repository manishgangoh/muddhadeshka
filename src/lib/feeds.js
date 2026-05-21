import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { googleNewsTopicUrl } from "./rss.js";

let _config;
export function getConfig() {
  if (!_config) {
    _config = JSON.parse(readFileSync(path.join(process.cwd(), "config/sources.json"), "utf8"));
  }
  return _config;
}

export function logoExists() {
  return existsSync(path.join(process.cwd(), "public/logo.png"));
}

export const SUPPORTED_LANGS = ["hi", "hinglish", "en", "mr", "bn", "ta", "te", "gu", "kn", "ml", "pa"];
export const DEFAULT_LANG = "hinglish"; // site defaults to Hinglish
export function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

// All feed definitions for a given language (publisher feeds, else Google News topics)
export function feedDefsForLang(cfg, lang) {
  const local = cfg.rssFeeds.filter((f) => f.lang === lang).map((f) => ({ ...f, type: "article" }));
  if (local.length >= 3) return local;

  return cfg.categories
    .filter((c) => c.googleTopic)
    .map((c) => ({
      url: googleNewsTopicUrl(c.googleTopic, lang),
      source: "Google News",
      lang,
      category: c.slug,
      type: "article",
    }));
}

export function dedupe(items) {
  const seen = new Set();
  return items.filter((it) => {
    const key = (it.title || "").toLowerCase().slice(0, 60);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function timeAgoHi(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "अभी";
  if (m < 60) return `${m} मिनट पहले`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} घंटे पहले`;
  const d = Math.floor(h / 24);
  return `${d} दिन पहले`;
}

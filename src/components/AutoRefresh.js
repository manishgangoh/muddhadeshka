"use client";
import { useEffect } from "react";

// While the full AI article is being generated in the background, reload the page
// after `seconds` so the finished article appears on its own. Capped at `max`
// attempts (via sessionStorage) so a failed/slow generation never loops forever.
export default function AutoRefresh({ seconds = 18, max = 4 }) {
  useEffect(() => {
    const key = "ar:" + location.pathname;
    const n = Number(sessionStorage.getItem(key) || 0);
    if (n >= max) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(key, String(n + 1));
      location.reload();
    }, seconds * 1000);
    return () => clearTimeout(t);
  }, [seconds, max]);
  return null;
}

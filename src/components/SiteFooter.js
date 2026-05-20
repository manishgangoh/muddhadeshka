import { getConfig } from "@/lib/news";
import { Social } from "@/components/ui";

export default function SiteFooter() {
  const cfg = getConfig();
  return (
    <footer className="border-t-4 border-brand-red bg-brand-blue-dark py-8 text-center text-sm text-blue-200">
      <p className="text-lg font-bold text-white">मुद्दा देश का</p>
      <div className="mt-3 flex justify-center"><Social links={cfg.site.social} /></div>
      <p className="mt-3">© {new Date().getFullYear()} muddhadeshka.com · सभी खबरें मूल स्रोत से ली गई हैं</p>
      <p className="mt-1 text-xs text-blue-300">किसी भी खबर पर क्लिक करने पर पूरी खबर मूल स्रोत पर खुलेगी</p>
    </footer>
  );
}

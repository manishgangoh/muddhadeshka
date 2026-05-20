import { Geist, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoHindi = Noto_Sans_Devanagari({
  variable: "--font-noto-hi",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://muddhadeshka.vercel.app"),
  title: {
    default: "मुद्दा देश का — ताज़ा हिंदी समाचार | देश, राजनीति, खेल, मनोरंजन",
    template: "%s — मुद्दा देश का",
  },
  description: "देश-दुनिया, राजनीति, खेल, मनोरंजन, बिज़नेस की ताज़ा खबरें — हर राज्य, हर शहर, हर भाषा में। मुद्दा देश का पर पढ़ें पूरी खबर।",
  keywords: ["हिंदी समाचार", "ताज़ा खबर", "Hindi news", "breaking news", "राजनीति", "खेल", "मनोरंजन", "muddhadeshka"],
  openGraph: {
    type: "website", siteName: "मुद्दा देश का", locale: "hi_IN",
    title: "मुद्दा देश का — ताज़ा हिंदी समाचार",
    description: "देश-दुनिया, राजनीति, खेल, मनोरंजन की ताज़ा खबरें — हर भाषा में।",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="hi"
      className={`${geistSans.variable} ${notoHindi.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

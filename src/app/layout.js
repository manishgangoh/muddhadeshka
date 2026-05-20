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
  title: "Mudda Desh Ka — ताज़ा हिंदी और इंग्लिश समाचार",
  description: "देश-दुनिया, राजनीति, खेल, मनोरंजन, बिज़नेस की ताज़ा खबरें — हर राज्य, हर शहर, हर भाषा में।",
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

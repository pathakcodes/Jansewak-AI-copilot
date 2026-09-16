import type { Metadata } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-body",
  subsets: ["devanagari"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const generalSans = localFont({
  src: "../public/fonts/general-sans-variable.woff2",
  variable: "--font-interface",
  display: "swap",
  weight: "200 700",
});

export const metadata: Metadata = {
  title: "जनसेवक JanSewak | सरकारी काम में, आपके साथ",
  description:
    "Ask in your language for help with government websites, forms and document preparation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hi"
      className={`${notoDevanagari.variable} ${generalSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

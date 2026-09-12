import type { Metadata } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-body",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "जनसेवक JanSewak — आपकी अपनी सरकारी सहायक",
  description:
    "Talk to JanSewak in any Indian language and get guided, step by step, through any government website — train tickets, PF, Aadhaar, complaints and more.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hi" className={`${notoDevanagari.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

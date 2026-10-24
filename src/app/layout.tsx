import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import MadeByR from "@/components/MadeByR";
// 1. Import the Analytics component
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display face: headings, labels, buttons and badges only. Body text uses Geist for easier reading.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  title: "Verify News | AI Fact-Checking Tool",
  description: "Paste any news article URL or headline to get an instant forensic analysis, trust score, and fact-check powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased bg-white text-slate-900`}>
        <main>
          {children}
        </main>
        <footer className="flex justify-center px-4 py-6 text-xs text-slate-500">
          <MadeByR />
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
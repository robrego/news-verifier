'use client';

import { Bookmark, Link2, Smartphone } from 'lucide-react';
import { BookmarkletLink } from '@/components/BookmarkletLink';
import { SiteHeader, useTheme } from '@/components/SiteHeader';

export function ToolsShell() {
  const [isDark, setIsDark] = useTheme();

  const strong = isDark ? 'text-white' : 'text-slate-950';
  const body = isDark ? 'text-slate-300' : 'text-slate-700';
  const label = isDark ? 'text-slate-300' : 'text-slate-600';
  const card = `rounded-3xl border p-6 sm:p-8 ${isDark ? 'border-white/10 bg-[#151517]' : 'border-slate-200 bg-white'}`;
  const h2 = `font-display flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] ${label}`;
  const code = `rounded px-1.5 py-0.5 text-[13px] ${isDark ? 'bg-white/10' : 'bg-slate-100'}`;

  return (
    <main className={`min-h-screen p-4 sm:p-6 lg:p-24 transition-colors duration-700 ${isDark ? 'bg-[#0A0A0B] text-white' : 'bg-[#F9FAFF] text-slate-900'}`}>
      <div className="mx-auto max-w-7xl">
        <SiteHeader isDark={isDark} onToggle={() => setIsDark(!isDark)} active="tools" />

        <div className="max-w-3xl">
          <h1 className={`font-display text-4xl font-bold tracking-tight sm:text-5xl ${strong}`}>Check things where you read them</h1>
          <p className={`mt-4 text-lg leading-relaxed ${label}`}>Two shortcuts so you never have to copy and paste into the site by hand.</p>

          <section className={`mt-12 ${card}`}>
            <h2 className={h2}>
              <Bookmark className="h-4 w-4 text-blue-500" aria-hidden />
              On a computer: the bookmarklet
            </h2>
            <p className={`mt-4 text-[16px] leading-relaxed ${body}`}>
              Drag this button to your bookmarks bar. On any article, click it to check that page. If you have selected some text first, it checks the selection instead, which is handy for a claim inside a longer post.
            </p>
            <div className="mt-6">
              <BookmarkletLink isDark={isDark} />
            </div>
            <p className={`mt-4 text-[14px] leading-relaxed ${label}`}>
              No bookmarks bar? Right-click the button, copy the link, and add it as a new bookmark manually.
            </p>
          </section>

          <section className={`mt-6 ${card}`}>
            <h2 className={h2}>
              <Smartphone className="h-4 w-4 text-blue-500" aria-hidden />
              On a phone: add to home screen
            </h2>
            <p className={`mt-4 text-[16px] leading-relaxed ${body}`}>
              On Android with Chrome, open the menu and choose Install app or Add to Home screen. After that, Verify News appears in the share sheet of other apps, so you can share a post or link to it directly.
            </p>
            <p className={`mt-3 text-[14px] leading-relaxed ${label}`}>
              iPhone does not support sharing into web apps yet. There, copy the link, open Verify News and paste it, or upload a screenshot of the post.
            </p>
          </section>

          <section className={`mt-6 ${card}`}>
            <h2 className={h2}>
              <Link2 className="h-4 w-4 text-blue-500" aria-hidden />
              Direct links
            </h2>
            <p className={`mt-4 text-[16px] leading-relaxed ${body}`}>
              Any link of the form <code className={code}>/?q=your claim or a URL</code> opens Verify News and runs the check straight away.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

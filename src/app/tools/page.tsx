import type { Metadata } from 'next';
import { BookmarkletLink } from '@/components/BookmarkletLink';
import Link from 'next/link';
import { ArrowLeft, Bookmark, Link2, Smartphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tools | Verify News',
  description: 'Check any page or selected text with one click, or share to Verify News from your phone.',
};

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-[#F9FAFF] px-4 py-12 text-slate-900 sm:px-6 lg:px-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-display inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] text-blue-700">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Verify News
        </Link>
        <h1 className="font-display mt-8 text-4xl font-bold tracking-tight sm:text-5xl">Check things where you read them</h1>
        <p className="mt-4 text-lg text-[16px] leading-relaxed text-slate-700">
          Two shortcuts so you never have to copy and paste into the site by hand.
        </p>

        <section className="mt-12 rounded-3xl border border-slate-100 bg-white p-6 sm:p-8">
          <h2 className="font-display flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-600">
            <Bookmark className="h-4 w-4 text-blue-500" aria-hidden />
            On a computer: the bookmarklet
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-700">
            Drag this button to your bookmarks bar. On any article, click it to check that page. If you have selected some text first, it checks the selection instead, which is handy for a claim inside a longer post.
          </p>
          <div className="mt-6">
            <BookmarkletLink />
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-slate-600">
            No bookmarks bar? Right-click the button, copy the link, and add it as a new bookmark manually.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 sm:p-8">
          <h2 className="font-display flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-600">
            <Smartphone className="h-4 w-4 text-blue-500" aria-hidden />
            On a phone: add to home screen
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-700">
            On Android with Chrome, open the menu and choose Install app or Add to Home screen. After that, Verify News appears in the share sheet of other apps, so you can share a post or link to it directly.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
            iPhone does not support sharing into web apps yet. There, copy the link, open Verify News and paste it, or upload a screenshot of the post.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 sm:p-8">
          <h2 className="font-display flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-600">
            <Link2 className="h-4 w-4 text-blue-500" aria-hidden />
            Direct links
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-700">
            Any link of the form <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">/?q=your claim or a URL</code> opens Verify News and runs the check straight away.
          </p>
        </section>
      </div>
    </main>
  );
}

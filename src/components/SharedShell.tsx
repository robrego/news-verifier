'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import { ResultView, type ResultData } from '@/components/ResultView';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export function SharedShell({ data, query, checkedAt }: { data: ResultData; query: string; checkedAt: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <main className={`min-h-screen p-4 sm:p-6 lg:p-24 transition-colors duration-700 ${spaceGrotesk.className} ${isDark ? 'bg-[#0A0A0B] text-white' : 'bg-[#F9FAFF] text-slate-900'}`}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 sm:mb-20 flex items-center justify-between w-full">
          <Link href="/" className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isDark ? 'text-white' : 'text-blue-600'}`}>
            Verify News
          </Link>
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle dark mode"
            className={`relative flex items-center w-11 h-6 rounded-full border transition-all duration-500 ${isDark ? 'bg-zinc-800 border-white/10' : 'bg-slate-200 border-slate-300'}`}
          >
            <div className={`absolute w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${isDark ? 'left-[22px] bg-blue-500' : 'left-[4px] bg-white'}`} />
          </button>
        </header>

        <section className="mb-10 sm:mb-14">
          <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>Shared result, checked {checkedAt}</p>
          <h1 className="mt-4 max-w-4xl text-2xl sm:text-4xl font-bold leading-tight tracking-tight break-words">{query}</h1>
        </section>

        <ResultView data={data} isDark={isDark} />

        <footer className={`mt-16 text-center text-[12px] ${muted}`}>
          <p>This is a saved AI-assisted check, not a live one. Sources may have changed since.</p>
          <Link
            href="/"
            className={`mt-6 inline-block rounded-2xl px-8 py-4 font-bold uppercase text-[13px] tracking-[0.15em] ${isDark ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-slate-950 text-white hover:bg-blue-500'}`}
          >
            Check something yourself
          </Link>
        </footer>
      </div>
    </main>
  );
}

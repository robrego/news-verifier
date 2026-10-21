'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarCheck, Moon, Sun } from 'lucide-react';
import { ResultView, type ResultData } from '@/components/ResultView';

export function SharedShell({ data, query, checkedAt }: { data: ResultData; query: string; checkedAt: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const muted = isDark ? 'text-slate-300' : 'text-slate-600';

  return (
    <main className={`min-h-screen p-4 sm:p-6 lg:p-24 transition-colors duration-700 ${isDark ? 'bg-[#0A0A0B] text-white' : 'bg-[#F9FAFF] text-slate-900'}`}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 sm:mb-20 flex items-center justify-between w-full">
          <Link href="/" className={`font-display inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.12em] font-bold ${isDark ? 'text-white' : 'text-blue-700'}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Verify News
          </Link>
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle dark mode"
            className={`relative flex items-center w-12 h-7 rounded-full border transition-all duration-500 ${isDark ? 'bg-zinc-800 border-white/15' : 'bg-slate-200 border-slate-300'}`}
          >
            <span className={`absolute flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 shadow-sm ${isDark ? 'left-[24px] bg-blue-500 text-white' : 'left-[4px] bg-white text-amber-500'}`}>
              {isDark ? <Moon className="h-3 w-3" aria-hidden /> : <Sun className="h-3 w-3" aria-hidden />}
            </span>
          </button>
        </header>

        <section className="mb-10 sm:mb-14">
          <p className={`font-display inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] ${muted}`}>
            <CalendarCheck className="h-4 w-4" aria-hidden />
            Shared result, checked {checkedAt}
          </p>
          <h1 className="font-display mt-4 max-w-4xl text-2xl sm:text-4xl font-bold leading-tight tracking-tight break-words">{query}</h1>
        </section>

        <ResultView data={data} isDark={isDark} />

        <footer className={`mt-16 text-left text-[14px] ${muted}`}>
          <p>This is a saved AI-assisted check, not a live one. Sources may have changed since.</p>
          <Link
            href="/"
            className={`font-display mt-6 inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-bold uppercase text-[14px] tracking-[0.12em] ${isDark ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-slate-950 text-white hover:bg-blue-500'}`}
          >
            Check something yourself
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </footer>
      </div>
    </main>
  );
}

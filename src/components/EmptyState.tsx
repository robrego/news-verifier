'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearHistory, loadHistory, type HistoryItem } from '@/lib/history';
import { dailyExamples, todayIndex, SATIRE_EXAMPLE, type Example } from '@/lib/examples';

const STEPS = [
  { n: '1', title: 'Paste', body: 'A headline, a claim, or a link to an article.' },
  { n: '2', title: 'We search', body: 'Live web sources and published fact-checks are gathered first.' },
  { n: '3', title: 'You judge', body: 'A plain verdict plus every source, so you can check it yourself.' },
];

export function EmptyState({ isDark, onPick }: { isDark: boolean; onPick: (text: string) => void }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Server and first client render use day 0, then the real day is applied, so there is no hydration mismatch.
  const [examples, setExamples] = useState<Example[]>(() => [...dailyExamples(0), SATIRE_EXAMPLE]);
  useEffect(() => {
    setHistory(loadHistory());
    setExamples([...dailyExamples(todayIndex()), SATIRE_EXAMPLE]);
  }, []);

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const card = isDark
    ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
    : 'bg-white border-slate-100 hover:border-blue-500/30 shadow-sm shadow-slate-200/30';

  return (
    <div className="space-y-16 sm:space-y-24">
      <section aria-label="Try an example">
        <h2 className={`mb-5 text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>Not sure where to start? Try one (new ones daily)</h2>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {examples.map((e, i) => (
            <button
              key={e.text}
              onClick={() => onPick(e.text)}
              className={`flex flex-col items-start justify-start text-left rounded-2xl border p-5 sm:p-6 transition-all active:scale-[0.98] ${card}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-500">{i === 0 ? `Claim of the day · ${e.tag}` : e.tag}</span>
              <span className={`mt-3 block text-[15px] font-medium leading-snug break-words ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {e.text.startsWith('http') ? new URL(e.text).hostname.replace('www.', '') : `“${e.text}”`}
              </span>
              <span className={`mt-3 block text-[12px] ${muted}`}>{e.note}</span>
            </button>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section aria-label="Your recent checks">
          <div className="mb-5 flex items-center justify-between">
            <h2 className={`text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>Your recent checks</h2>
            <button
              onClick={() => { clearHistory(); setHistory([]); }}
              className={`text-[11px] font-bold uppercase tracking-[0.15em] ${muted} hover:text-rose-500`}
            >
              Clear
            </button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {history.map((h) => (
              <li key={h.share}>
                <Link href={`/r/${h.share}`} className={`flex items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all ${card}`}>
                  <span className={`truncate text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{h.q}</span>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${isDark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-600'}`}>{h.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className={`mt-3 text-[11px] ${muted}`}>Saved only in this browser. Opening one is instant and uses no quota.</p>
        </section>
      )}

      <section aria-label="How it works">
        <h2 className={`mb-5 text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>How it works</h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${isDark ? 'border-white/10 bg-white/5 text-blue-400' : 'border-slate-100 bg-white text-blue-600'}`}>{s.n}</span>
              <div>
                <p className={`text-[15px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{s.title}</p>
                <p className={`mt-1 text-[13px] leading-relaxed ${muted}`}>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className={`mt-8 text-[12px] leading-relaxed ${muted}`}>
          Free to use, no account and no database of what you check. The verdict is an AI estimate from the sources shown, never a guarantee.
        </p>
      </section>
    </div>
  );
}

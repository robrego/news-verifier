'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Brain, CloudLightning, Drama, FlaskConical, HeartPulse, History, Landmark, Newspaper, PawPrint, Rocket,
  Scale, Search, ClipboardPaste, Sparkles, Utensils, X, type LucideIcon,
} from 'lucide-react';
import { clearHistory, loadHistory, type HistoryItem } from '@/lib/history';
import { dailyExamples, todayIndex, SATIRE_EXAMPLE, type Example } from '@/lib/examples';

const TAG_ICON: Record<string, LucideIcon> = {
  'Popular myth': Brain,
  Space: Rocket,
  Health: HeartPulse,
  Weather: CloudLightning,
  Animals: PawPrint,
  History: Landmark,
  Science: FlaskConical,
  Food: Utensils,
  Satire: Drama,
};

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ClipboardPaste, title: 'Paste', body: 'A headline, a claim, or a link to an article. Screenshots work too.' },
  { icon: Search, title: 'We search', body: 'Live web sources and published fact-checks are gathered first.' },
  { icon: Scale, title: 'You judge', body: 'A plain verdict plus every source, so you can check it yourself.' },
];

export function EmptyState({ isDark, onPick }: { isDark: boolean; onPick: (text: string) => void }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Server and first client render use day 0, then the real day is applied, so there is no hydration mismatch.
  const [examples, setExamples] = useState<Example[]>(() => [...dailyExamples(0), SATIRE_EXAMPLE]);
  useEffect(() => {
    setHistory(loadHistory());
    setExamples([...dailyExamples(todayIndex()), SATIRE_EXAMPLE]);
  }, []);

  const strong = isDark ? 'text-slate-100' : 'text-slate-900';
  const body = isDark ? 'text-slate-300' : 'text-slate-700';
  const label = isDark ? 'text-slate-300' : 'text-slate-600';
  const card = isDark
    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
    : 'bg-white border-slate-200 hover:border-blue-500/40 shadow-sm shadow-slate-200/40';
  const tile = isDark ? 'border-white/10 bg-white/5 text-blue-400' : 'border-blue-100 bg-blue-50 text-blue-600';
  const heading = `font-display mb-5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] ${label}`;

  return (
    <div className="space-y-16 sm:space-y-24 text-left">
      <section aria-label="Try an example">
        <h2 className={heading}>
          <Sparkles className="h-4 w-4 text-blue-500" aria-hidden />
          Not sure where to start? Try one <span className="font-normal opacity-70">(new ones daily)</span>
        </h2>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {examples.map((e, i) => {
            const Icon = TAG_ICON[e.tag] ?? Newspaper;
            return (
              <button
                key={e.text}
                onClick={() => onPick(e.text)}
                className={`flex flex-col items-start justify-start gap-4 rounded-2xl border p-5 sm:p-6 text-left transition-all active:scale-[0.98] ${card}`}
              >
                <span className="flex w-full items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tile}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className={`font-display text-[12px] font-bold uppercase tracking-[0.12em] ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {i === 0 ? 'Claim of the day' : e.tag}
                  </span>
                </span>
                <span className={`block break-words text-[17px] font-medium leading-snug ${strong}`}>
                  {e.text.startsWith('http') ? new URL(e.text).hostname.replace('www.', '') : `“${e.text}”`}
                </span>
                <span className={`block text-[14px] leading-relaxed ${label}`}>{e.note}</span>
              </button>
            );
          })}
        </div>
      </section>

      {history.length > 0 && (
        <section aria-label="Your recent checks">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className={`${heading} !mb-0`}>
              <History className="h-4 w-4 text-blue-500" aria-hidden />
              Your recent checks
            </h2>
            <button
              onClick={() => { clearHistory(); setHistory([]); }}
              className={`font-display inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] hover:text-rose-500 ${label}`}
            >
              <X className="h-4 w-4" aria-hidden />
              Clear
            </button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {history.map((h) => (
              <li key={h.share}>
                <Link href={`/r/${h.share}`} className={`flex items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all ${card}`}>
                  <span className={`truncate text-[15px] font-medium ${strong}`}>{h.q}</span>
                  <span className={`font-display shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${isDark ? 'border-white/15 text-slate-200' : 'border-slate-300 text-slate-700'}`}>{h.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className={`mt-3 text-[13px] ${label}`}>Saved only in this browser. Opening one is instant and uses no quota.</p>
        </section>
      )}

      <section aria-label="How it works">
        <h2 className={heading}>
          <Newspaper className="h-4 w-4 text-blue-500" aria-hidden />
          How it works
        </h2>
        <ol className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.title} className="flex gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tile}`}>
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className={`font-display text-[17px] font-bold ${strong}`}>{s.title}</p>
                <p className={`mt-1 text-[15px] leading-relaxed ${body}`}>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className={`mt-10 text-[14px] leading-relaxed ${label}`}>
          Free to use, no account and no database of what you check. The verdict is an AI estimate from the sources shown, never a guarantee.
        </p>
      </section>
    </div>
  );
}

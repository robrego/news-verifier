'use client';

import { ArrowUpRight, BadgeCheck, Globe, SearchX } from 'lucide-react';
import type { Evidence } from '@/lib/search';
import { loadedWording } from '@/lib/headline';

type Tier = 'established' | 'reference' | 'tabloid' | 'satire' | 'unknown';

const BADGE: Record<Tier, { light: string; dark: string }> = {
  established: { light: 'bg-blue-50 text-blue-700 border-blue-200', dark: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  reference: { light: 'bg-indigo-50 text-indigo-700 border-indigo-200', dark: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  tabloid: { light: 'bg-amber-50 text-amber-800 border-amber-200', dark: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  satire: { light: 'bg-rose-50 text-rose-700 border-rose-200', dark: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  unknown: { light: 'bg-slate-50 text-slate-600 border-slate-200', dark: 'bg-white/5 text-slate-300 border-white/15' },
};

const SHORT_LABEL: Record<Tier, string> = {
  established: 'Established',
  reference: 'Reference',
  tabloid: 'Tabloid style',
  satire: 'Satire',
  unknown: 'Unrated',
};

function Badge({ tier, isDark, title }: { tier: Tier; isDark: boolean; title: string }) {
  const c = BADGE[tier];
  return (
    <span
      title={title}
      className={`font-display inline-block shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${isDark ? c.dark : c.light}`}
    >
      {SHORT_LABEL[tier]}
    </span>
  );
}

export function EvidenceRail({ evidence, isDark, wide = false }: { evidence: Evidence; isDark: boolean; wide?: boolean }) {
  const { sources, factChecks } = evidence;

  // One contrast scale for the whole rail: strong titles, readable body, quiet labels.
  const strong = isDark ? 'text-slate-100' : 'text-slate-900';
  const body = isDark ? 'text-slate-300' : 'text-slate-700';
  const label = isDark ? 'text-slate-300' : 'text-slate-600';

  if (sources.length === 0 && factChecks.length === 0) {
    return (
      <div className={`flex items-start gap-3 rounded-2xl border p-6 text-[15px] leading-relaxed ${isDark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
        <SearchX className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        No live sources were found for this claim. Treat the result with extra care.
      </div>
    );
  }

  const card = `group block rounded-2xl border p-5 transition-all ${
    isDark ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]' : 'bg-white border-slate-200 hover:border-blue-500/40 shadow-sm shadow-slate-200/40'
  }`;
  const list = wide ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3';
  const heading = `font-display flex items-center gap-2 mb-4 text-[12px] font-bold uppercase tracking-[0.14em] ${label}`;

  return (
    <div className="space-y-8">
      {factChecks.length > 0 && (
        <section aria-label="Existing fact-checks">
          <h3 className={heading}>
            <BadgeCheck className="h-4 w-4 text-blue-500" aria-hidden />
            Existing fact-checks
          </h3>
          <div className={list}>
            {factChecks.map((f) => (
              <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className={card}>
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-[15px] font-semibold ${strong}`}>{f.publisher}</span>
                  <span className={`font-display shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${isDark ? 'border-white/15 bg-white/5 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    {f.rating}
                  </span>
                </div>
                <p className={`mt-3 text-[11px] font-bold uppercase tracking-[0.1em] ${label}`}>Claim reviewed</p>
                <p className={`mt-1 text-[15px] leading-relaxed line-clamp-3 ${body}`}>{f.claim}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {sources.length > 0 && (
        <section aria-label="Sources checked">
          <h3 className={heading}>
            <Globe className="h-4 w-4 text-blue-500" aria-hidden />
            Sources checked <span className="opacity-70">({sources.length})</span>
          </h3>
          <div className={list}>
            {sources.map((s) => {
              const loaded = loadedWording(s.title);
              return (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className={card}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`flex min-w-0 items-center gap-1.5 text-[15px] font-semibold ${strong}`}>
                      <span className="truncate">{s.domain}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" aria-hidden />
                    </span>
                    <Badge tier={s.reputation.tier} isDark={isDark} title={s.reputation.label} />
                  </div>
                  <p className={`mt-3 text-[15px] font-medium leading-snug line-clamp-2 ${strong}`}>{s.title}</p>
                  {loaded.length > 0 && (
                    <p className={`mt-2 text-[12px] font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Loaded wording: {loaded.slice(0, 2).join(', ')}</p>
                  )}
                  {s.description && (
                    <p className={`mt-2 text-[14px] leading-relaxed line-clamp-3 ${body}`}>{s.description}</p>
                  )}
                </a>
              );
            })}
          </div>
          <p className={`mt-4 text-[13px] leading-relaxed ${label}`}>
            Outlet labels are a general reputation, not a verdict on this story. Open the sources and judge for yourself.
          </p>
        </section>
      )}
    </div>
  );
}

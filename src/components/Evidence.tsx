'use client';

import type { Evidence } from '@/lib/search';

type Tier = 'established' | 'reference' | 'tabloid' | 'satire' | 'unknown';

const BADGE: Record<Tier, { light: string; dark: string }> = {
  established: { light: 'bg-blue-50 text-blue-600 border-blue-100', dark: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  reference: { light: 'bg-indigo-50 text-indigo-600 border-indigo-100', dark: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' },
  tabloid: { light: 'bg-amber-50 text-amber-700 border-amber-100', dark: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  satire: { light: 'bg-rose-50 text-rose-600 border-rose-100', dark: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  unknown: { light: 'bg-slate-50 text-slate-500 border-slate-200', dark: 'bg-white/5 text-slate-400 border-white/10' },
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
      className={`inline-block shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${isDark ? c.dark : c.light}`}
    >
      {SHORT_LABEL[tier]}
    </span>
  );
}

export function EvidenceRail({ evidence, isDark, wide = false }: { evidence: Evidence; isDark: boolean; wide?: boolean }) {
  const { sources, factChecks } = evidence;
  if (sources.length === 0 && factChecks.length === 0) {
    return (
      <div className={`rounded-2xl border p-6 text-[14px] leading-relaxed ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
        No live sources were found for this claim. Treat the result with extra care.
      </div>
    );
  }

  const card = `block rounded-2xl border p-5 transition-all ${
    isDark ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]' : 'bg-white border-slate-100 hover:border-blue-500/30 shadow-sm shadow-slate-200/20'
  }`;
  const list = wide ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const strong = isDark ? 'text-slate-200' : 'text-slate-800';

  return (
    <div className="space-y-8">
      {factChecks.length > 0 && (
        <section aria-label="Existing fact-checks">
          <h3 className={`mb-4 text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>Existing fact-checks</h3>
          <div className={list}>
            {factChecks.map((f) => (
              <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className={card}>
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-[13px] font-semibold ${strong}`}>{f.publisher}</span>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    {f.rating}
                  </span>
                </div>
                <p className={`mt-3 text-[10px] font-bold uppercase tracking-[0.12em] opacity-70 ${muted}`}>Claim reviewed</p>
                <p className={`mt-1 text-[13px] leading-relaxed line-clamp-3 ${muted}`}>{f.claim}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {sources.length > 0 && (
        <section aria-label="Sources checked">
          <h3 className={`mb-4 text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>
            Sources checked <span className="opacity-60">({sources.length})</span>
          </h3>
          <div className={list}>
            {sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className={card}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`truncate text-[13px] font-semibold ${strong}`}>{s.domain}</span>
                  <Badge tier={s.reputation.tier} isDark={isDark} title={s.reputation.label} />
                </div>
                <p className={`mt-3 text-[14px] font-medium leading-snug line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{s.title}</p>
                {s.description && (
                  <p className={`mt-2 text-[13px] leading-relaxed line-clamp-3 ${muted}`}>{s.description}</p>
                )}
              </a>
            ))}
          </div>
          <p className={`mt-4 text-[11px] leading-relaxed ${muted}`}>
            Outlet labels are a general reputation, not a verdict on this story. Open the sources and judge for yourself.
          </p>
        </section>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { EvidenceRail } from '@/components/Evidence';
import type { Evidence } from '@/lib/search';
import { checkWording } from '@/lib/headline';

export type ResultData = {
  score: number;
  sentiment: string;
  analysis: string;
  evidence?: Evidence;
  degraded?: boolean;
  notice?: string;
  share?: string;
  query?: string;
};

import type { Tone } from '@/lib/result';
import { getBand, summaryOf } from '@/lib/result';

const TONE: Record<Tone, { text: string; bar: string }> = {
  blue: { text: 'text-blue-500', bar: 'bg-blue-500' },
  amber: { text: 'text-amber-500', bar: 'bg-amber-400' },
  rose: { text: 'text-rose-500', bar: 'bg-rose-500' },
  slate: { text: 'text-slate-400', bar: 'bg-slate-400' },
};

// Splits text at periods and adds paragraph spacing.
function formatSentences(rawText: string) {
  if (!rawText) return null;
  const sentences = rawText.split(/\.\s+/);
  return sentences.map((sentence, index) => {
    const isLast = index === sentences.length - 1;
    const displaySentence = isLast ? sentence : `${sentence}.`;
    return (
      <span key={index} className="block mb-4 last:mb-0">
        {displaySentence}
      </span>
    );
  });
}

function renderParsedAnalysis(text: string, isDark: boolean, hide?: RegExp) {
  if (!text) return null;

  const sections = text.replace(/Trust Score[:\s*]*\d+/gi, '').split(/\*\*(.*?)\*\*/g);
  const coreAnalysis = sections.slice(1);

  // No structured sections: the verdict banner already shows the summary.
  if (coreAnalysis.length === 0) return null;

  return (
    <div className="grid grid-cols-12 gap-y-0">
      {coreAnalysis.map((part, i) => {
        // Sections the evidence rail already shows (as structured cards) are skipped.
        const ownTitle = (coreAnalysis[i - (i % 2)] || '').replace(/[:*]/g, '').trim().toLowerCase();
        if (hide && hide.test(ownTitle)) return null;

        if (i % 2 === 0) {
          const title = part.replace(/[:*]/g, '').trim();
          const lower = title.toLowerCase();
          let icon = '○';
          let color = isDark ? 'text-slate-500' : 'text-slate-400';

          if (lower.includes('fallacy')) { icon = '⚠️'; color = 'text-rose-500'; }
          else if (lower.includes('consensus')) { icon = '✓'; color = 'text-blue-500'; }
          else if (lower.includes('evidence')) { icon = '📊'; color = 'text-amber-500'; }
          else if (lower.includes('verdict')) { icon = '⚖️'; color = 'text-blue-500'; }
          else if (lower.includes('sources')) { icon = '🔗'; color = 'text-blue-500'; }

          return (
            <div key={i} className={`col-span-12 ${i === 0 ? '' : 'mt-10 sm:mt-14'} mb-6 sm:mb-8 flex items-center gap-4 sm:gap-5`}>
              <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'} ${color}`}>
                {icon}
              </span>
              <h3 className={`font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</h3>
              <div className={`flex-grow h-[1px] ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}></div>
            </div>
          );
        }

        const bullets = part.trim()
          .split(/[\n•]+|\*(?=\s)/)
          .map((b) => b.replace(/^[•\-\*]\s*/, '').trim())
          .filter((b) => b.length > 0);

        return (
          <div key={i} className={`col-span-12 grid grid-cols-1 ${bullets.length > 1 ? 'md:grid-cols-2' : ''} gap-4 sm:gap-5`}>
            {bullets.map((bullet, idx) => {
              const content = bullet.trim();

              const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
              if (urlMatch !== null) {
                const finalUrl = urlMatch[0];
                let domainText = finalUrl;
                try {
                  domainText = new URL(finalUrl).hostname.replace('www.', '');
                } catch {
                  domainText = finalUrl.split('/')[2] || finalUrl;
                }

                return (
                  <a key={idx} href={finalUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-4 p-5 sm:p-6 border rounded-2xl transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:border-blue-500/30'}`}>
                    <span className="text-blue-500 text-lg flex-shrink-0">🔗</span>
                    <span className={`text-[12px] sm:text-[13px] font-medium tracking-tight truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{domainText}</span>
                  </a>
                );
              }

              const lowerContent = content.toLowerCase();
              const isNegative = lowerContent.includes('missing') || lowerContent.includes('risk') || lowerContent.includes('fallacy') || lowerContent.includes('low');
              const isPositive = lowerContent.includes('verified') || lowerContent.includes('credible') || lowerContent.includes('high') || lowerContent.includes('none identified');

              const dotColor = isNegative ? 'bg-rose-500' : isPositive ? 'bg-blue-500' : 'bg-slate-400';
              const borderColor = isPositive
                ? (isDark ? 'border-blue-500/30' : 'border-blue-500/20')
                : (isNegative ? (isDark ? 'border-rose-500/20' : 'border-rose-500/10') : (isDark ? 'border-white/5' : 'border-slate-100'));

              return (
                <div key={idx} className={`border p-6 sm:p-8 rounded-2xl transition-all ${isDark ? 'bg-white/[0.02]' : 'bg-white'} ${borderColor}`}>
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0 mt-2`} />
                    <p className={`text-[1rem] sm:text-[1.05rem] leading-relaxed ${isPositive ? 'font-medium' : 'font-normal'} ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {formatSentences(content)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ShareButton({ token, title, isDark }: { token: string; title: string; isDark: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [url, setUrl] = useState('');

  const share = async () => {
    const link = `${window.location.origin}/r/${token}`;
    setUrl(link);
    try {
      if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title, url: link });
        return;
      }
    } catch (e) {
      // User dismissed the share sheet: nothing to do.
      if ((e as Error)?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('manual');
    }
  };

  return (
    <div className="flex flex-col items-start sm:items-end gap-2">
      <button
        onClick={share}
        className={`rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-all active:scale-95 ${
          isDark ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-500/40 hover:text-blue-600'
        }`}
      >
        {state === 'copied' ? 'Link copied' : 'Share result'}
      </button>
      {state === 'manual' && (
        <input
          readOnly
          value={url}
          aria-label="Share link"
          onFocus={(e) => e.currentTarget.select()}
          className={`w-full sm:w-72 rounded-lg border px-3 py-2 text-[12px] ${isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}
        />
      )}
    </div>
  );
}

export function ResultView({ data, isDark }: { data: ResultData; isDark: boolean }) {
  const band = getBand(data);
  const tone = band ? TONE[band.tone] : null;
  const summary = summaryOf(data.analysis);
  const evidence = data.evidence;
  const hide = data.degraded
    ? /sources investigated|existing fact-check|source reliability/
    : /sources investigated|existing fact-check/;
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const analysisNode = data.degraded ? null : renderParsedAnalysis(data.analysis, isDark, evidence ? hide : /sources investigated$/);
  const showAnalysis = analysisNode !== null;
  const wording = data.query && !data.degraded ? checkWording(data.query) : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
      {/* VERDICT BANNER */}
      <div className={`mb-8 sm:mb-10 rounded-[1.5rem] sm:rounded-3xl border p-8 sm:p-12 ${isDark ? 'bg-[#151517] border-white/5' : 'bg-white border-slate-100 shadow-sm shadow-blue-500/[0.02]'}`}>
        <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-4">
          <span className={`text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.2em] ${muted}`}>
            {data.degraded ? 'Evidence only' : 'Verdict'}
          </span>
          {data.share && !data.degraded && (
            <ShareButton token={data.share} title={band ? `${band.label}: ${summary}`.slice(0, 120) : 'Verify News result'} isDark={isDark} />
          )}
        </div>

        {band && tone ? (
          <div className={`mt-4 text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight ${tone.text}`}>{band.label}</div>
        ) : (
          <div className={`mt-4 text-3xl sm:text-5xl font-bold leading-[1.05] tracking-tight ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
            Review the sources
          </div>
        )}

        {summary && (
          <p className={`mt-6 max-w-3xl text-xl sm:text-2xl font-medium leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {summary}
          </p>
        )}

        {wording.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="Wording check">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>Wording check</span>
            {wording.map((f) => (
              <span
                key={f.kind}
                title={f.kind === 'absolute' ? 'Claims that say always, never or everyone are rarely fully true.' : 'Emotional or shouting language is common in misleading posts. It says nothing about whether the claim is true.'}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${isDark ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-amber-100 bg-amber-50 text-amber-700'}`}
              >
                {f.kind === 'loaded' || f.kind === 'absolute' ? `${f.label}: ${f.hits.join(', ')}` : f.label}
              </span>
            ))}
          </div>
        )}

        {data.degraded ? (
          <p className={`mt-6 text-[14px] leading-relaxed ${isDark ? 'text-amber-200/80' : 'text-amber-800'}`}>
            {data.notice ?? 'The AI summary is unavailable right now.'} No score is shown because it would be a guess.
          </p>
        ) : band && tone && band.tone !== 'slate' && band.label !== 'Satire' ? (
          <div className="mt-8 max-w-md">
            <div className="flex items-baseline justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>Likelihood it is true</span>
              <span className={`text-sm font-bold tabular-nums ${muted}`}>{data.score} / 100</span>
            </div>
            <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
              <div className={`h-full transition-all duration-[1.5s] ${tone.bar}`} style={{ width: `${data.score}%` }} />
            </div>
            <p className={`mt-3 text-[12px] leading-relaxed ${muted}`}>
              An AI estimate based on the sources listed with this result. It is not a measurement, so check them yourself.
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-12 gap-8 sm:gap-10">
        {showAnalysis && (
          <div className={`col-span-12 ${evidence ? 'lg:col-span-8' : ''} rounded-[1.5rem] sm:rounded-3xl border p-6 sm:p-8 md:p-12 backdrop-blur-sm ${
            isDark ? 'bg-gradient-to-br from-white/[0.04] to-transparent border-white/5' : 'bg-gradient-to-br from-white to-blue-50/30 border-white shadow-sm shadow-slate-200/20'
          }`}>
            {analysisNode}
          </div>
        )}

        {evidence && (
          <aside className={`col-span-12 ${showAnalysis ? 'lg:col-span-4 h-fit lg:sticky lg:top-12' : ''}`}>
            <EvidenceRail evidence={evidence} isDark={isDark} wide={!showAnalysis} />
          </aside>
        )}
      </div>
    </div>
  );
}

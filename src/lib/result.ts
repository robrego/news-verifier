// Small, client-safe helpers for turning the model's text into UI values.

export function scoreOf(text: string): number {
  const m = text.match(/Trust Score:\s*(\d+)/i);
  const n = m ? parseInt(m[1], 10) : 50;
  return Math.max(0, Math.min(100, n));
}

export function sentimentOf(score: number): string {
  if (score > 75) return 'Verified';
  if (score < 40) return 'Suspicious';
  return 'Analyzed';
}

export type Tone = 'blue' | 'amber' | 'rose' | 'slate';
export type Band = { label: string; tone: Tone };

// Plain-language bands replace a bare 0-100 number as the headline of a result.
export function getBand(d: { score: number; analysis: string; degraded?: boolean }): Band | null {
  if (d.degraded) return null;
  if (d.score === 0 && /satir/i.test(d.analysis)) return { label: 'Satire', tone: 'rose' };
  if (/^\s*inconclusive/i.test(d.analysis)) return { label: 'Not enough evidence', tone: 'slate' };
  if (d.score >= 75) return { label: 'Well supported', tone: 'blue' };
  if (d.score >= 40) return { label: 'Mixed or unclear', tone: 'amber' };
  return { label: 'Likely false or misleading', tone: 'rose' };
}

export function summaryOf(text: string): string {
  return text.replace(/Trust Score[:\s*]*\d+/gi, '').split('**')[0].trim();
}


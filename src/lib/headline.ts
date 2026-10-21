// Local, free wording check. It looks at HOW a claim or headline is written, never at whether it is true.
// Loaded language and absolute claims are common in misleading posts, so they are worth a second look.

export type WordingFlag = { kind: 'loaded' | 'caps' | 'exclaim' | 'absolute'; label: string; hits: string[] };

const LOADED = [
  'shocking', 'shocked', 'slams', 'slammed', 'destroys', 'destroyed', 'obliterates', 'bombshell', 'exposed',
  'you won\'t believe', 'will blow your mind', 'mind-blowing', 'unbelievable', 'outrage', 'meltdown', 'epic fail',
  'what happens next', 'doctors hate', 'this one trick', 'they don\'t want you to know', 'goes viral', 'miracle',
  'secret', 'horrifying', 'terrifying', 'disgusting', 'insane', 'jaw-dropping', 'explosive', 'devastating',
  'must see', 'wake up', 'cover-up', 'coverup', 'hoax', 'scam',
];

const ABSOLUTE = ['always', 'never', 'everyone', 'nobody', 'no one', '100%', 'guaranteed', 'proven', 'cures', 'cure for'];

// Real acronyms that are normally written in capitals.
const ACRONYMS = new Set(['NASA', 'NATO', 'COVID', 'FIFA', 'UEFA', 'OPEC', 'UNESCO', 'UNICEF', 'FBI', 'CIA', 'WHO', 'BBC', 'CNN', 'USA', 'OECD', 'ECB', 'NBA', 'NFL', 'NHL', 'SARS', 'AIDS', 'HIV', 'ISIS', 'IRAN']);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function checkWording(text: string): WordingFlag[] {
  const t = text.slice(0, 400);
  const lower = t.toLowerCase();
  const flags: WordingFlag[] = [];

  const loaded = LOADED.filter((w) => new RegExp(`(^|[^a-z])${esc(w)}([^a-z]|$)`, 'i').test(lower));
  if (loaded.length) flags.push({ kind: 'loaded', label: 'Loaded wording', hits: loaded.slice(0, 4) });

  const caps = (t.match(/\b[A-Z]{4,}\b/g) ?? []).filter((w) => !ACRONYMS.has(w));
  if (caps.length >= 2) flags.push({ kind: 'caps', label: 'ALL CAPS', hits: caps.slice(0, 3) });

  if (/!/.test(t)) flags.push({ kind: 'exclaim', label: 'Exclamation marks', hits: ['!'] });

  const abs = ABSOLUTE.filter((w) => new RegExp(`(^|[^a-z])${esc(w)}([^a-z]|$)`, 'i').test(lower));
  if (abs.length) flags.push({ kind: 'absolute', label: 'Absolute wording', hits: abs.slice(0, 3) });

  return flags;
}

// For source headlines only: emotional framing, not absolutes.
export function loadedWording(text: string): string[] {
  return checkWording(text)
    .filter((f) => f.kind !== 'absolute')
    .flatMap((f) => f.hits.filter((h) => h !== '!'));
}

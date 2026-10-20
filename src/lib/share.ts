import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { deflateSync, inflateSync } from 'zlib';
import type { Evidence, Source, FactCheck } from './search';
import { classifyDomain, domainOf } from './sources';

// Stateless share links: the result itself travels in the URL, compressed and signed.
// No database, no extra service, no cost. The signature stops anyone forging a
// "Verified" verdict, which matters for a fact-checking tool: only results this
// server produced can be shared, and any edit to a link invalidates it.

export type SharedResult = {
  query: string;
  text: string;
  ts: number;
  evidence: Evidence;
};

type Compact = {
  v: 1;
  q: string; // what was checked
  t: string; // analysis text
  ts: number; // checked at (ms)
  s: [string, string][]; // sources: [url, title]
  f: [string, string, string, string][]; // fact-checks: [claim, publisher, rating, url]
};

const MAX_TOKEN_LENGTH = 8000;
const MAX_INFLATED_BYTES = 24_000;

function secret(): Buffer | null {
  // SHARE_SECRET is best (set it once on Vercel). Falling back to an existing server key
  // means links work with zero setup, at the cost of breaking if that key is rotated.
  const base = process.env.SHARE_SECRET || process.env.GROQ_API_KEY || process.env.BRAVE_API_KEY;
  if (!base) return null;
  return createHash('sha256').update('verify-news-share-v1:' + base).digest();
}

function sign(data: Buffer, key: Buffer): Buffer {
  return createHmac('sha256', key).update(data).digest().subarray(0, 16);
}

function isHttpUrl(u: unknown): u is string {
  if (typeof u !== 'string' || u.length > 600) return false;
  try {
    const p = new URL(u).protocol;
    return p === 'http:' || p === 'https:';
  } catch {
    return false;
  }
}

const cap = (s: unknown, n: number) => String(s ?? '').slice(0, n);

export function createShareToken(input: { query: string; text: string; evidence?: Evidence }): string | null {
  const key = secret();
  if (!key) return null;

  const compact: Compact = {
    v: 1,
    q: cap(input.query, 200),
    t: cap(input.text, 3500),
    ts: Date.now(),
    s: (input.evidence?.sources ?? []).slice(0, 6).map((s) => [cap(s.url, 600), cap(s.title, 120)]),
    f: (input.evidence?.factChecks ?? []).slice(0, 3).map((f) => [cap(f.claim, 160), cap(f.publisher, 60), cap(f.rating, 40), cap(f.url, 600)]),
  };

  const packed = deflateSync(Buffer.from(JSON.stringify(compact), 'utf8'), { level: 9 });
  const token = `${packed.toString('base64url')}.${sign(packed, key).toString('base64url')}`;
  return token.length <= MAX_TOKEN_LENGTH ? token : null;
}

export function readShareToken(token: string): SharedResult | null {
  try {
    const key = secret();
    if (!key || typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) return null;

    const [payload, sig, extra] = token.split('.');
    if (!payload || !sig || extra !== undefined) return null;

    const packed = Buffer.from(payload, 'base64url');
    const given = Buffer.from(sig, 'base64url');
    const expected = sign(packed, key);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

    // Only inflate after the signature checks out, and cap the output size anyway.
    const raw = inflateSync(packed, { maxOutputLength: MAX_INFLATED_BYTES }).toString('utf8');
    const c = JSON.parse(raw) as Partial<Compact>;
    if (c.v !== 1 || typeof c.q !== 'string' || typeof c.t !== 'string' || typeof c.ts !== 'number') return null;
    if (!Array.isArray(c.s) || !Array.isArray(c.f)) return null;

    const sources: Source[] = [];
    for (const row of c.s.slice(0, 6)) {
      if (!Array.isArray(row) || !isHttpUrl(row[0])) continue;
      const domain = domainOf(row[0]);
      sources.push({
        url: row[0],
        title: cap(row[1], 120) || domain,
        description: '',
        domain,
        reputation: classifyDomain(domain),
      });
    }

    const factChecks: FactCheck[] = [];
    for (const row of c.f.slice(0, 3)) {
      if (!Array.isArray(row) || !isHttpUrl(row[3])) continue;
      factChecks.push({ claim: cap(row[0], 160), publisher: cap(row[1], 60), rating: cap(row[2], 40), url: row[3] });
    }

    return {
      query: cap(c.q, 200),
      text: cap(c.t, 3500),
      ts: c.ts,
      evidence: { sources, factChecks, provider: 'none' },
    };
  } catch {
    return null;
  }
}

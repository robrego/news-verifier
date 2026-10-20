import { classifyDomain, domainOf, isBlockedEvidence, type Reputation } from './sources';

export type Source = {
  title: string;
  url: string;
  description: string;
  domain: string;
  reputation: Reputation;
};

export type FactCheck = {
  claim: string;
  claimant?: string;
  publisher: string;
  rating: string;
  url: string;
};

export type Evidence = {
  sources: Source[];
  factChecks: FactCheck[];
  provider: 'brave' | 'gdelt' | 'none';
};

const MAX_SOURCES = 5;

function stripTags(s: unknown): string {
  return String(s ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").trim();
}

// Search engines sometimes index bot-check pages instead of the article. Drop that text.
const INTERSTITIAL = /checking your browser|just a moment|enable javascript|access denied|verify you are (a )?human|captcha|attention required/i;

function cleanSnippet(s: unknown): string {
  const text = stripTags(s);
  return INTERSTITIAL.test(text) ? '' : text;
}

// ---------- Provider 1: Brave (needs BRAVE_API_KEY) ----------
async function searchBrave(query: string): Promise<Source[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return [];
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query.slice(0, 300))}&count=20`,
    {
      headers: { Accept: 'application/json', 'X-Subscription-Token': key },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    }
  );
  if (!res.ok) throw new Error(`Brave status ${res.status}`);
  const data = await res.json();
  const raw: unknown[] = Array.isArray(data?.web?.results) ? data.web.results : [];
  return raw.flatMap((r) => {
    const item = r as { url?: string; title?: string; description?: string };
    if (!item.url) return [];
    const domain = domainOf(item.url);
    return [{
      title: cleanSnippet(item.title) || domain,
      url: item.url,
      description: cleanSnippet(item.description),
      domain,
      reputation: classifyDomain(domain),
    }];
  });
}

// ---------- Provider 2: GDELT DOC API (free, no key) ----------
// Used when Brave has no key, fails, or returns nothing. It returns article titles
// and URLs from news outlets worldwide, with no snippets. Unverified against the live
// API from the build sandbox, so every step is defensive.
async function searchGdelt(query: string): Promise<Source[]> {
  const words = query
    .replace(/["()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8)
    .join(' ');
  if (!words) return [];
  const res = await fetch(
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(words)}&mode=artlist&format=json&maxrecords=20&sort=hybridrel`,
    { cache: 'no-store', signal: AbortSignal.timeout(6000) }
  );
  if (!res.ok) throw new Error(`GDELT status ${res.status}`);
  // When throttled, GDELT answers with plain text instead of JSON.
  const body = await res.text();
  let data: { articles?: unknown[] };
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error('GDELT returned non-JSON (likely throttled)');
  }
  const raw = Array.isArray(data.articles) ? data.articles : [];
  return raw.flatMap((a) => {
    const item = a as { url?: string; title?: string; domain?: string; seendate?: string };
    if (!item.url) return [];
    const domain = domainOf(item.url) || String(item.domain ?? '');
    return [{
      title: cleanSnippet(item.title) || domain,
      url: item.url,
      description: '',
      domain,
      reputation: classifyDomain(domain),
    }];
  });
}

// ---------- Optional: Google Fact Check Tools (free, needs FACTCHECK_API_KEY) ----------
async function searchFactChecks(query: string): Promise<FactCheck[]> {
  const key = process.env.FACTCHECK_API_KEY;
  if (!key) return [];
  const res = await fetch(
    `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query.slice(0, 200))}&pageSize=5&key=${encodeURIComponent(key)}`,
    { cache: 'no-store', signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`Fact Check status ${res.status}`);
  const data = await res.json();
  const claims: unknown[] = Array.isArray(data?.claims) ? data.claims : [];
  const out: FactCheck[] = [];
  for (const c of claims) {
    const claim = c as {
      text?: string;
      claimant?: string;
      claimReview?: { publisher?: { name?: string }; url?: string; textualRating?: string }[];
    };
    const review = claim.claimReview?.[0];
    if (!review?.url || !claim.text) continue;
    out.push({
      claim: claim.text.slice(0, 240),
      claimant: claim.claimant,
      publisher: review.publisher?.name ?? domainOf(review.url),
      rating: review.textualRating ?? 'Reviewed',
      url: review.url,
    });
  }
  return out.slice(0, 3);
}

function pickSources(all: Source[]): Source[] {
  const seen = new Set<string>();
  const picked: Source[] = [];
  for (const s of all) {
    if (isBlockedEvidence(s.url) || seen.has(s.domain)) continue;
    seen.add(s.domain);
    picked.push(s);
    if (picked.length >= MAX_SOURCES) break;
  }
  return picked;
}

/**
 * Gathers evidence with no single point of failure: Brave first, then the keyless
 * GDELT fallback. Fact-check lookup runs in parallel and is purely additive.
 * Never throws; returns empty evidence if everything fails.
 */
export async function gatherEvidence(query: string): Promise<Evidence> {
  const factChecksPromise = searchFactChecks(query).catch((e) => {
    console.error('[evidence] fact-check lookup failed:', e instanceof Error ? e.message : e);
    return [] as FactCheck[];
  });

  let sources: Source[] = [];
  let provider: Evidence['provider'] = 'none';

  try {
    sources = pickSources(await searchBrave(query));
    if (sources.length) provider = 'brave';
  } catch (e) {
    console.error('[evidence] Brave failed:', e instanceof Error ? e.message : e);
  }

  if (sources.length === 0) {
    try {
      sources = pickSources(await searchGdelt(query));
      if (sources.length) provider = 'gdelt';
    } catch (e) {
      console.error('[evidence] GDELT failed:', e instanceof Error ? e.message : e);
    }
  }

  return { sources, factChecks: await factChecksPromise, provider };
}

// ---------- Formatting ----------
export function evidenceForPrompt(ev: Evidence): string {
  if (ev.sources.length === 0 && ev.factChecks.length === 0) return 'No live data found.';
  const parts: string[] = [];
  if (ev.sources.length) {
    parts.push(
      ev.sources
        .map(
          (s, i) =>
            `Source ${i + 1}:\nTitle: ${s.title}\nURL: ${s.url}\nOutlet reputation (general, not proof): ${s.reputation.label}\nSnippet: ${s.description || '(headline only)'}`
        )
        .join('\n\n')
    );
  }
  if (ev.factChecks.length) {
    parts.push(
      'Existing professional fact-checks:\n' +
        ev.factChecks.map((f) => `- ${f.publisher} rated "${f.claim}" as: ${f.rating} (${f.url})`).join('\n')
    );
  }
  return parts.join('\n\n');
}

/**
 * What the user sees when the AI step is unavailable: the evidence itself, in the
 * same section format the page already renders. No score is invented.
 */
export function evidenceOnlyText(ev: Evidence, reason: string): string {
  const lines: string[] = [`${reason} Here is the evidence we found, so you can judge it yourself.`, ''];

  if (ev.factChecks.length) {
    lines.push('**Existing Fact-Checks**');
    for (const f of ev.factChecks) {
      lines.push(`• ${f.publisher}: ${f.rating} for "${f.claim}"`);
    }
    lines.push('');
  }

  lines.push('**Source Reliability & Verdict**');
  for (const s of ev.sources) {
    lines.push(`• ${s.domain}: ${s.reputation.label}.`);
  }
  lines.push('• This is a general reputation, not a verdict on this story.');
  lines.push('');

  lines.push('**Sources Investigated**');
  for (const s of ev.sources) lines.push(`• ${s.url}`);
  for (const f of ev.factChecks) lines.push(`• ${f.url}`);
  return lines.join('\n');
}

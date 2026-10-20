import { headers } from 'next/headers';

// ---------- URL safety (SSRF guard) ----------
// The server fetches URLs that users paste, so refuse anything that is not a
// plain public http(s) address.
const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|.*\.localdomain)$/i;

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

export function isPublicHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (PRIVATE_HOST.test(host)) return false;
    if (isPrivateIPv4(host)) return false;
    // Block IPv6 loopback / link-local / unique-local ranges.
    if (host.includes(':') && /^(::1|fe80|fc|fd)/i.test(host)) return false;
    // Single-label hosts (no dot) are never public sites.
    if (!host.includes('.') && !host.includes(':')) return false;
    return true;
  } catch {
    return false;
  }
}

// ---------- Free, best-effort rate limit ----------
// In-memory, so it is per warm serverless instance rather than global. It still
// stops casual abuse and loops at zero cost. Upstash (free tier) can replace it later.
const hits = new Map<string, number[]>();

export async function allowRequest(scope: string, limit: number, windowMs: number): Promise<boolean> {
  let ip = 'unknown';
  try {
    const h = await headers();
    ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  } catch {
    // headers() unavailable outside a request; fall through with 'unknown'.
  }
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    hits.forEach((v, k) => {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    });
  }
  return true;
}

// ---------- Result cache ----------
// Repeat checks of the same headline or URL cost nothing. Free tier quotas are
// small (200K tokens/day per model), so this matters.
const cache = new Map<string, { value: string; expires: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 200;

export function cacheKey(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function cacheGet(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

export function cacheSet(key: string, value: string) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

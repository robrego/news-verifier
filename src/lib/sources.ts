// Local, dependency-free knowledge about news sources.
// This is a general-reputation hint, never a verdict on a specific story, and the
// UI says so. Keeping it local means it works with no API, no quota and no latency.

export type Tier = 'established' | 'reference' | 'tabloid' | 'satire' | 'unknown';

export type Reputation = { tier: Tier; label: string };

const norm = (d: string) => d.toLowerCase().replace(/^www\./, '');

// Wire services, public broadcasters, major newspapers, science and public bodies,
// and dedicated fact-checkers.
const ESTABLISHED = new Set([
  'reuters.com', 'apnews.com', 'afp.com', 'bbc.com', 'bbc.co.uk', 'npr.org', 'pbs.org',
  'theguardian.com', 'nytimes.com', 'washingtonpost.com', 'wsj.com', 'bloomberg.com',
  'ft.com', 'economist.com', 'aljazeera.com', 'dw.com', 'france24.com', 'lemonde.fr',
  'repubblica.it', 'corriere.it', 'ansa.it', 'ilsole24ore.com', 'elpais.com', 'publico.pt',
  'rtp.pt', 'expresso.pt', 'cbc.ca', 'abc.net.au', 'nature.com', 'science.org', 'thelancet.com',
  'who.int', 'cdc.gov', 'nih.gov', 'nasa.gov', 'noaa.gov', 'europa.eu', 'un.org', 'oecd.org',
  'factcheck.org', 'snopes.com', 'politifact.com', 'fullfact.org', 'leadstories.com',
  'factcheck.afp.com', 'pagellapolitica.it', 'openbarometer.org',
  // More mainstream newsrooms and science outlets.
  'cnn.com', 'nbcnews.com', 'cbsnews.com', 'abcnews.go.com', 'usatoday.com', 'latimes.com',
  'politico.com', 'axios.com', 'time.com', 'theatlantic.com', 'newyorker.com', 'independent.co.uk',
  'telegraph.co.uk', 'news.sky.com', 'skynews.com', 'euronews.com', 'spiegel.de', 'zeit.de',
  'tagesschau.de', 'lefigaro.fr', 'rai.it', 'ilpost.it', 'lastampa.it', 'rtve.es', 'elmundo.es',
  'observador.pt', 'sapo.pt', 'scientificamerican.com', 'newscientist.com', 'nationalgeographic.com',
  'smithsonianmag.com', 'skyatnightmagazine.com', 'esa.int', 'space.com', 'sciencenews.org',
  'bmj.com', 'nejm.org', 'ncbi.nlm.nih.gov', 'mayoclinic.org', 'ecdc.europa.eu',
]);

// Encyclopaedias and reference works: good for background, check their own citations.
const REFERENCE = new Set(['wikipedia.org', 'britannica.com', 'wikidata.org', 'wikimedia.org']);

// Tabloid and click-driven outlets: often fine for events, weak for contested claims.
const TABLOID = new Set([
  'dailymail.co.uk', 'thesun.co.uk', 'mirror.co.uk', 'express.co.uk', 'nypost.com',
  'dailystar.co.uk', 'metro.co.uk',
]);

// Outlets that publish satire or fabricated "news" as entertainment.
const SATIRE = new Set([
  'theonion.com', 'clickhole.com', 'babylonbee.com', 'despeld.com', 'thedailymash.co.uk',
  'waterfordwhispersnews.com', 'newsthump.com', 'thebeaverton.com', 'lercio.it',
  'huzlers.com', 'worldnewsdailyreport.com', 'empirenews.net', 'nationalreport.net',
  'dailybuzzlive.com', 'thehardtimes.net', 'reductress.com', 'scrapbook.com',
]);

export function domainOf(url: string): string {
  try {
    return norm(new URL(url).hostname);
  } catch {
    return '';
  }
}

function matches(set: Set<string>, domain: string): boolean {
  const d = norm(domain);
  if (set.has(d)) return true;
  // Match subdomains such as news.bbc.co.uk or edition.cnn.com against the base domain.
  const parts = d.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    if (set.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

export function classifyDomain(domain: string): Reputation {
  if (!domain) return { tier: 'unknown', label: 'Unknown source' };
  if (matches(SATIRE, domain)) return { tier: 'satire', label: 'Satire or parody site' };
  if (matches(ESTABLISHED, domain)) return { tier: 'established', label: 'Established reporting or a public body' };
  if (matches(REFERENCE, domain)) return { tier: 'reference', label: 'Reference work, check its own citations' };
  if (matches(TABLOID, domain)) return { tier: 'tabloid', label: 'Tabloid style outlet, check contested claims' };
  return { tier: 'unknown', label: 'Not in our reputation list' };
}

export function isSatireDomain(domain: string): boolean {
  return matches(SATIRE, domain);
}

// Hosts that are never useful evidence (social posts, forums, petitions, museum pages).
const BLOCKED_HOSTS = new Set([
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'change.org',
  // User-generated discussion: anyone can post anything, so it is not evidence.
  'reddit.com', 'quora.com', 'pinterest.com', 'tumblr.com',
]);

export function isBlockedEvidence(url: string): boolean {
  const domain = domainOf(url);
  if (!domain) return true;
  if (matches(BLOCKED_HOSTS, domain)) return true;
  return /petition|museum/i.test(url);
}

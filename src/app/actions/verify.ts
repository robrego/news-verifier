'use server'

import * as cheerio from 'cheerio';
import { generate, AppError, type ErrorKind } from '@/lib/llm';
import { allowRequest, cacheGet, cacheKey, cacheSet, isPublicHttpUrl } from '@/lib/guard';
import { gatherEvidence, evidenceForPrompt, evidenceOnlyText, type Evidence } from '@/lib/search';
import { classifyDomain, domainOf, isSatireDomain } from '@/lib/sources';

// Structured result so the UI can tell a real quota problem from any other failure.
// `degraded` means the AI summary was unavailable and we returned the evidence only.
export type VerifyResult =
  | { ok: true; text: string; evidence?: Evidence; degraded?: boolean; notice?: string }
  | { ok: false; kind: ErrorKind; message: string };

const MAX_INPUT_LENGTH = 2000;

// ==========================================
// 1. TIMEOUTS & BLACKLISTS
// ==========================================
const SCRAPER_TIMEOUT_MS = 6000;

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
function isURL(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Smart URL Parser to salvage blocked scrapes
function extractHeadlineFromURL(url: string): string {
  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter(Boolean);
    let lastSegment = segments.pop() || '';
    
    // Remove file extensions (.html, .aspx)
    lastSegment = lastSegment.replace(/\.[a-z0-9]+$/i, '');
    
    // Decode special chars (%C3%AF -> ï) and replace dashes with spaces
    let text = decodeURIComponent(lastSegment).replace(/[-_]/g, ' ');
    
    // Remove leading date numbers (like 20260218)
    text = text.replace(/^\d{4,8}\s/, '').trim();
    
    return text || url;
  } catch {
    return url;
  }
}

async function fetchArticleContent(url: string): Promise<{ title: string; content: string; date: string }> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
      cache: 'no-store', // 🚨 THE FIX: Never cache the scraper
      signal: AbortSignal.timeout(SCRAPER_TIMEOUT_MS)
    });

    // We keep this generic because we just want it to fail over to the URL parser if blocked
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Title Not Found';
    
    // Detect silent firewalls that return 200 OK
    const blockedKeywords = ['just a moment', 'attention required', 'cloudflare', 'security check', 'robot or human', 'access denied'];
    if (blockedKeywords.some(kw => title.toLowerCase().includes(kw))) {
      throw new Error('Silent Firewall Block Detected');
    }

    let date = $('meta[property="article:published_time"]').attr('content') || $('time').attr('datetime') || 'Date Not Found';

    $('script, style, nav, footer, aside, .ad, .advertisement, iframe, header').remove();

    let content = '';
    const contentSelectors = ['article', '[role="article"]', '.article-content', 'main', '.content'];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().replace(/\s+/g, ' ').trim();
        if (content.length > 200) break;
      }
    }

    if (!content || content.length < 200) {
      content = $('p').map((_, el) => $(el).text()).get().join(' ').replace(/\s+/g, ' ').trim();
    }

    return { 
      title: title.trim(), 
      content: content.substring(0, 5000).trim(),
      date: date.trim()
    };
  } catch (error) {
    // This will successfully trigger our URL Parser fallback
    throw new Error(`Scraper failed`);
  }
}

// ==========================================
// 3. MAIN SERVER ACTION
// ==========================================
export async function verifyNews(rawInput: string): Promise<VerifyResult> {
  console.log('\n--- 🚀 VERIFICATION PIPELINE START ---');
  const input = (rawInput ?? '').trim();
  console.log('1. User Input:', input.slice(0, 200));

  try {
    if (!input) {
      return { ok: false, kind: 'bad_input', message: 'Paste a headline or an article link first.' };
    }
    if (input.length > MAX_INPUT_LENGTH) {
      return { ok: false, kind: 'bad_input', message: 'That input is too long. Paste a headline or a link.' };
    }
    if (!process.env.GROQ_API_KEY) {
      // Not fatal any more: we can still return evidence without the AI summary.
      console.warn('⚠️ GROQ_API_KEY is missing. Running in evidence-only mode.');
    }
    if (isURL(input) && !isPublicHttpUrl(input)) {
      return { ok: false, kind: 'bad_input', message: 'That link cannot be checked. Use a public article URL.' };
    }

    // Repeat checks are free: serve them from the cache before touching any API.
    const key = cacheKey(input);
    const cached = cacheGet(key);
    if (cached) {
      try {
        console.log('♻️ Cache hit');
        return JSON.parse(cached) as VerifyResult;
      } catch {
        // Corrupt entry: ignore it and recompute.
      }
    }

    if (!(await allowRequest('verify', 6, 60_000))) {
      return { ok: false, kind: 'rate_limit', message: 'Too many checks in a minute. Wait a moment and try again.' };
    }

    // Known satire sites need no search and no AI: answer locally, instantly and for free.
    if (isURL(input) && isSatireDomain(domainOf(input))) {
      const text = `This is a satirical article from ${domainOf(input)}, a site that publishes parody as entertainment.

Trust Score: 0

**Source Reliability & Verdict**
• ${domainOf(input)} is a known satire or parody site.
• Its stories are written to be funny, not to report real events.

**Sources Investigated**
• ${input}`;
      const domain = domainOf(input);
      const result: VerifyResult = {
        ok: true,
        text,
        evidence: {
          sources: [{ title: `Article on ${domain}`, url: input, description: '', domain, reputation: classifyDomain(domain) }],
          factChecks: [],
          provider: 'none',
        },
      };
      cacheSet(key, JSON.stringify(result));
      return result;
    }

    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let headline = input;
    let articleContent = '';
    let articleTitle = '';
    let articleDate = '';

    // STEP 1: SCRAPE (If URL)
    if (isURL(input)) {
      console.log('2. Scraper: Attempting to read URL...');
      try {
        const article = await fetchArticleContent(input);
        articleTitle = article.title;
        articleContent = article.content;
        articleDate = article.date;
        headline = articleTitle;
        console.log('✅ Scrape successful. Title:', articleTitle);
      } catch (error) {
        headline = extractHeadlineFromURL(input);
        console.log(`⚠️ Scraper blocked. Extracted fallback headline: "${headline}"`);
      }
    } else {
      console.log('2. Scraper: Input is text. Skipping.');
    }

    // STEP 2: MANDATORY LIVE SEARCH (Retrieve)
    console.log('3. Search: Fetching cross-reference data...');
    const evidence = await gatherEvidence(headline);
    console.log(`   [Evidence] ${evidence.sources.length} sources via ${evidence.provider}, ${evidence.factChecks.length} fact-checks`);
    const liveSearchContext = evidenceForPrompt(evidence);

    // STEP 3: AI GENERATION (Generate)
    console.log('4. AI: Sending consolidated data to Groq...');
    
    const promptData = articleContent
      ? `Conduct a forensic analysis of this article to determine its historical and factual accuracy.\n\nArticle Title: ${articleTitle}\nPublished Date: ${articleDate}\nArticle Content: ${articleContent}`
      : `Conduct a forensic analysis of this headline to determine its historical and factual accuracy.\n\nHeadline: "${headline}"`;

    let text: string;
    try {
    text = await generate({
      temperature: 0.1,
      maxOutputTokens: 1500,
      system: `You are an elite, ruthlessly objective forensic journalist.
      
      CRITICAL TEMPORAL ANCHOR & REALITY CHECK:
      TODAY'S DATE IS EXACTLY: ${currentDate}. 
      The year is ${new Date().getFullYear()}. Your internal knowledge is completely outdated.

      I have performed a live web search for you. You MUST base your verification on the "LIVE WEB SEARCH RESULTS" provided in the prompt. 

      STRICT RULES:
      1. ONLY cite URLs provided directly in the LIVE WEB SEARCH RESULTS. NEVER hallucinate URLs or rely on your internal training data.
      2. FORMATTING: Use extremely concise, punchy statements (MAXIMUM 15 WORDS PER BULLET). Do not write long sentences.
      3. URLS ONLY: Under "Sources Investigated", ONLY output the URLs provided in the LIVE WEB SEARCH RESULTS. If only 1 or 2 sources are provided, only list those. NEVER invent or hallucinate additional URLs.
      4. THE ESCAPE HATCH: If the live search data says "No live data found", output: "Inconclusive: Insufficient live data to verify."
      5. NEVER start your response with the word "Error".
      6. SATIRE & PARODY DETECTION: Actively evaluate the source domain and the tone of the claim. If the source is a known satirical outlet (e.g., The Onion, De Speld, Babylon Bee) or the claim is obvious parody, explicitly state "This is a satirical article" in your summary. Give it a Trust Score of 0, and use the bullet points to explain the joke rather than literally fact-checking it.
      7. Each source carries a general "Outlet reputation" label. Treat it as context only, never as proof that a claim is true or false. If "Existing professional fact-checks" are listed, weigh them heavily and name the publisher.
      
      Structure your response EXACTLY in this format:

      [Write exactly ONE short sentence summarizing your findings]

      Trust Score: [Number 0-100 only]

      **Factual Consensus**
      • [First short bullet point confirming if this event actually happened]
      • [Second short bullet point with extra context]

      **Logical Fallacies Detected**
      • [First short bullet point identifying manipulation, or "None identified"]
      • [Second short bullet point if applicable]

      **Supporting Evidence**
      • [First short bullet point with specific stats/numbers]
      • [Second short bullet point with specific stats/numbers]

      **Source Reliability & Verdict**
      • [First short bullet point on the outlet's credibility]
      • [Second short bullet point on the final verdict]

      **Sources Investigated**
      • List the actual URLs from the search results here as bullet points. Do not write placeholders or brackets. If you only have 1 or 2 URLs, just list those.`,
      prompt: `${promptData}\n\n=== LIVE WEB SEARCH RESULTS ===\n${liveSearchContext}\n===============================\n\nBased ONLY on the live web search results above, evaluate the claim.`,
    });
    } catch (aiError) {
      // The AI step failed (quota, outage, missing key). Keep the user's check useful.
      if (aiError instanceof AppError && evidence.sources.length + evidence.factChecks.length > 0) {
        const reason =
          aiError.kind === 'rate_limit'
            ? "Today's free AI quota is used up, so there is no AI summary."
            : 'The AI summary is unavailable right now.';
        console.warn('⚠️ Serving evidence-only result:', aiError.kind);
        return {
          ok: true,
          degraded: true,
          notice: 'AI summary unavailable. Showing the evidence only.',
          evidence,
          text: evidenceOnlyText(evidence, reason),
        };
      }
      throw aiError;
    }

    console.log('5. AI Generation Complete!');
    const result: VerifyResult = { ok: true, text, evidence };
    cacheSet(key, JSON.stringify(result));
    return result;

  } catch (error) {
    console.error('\n🚨 CRITICAL ERROR:', error);
    if (error instanceof AppError) {
      const message =
        error.kind === 'rate_limit'
          ? "We've used today's free AI quota. Please try again later."
          : error.kind === 'config'
            ? 'The server is missing an API key.'
            : 'The AI service had a problem. Please try again in a moment.';
      return { ok: false, kind: error.kind, message };
    }
    return { ok: false, kind: 'service', message: 'Something went wrong. Please try again.' };
  }
}
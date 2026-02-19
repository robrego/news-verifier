'use server'

import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import * as cheerio from 'cheerio';

// ==========================================
// 1. TIMEOUTS & BLACKLISTS
// ==========================================
const SCRAPER_TIMEOUT_MS = 6000;
const PING_TIMEOUT_MS = 2500;
const BLACKLISTED_DOMAINS = /change\.org|petition|museum|facebook\.com|twitter\.com|x\.com|instagram\.com/i;

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

// NEW: Smart URL Parser to salvage blocked scrapes
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

async function isLinkAlive(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD', 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      next: { revalidate: 3600 } 
    });

    if (response.status === 404 || response.status === 410) {
      console.log(`   [Link Checker] ❌ 404/410 Dead Link: ${url}`);
      return false;
    }

    return true;

  } catch {
    console.log(`   [Link Checker] ❌ Timeout/Blocked: ${url}`);
    return false;
  }
}

async function fetchArticleContent(url: string): Promise<{ title: string; content: string; date: string }> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(SCRAPER_TIMEOUT_MS)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Title Not Found';
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
    throw new Error(`Scraper failed`);
  }
}

async function fetchLiveSearchData(query: string) {
  console.log(`\n   [Brave] 🔎 Searching live web for: "${query}"`);
  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': process.env.BRAVE_API_KEY!,
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!res.ok) throw new Error('Brave API failed');

    const data = await res.json();
    const rawResults = data.web?.results || [];

    const validCandidates = rawResults.filter((r: any) => !BLACKLISTED_DOMAINS.test(r.url));
    
    const aliveChecks = await Promise.all(
      validCandidates.slice(0, 10).map(async (r: any) => {
        const isAlive = await isLinkAlive(r.url);
        return isAlive ? r : null;
      })
    );

    const verified = aliveChecks.filter(r => r !== null).slice(0, 3);
    console.log(`   [Brave] ✅ Found ${verified.length} verified, live URLs.`);
    
    let formattedData = verified.map((v, i) => `Source ${i + 1}:\nTitle: ${v.title}\nURL: ${v.url}\nSnippet: ${v.description}`).join('\n\n');
    return formattedData || "No live data found.";
  } catch (error) {
    console.error(`   [Brave] ❌ Search error:`, error);
    return "Live search failed. Unable to verify current events.";
  }
}

// ==========================================
// 3. MAIN SERVER ACTION
// ==========================================
export async function verifyNews(input: string) {
  console.log('\n--- 🚀 VERIFICATION PIPELINE START ---');
  console.log('1. User Input:', input);

  try {
    if (!process.env.GROQ_API_KEY || !process.env.BRAVE_API_KEY) return 'Error: API keys missing.';

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
        // FIX: Extract readable headline from URL instead of searching raw URL
        headline = extractHeadlineFromURL(input);
        console.log(`⚠️ Scraper blocked. Extracted fallback headline: "${headline}"`);
      }
    } else {
      console.log('2. Scraper: Input is text. Skipping.');
    }

    // STEP 2: MANDATORY LIVE SEARCH (Retrieve)
    console.log('3. Search: Fetching cross-reference data...');
    const liveSearchContext = await fetchLiveSearchData(headline);

    // STEP 3: AI GENERATION (Generate)
    console.log('4. AI: Sending consolidated data to Groq...');
    
    const promptData = articleContent
      ? `Conduct a forensic analysis of this article to determine its historical and factual accuracy.\n\nArticle Title: ${articleTitle}\nPublished Date: ${articleDate}\nArticle Content: ${articleContent}`
      : `Conduct a forensic analysis of this headline to determine its historical and factual accuracy.\n\nHeadline: "${headline}"`;

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      temperature: 0.1, 
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

    if (!text || text.trim() === '') throw new Error('Groq returned an empty response.');

    console.log('5. AI Generation Complete!');
    return text;
  
  } catch (error) {
    console.error('\n🚨 CRITICAL ERROR:', error);
    return `Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
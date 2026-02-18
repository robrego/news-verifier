'use server'

export const maxDuration = 60;

// 1. We imported Groq instead of Google!
import { groq } from '@ai-sdk/groq';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import * as cheerio from 'cheerio';

function isURL(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchArticleContent(url: string): Promise<{ title: string; content: string; date: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      'Article Title Not Found';

    let date = 
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="pubdate"]').attr('content') ||
      $('meta[name="publish-date"]').attr('content') ||
      $('time').attr('datetime') ||
      'Date Not Found';

    let content = '';
    const contentSelectors = [
      'article', '[role="article"]', '.article-content', 
      '.post-content', '.entry-content', 'main', '.content',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        element.find('script, style, nav, footer, aside, .ad, .advertisement').remove();
        content = element.text().trim();
        if (content.length > 200) break;
      }
    }

    if (!content || content.length < 200) {
      content = $('p').map((_, el) => $(el).text()).get().join(' ').trim();
    }

    if (content.length > 5000) {
      content = content.substring(0, 5000) + '...';
    }

    return { 
      title: title.trim(), 
      content: content.trim() || 'Content could not be extracted',
      date: date.trim()
    };
  } catch (error) {
    throw new Error(`Failed to fetch article: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function verifyNews(input: string) {
  console.log('\n--- 🚀 NEW VERIFICATION REQUEST ---');
  console.log('1. User Input:', input);

  try {
    // 2. We are checking for the Groq API key now
    if (!process.env.GROQ_API_KEY) {
      return 'Error: GROQ_API_KEY is not set in environment variables.';
    }
    if (!process.env.BRAVE_API_KEY) {
      return 'Error: BRAVE_API_KEY is not set in environment variables.';
    }

    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let headline = input;
    let articleContent = '';
    let articleTitle = '';
    let articleDate = '';

    if (isURL(input)) {
      console.log('2. Input is a URL. Attempting to scrape...');
      try {
        const article = await fetchArticleContent(input);
        articleTitle = article.title;
        articleContent = article.content;
        articleDate = article.date;
        headline = articleTitle;
        console.log('✅ Scrape successful. Title:', articleTitle);
      } catch (error) {
        console.error('⚠️ Scraper blocked by website:', error);
        return `Error fetching article: ${error instanceof Error ? error.message : 'Failed to fetch article content'}`;
      }
    } else {
      console.log('2. Input is raw text. Skipping scraper.');
    }

    const prompt = articleContent
      ? `Conduct a forensic analysis of this article to determine its historical and factual accuracy.
         URL: ${input}
         Title: ${articleTitle}
         Published Date: ${articleDate}
         Content: ${articleContent}

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
         • [Full Article URL 1 - MUST NOT CONTAIN SEARCH ENGINE LINKS]
         • [Full Article URL 2 - MUST NOT CONTAIN SEARCH ENGINE LINKS]
         • [Full Article URL 3 - MUST NOT CONTAIN SEARCH ENGINE LINKS]`
      : `Conduct a forensic analysis of this headline.
         Headline: "${headline}"

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
         • [Full Article URL 1 - MUST NOT CONTAIN SEARCH ENGINE LINKS]
         • [Full Article URL 2 - MUST NOT CONTAIN SEARCH ENGINE LINKS]
         • [Full Article URL 3 - MUST NOT CONTAIN SEARCH ENGINE LINKS]`;

    console.log('3. Sending prompt to Groq API...');
    const { text } = await generateText({
      // 3. Goodbye Gemini, hello Llama 3!
      model: groq('llama-3.3-70b-versatile'),
      temperature: 0.1, 
      maxSteps: 3, 
      tools: {
        braveSearch: tool({
          description: 'Search the live web for up-to-date news, facts, and articles to verify claims.',
          parameters: z.object({
            query: z.string().describe('The search query to look up facts, news, or events.'),
          }),
          // @ts-ignore
          execute: async (args: any) => {
            let searchQuery = args?.query;
            if (!searchQuery || searchQuery === 'undefined') {
              searchQuery = typeof args === 'string' ? args : headline;
            }

            console.log(`   🔎 AI activated Brave Tool. Searching for: "${searchQuery}"`);
            const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5`, {
              headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': process.env.BRAVE_API_KEY!,
              },
            });
            
            if (!res.ok) {
              console.error('   ❌ Brave API Error:', res.statusText);
              throw new Error(`Brave Search failed: ${res.statusText}`);
            }

            const data = await res.json();
            console.log(`   ✅ Brave returned ${data.web?.results?.length || 0} results.`);
            return data.web?.results?.map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.description,
              date: r.age || 'Unknown date',
            })) || [];
          },
        }) as any,
      },
      system: `You are an elite, ruthlessly objective forensic journalist. Verify claims using the braveSearch tool. 
      
      CRITICAL TEMPORAL ANCHOR & REALITY CHECK:
      TODAY'S DATE IS EXACTLY: ${currentDate}. 
      The year is ${new Date().getFullYear()}. Your internal knowledge of world leaders, elections, and geopolitical events is COMPLETELY OUTDATED. Major global shifts (including the results of the 2024 US Presidential Election) have occurred since your training cutoff. 
      If an article states a specific person is President, DO NOT reject it based on your memory. YOU MUST TRUST THE BRAVE SEARCH LIVE DATA 100%.

      STRICT RULES:
      1. MANDATORY SEARCH: You MUST use the braveSearch tool to investigate the core claims before answering. NEVER rely on your internal database.
      2. FORMATTING: Use extremely concise, punchy statements (MAXIMUM 15 WORDS PER BULLET). Do not write long sentences.
      3. URLS ONLY: Under "Sources Investigated", output EXACTLY 3 distinct, full URLs. NEVER output generic search links.
      4. TEMPORAL CONTEXT: Evaluate facts based on TODAY'S DATE. 
      5. SUSPEND DISBELIEF: Assume YOUR TRAINING DATA IS WRONG and the live web search is right.
      6. THE ESCAPE HATCH: If you cannot find independent sources, output: "Inconclusive: Insufficient live data to verify."
      7. NEVER USE THE WORD "ERROR": Under NO circumstances are you allowed to generate a response that starts with the word "Error".`,
      
      prompt: prompt,
    } as any);

    if (!text || text.trim() === '') {
      throw new Error('Groq returned an empty response.');
    }

    console.log('4. AI Generation Complete! Raw output:');
    console.log('--------------------------------------------------');
    console.log(text);
    console.log('--------------------------------------------------\n');
    return text;
  
  } catch (error) {
    console.error('\n🚨 CRITICAL CATCH BLOCK TRIGGERED:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Connection Error: ${errorMessage}`;
  }
}